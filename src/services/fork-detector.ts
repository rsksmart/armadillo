import { RskBlock } from "../common/rsk-block";
import { BtcBlock } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Branch, BranchItem } from "../common/branch";
import { BtcWatcher, BTCEvents } from "./btc-watcher";
import { getLogger, Logger } from "log4js";
import { MainchainService } from "./mainchain-service";
import { BranchService } from "./branch-service";
import { RskApiService } from "./rsk-api-service";
import { Printify } from "../util/printify";

export class ForkDetector {
    private logger: Logger;
    private branchService: BranchService;
    private rskApiService: RskApiService;
    private btcWatcher: BtcWatcher;
    private maxBlocksBackwardsToSearch: number = 448;
    private mainchainService: MainchainService;

    //TODO: move this into config file
    private minimunOverlapCPV: number = 3;

    constructor(branchService: BranchService, mainchainService: MainchainService, btcWatcher: BtcWatcher, rskApiService: RskApiService) {
        this.branchService = branchService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.mainchainService = mainchainService
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    public stop() {
        this.logger.info('Stopping fork detector')
        this.btcWatcher.stop();
    }

    public start() {
        this.logger.info('Starting fork detector');
        this.btcWatcher.start();
    }

    // main function, it's called every times a BTC block arrives
    public async onNewBlock(newBtcBlock: BtcBlock) {
        this.logger.info("<< ----- NEW BTC BLOCK ------ >>");

        if (!newBtcBlock.hasRskTag()) {
            this.logger.info('NO RSKTAG present - Skipping BTC block', Printify.getPrintifyInfo(newBtcBlock));
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        this.logger.info('RSKTAG present', Printify.getPrintifyInfo(newBtcBlock));

        let rskTag: ForkDetectionData = newBtcBlock.rskTag;
        let rskBestBlock: RskBlock = await this.rskApiService.getBestBlock();
        let rskBlockInMainchain: BranchItem = await this.mainchainService.getBestBlock();

        //Rsktag is comming pointing in a future rsk height, for armadillo monitor this is a fork
        if (rskTag.BN > rskBestBlock.height) {
            this.logger.warn("Newtwork could be behind some blocks");
            this.logger.warn("FORK: found a block in the future");
            await this.addOrCreateBranch(newBtcBlock, rskBestBlock);
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        // First of all we have to check if rsktag is in armadillo mainchain or not, or if it comes repeated.
        // If tag is in mainchain, it is very probable that a miner is stuck in the same rsk block.
        if (rskBlockInMainchain != null && rskTag.BN <= rskBlockInMainchain.rskInfo.height) {

            this.logger.warn("Mainchain: A BTC block was found with a tag pointing at a backward height to the mainchain", Printify.getPrintifyInfo(newBtcBlock));

            //Check if this tag is in mainchain or uncles at certain height.
            var mainchainBlockAtHeight: BranchItem = await this.mainchainService.getBlockByForkDataDetection(rskBlockInMainchain.rskInfo.forkDetectionData);

            if (mainchainBlockAtHeight.btcInfo == null) {
                mainchainBlockAtHeight.btcInfo = newBtcBlock.btcInfo
                await this.mainchainService.updateBtcInfoBranchItem(mainchainBlockAtHeight);
            } else {
                this.logger.warn("Mainchain: New rsk tag is pointing to a existing armadillo mainchain height. A miner could be stuck");
            }

            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        let rskBlocksAtNewRskTagHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);
        let rskBlockMatchInHeight: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, rskTag);

        if (!rskBlockMatchInHeight) {
            await this.addOrCreateBranch(newBtcBlock, rskBlocksAtNewRskTagHeight[0]);
        } else {
            this.logger.info("Mainchain: Saving a new btc block in mainchain", Printify.getPrintifyInfo(newBtcBlock));
            let ok = await this.addInMainchain(newBtcBlock, rskBlocksAtNewRskTagHeight);

            if (!ok) {
                return;
            }
        }

        return await this.blockSuccessfullyProcessed(newBtcBlock);
    }

    // The idea of this method is build an armadillo mainchain (like rsk mainchain) adding btc information if applicable.
    private async addInMainchain(newBtcBlock: BtcBlock, rskBlocksAtNewRskTagHeight: RskBlock[]): Promise<boolean> {
        let rskBlockInMainchain: RskBlock = this.getBestBlock(rskBlocksAtNewRskTagHeight);
        let rskBlockMatchInHeight: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, newBtcBlock.rskTag);

        let bestBlockInMainchain: BranchItem = await this.mainchainService.getBestBlock();
        // There is no Armadillo Mainnet yet, let's create it!.
        if (bestBlockInMainchain == null) {
            let newMainnet: BranchItem = new BranchItem(newBtcBlock.btcInfo, rskBlockInMainchain);
            await this.mainchainService.save([newMainnet]);
            this.logger.info("Armadillo Mainchain: Created the first item in mainchain");
            return true;
        }

        // Verify armadillo top of Mainchain is still being the best block, just to be sure there was't any reorganization.
        // In case there are update armadillo mainchain:
        if (!await this.blockStillBeingMainchain(bestBlockInMainchain.rskInfo)) {
            this.logger.warn("There was a reorganization for rsk block", Printify.getPrintifyInfoBranchItem(bestBlockInMainchain))
            await this.rebuildMainchainFromBlock(bestBlockInMainchain);
        }

        // Rebuilding the chain between last tag find up to the new tag height, to have the complete mainchain
        let prevRskHashToMatch: string = bestBlockInMainchain.rskInfo.hash;
        let itemsToSaveInMainchain: BranchItem[] = [];
        let searchFromHeight = bestBlockInMainchain.rskInfo.height + 1;
        let searchToHeight = rskBlockInMainchain.height;

        this.logger.info("Getting all RSK blocks from height", searchFromHeight, "to height", searchToHeight)

        for (let i = searchFromHeight; i < searchToHeight; i++) {
            let block: RskBlock = await this.rskApiService.getBlock(i);
            if (block.prevHash != prevRskHashToMatch) {
                this.logger.fatal("Mainchain: building mainchain can not find a block in RSK at height:", i, "with prev hash:", prevRskHashToMatch)
                return false;
            } else {
                this.logger.info("Mainchain: adding RSK block into mainchain at height:", i, "with hash:", prevRskHashToMatch, "prevHash:", prevRskHashToMatch)
            }

            prevRskHashToMatch = block.hash;
            itemsToSaveInMainchain.push(new BranchItem(null, block));
        }

        if (bestBlockInMainchain.rskInfo.height != rskBlockInMainchain.height && prevRskHashToMatch != rskBlockInMainchain.prevHash) {
            this.logger.fatal("Mainchain: building mainchain can not connect the end of the chain. Last block in mainchain with hash:", bestBlockInMainchain.rskInfo.hash, " should connect with prevHash:", prevRskHashToMatch)
            return;
        }

        if (rskBlockMatchInHeight.hash != rskBlockInMainchain.hash) {
            // Because rsk tag in current BTC block is pointing to an rsk uncle block, we save:
            // 1) best rsk block to keep the armadillo mainchain well formed.
            // 2) rsk uncle block which is being targeted by the new BTC block.
            this.logger.info("Mainchain: Saving an uncle in armadillo mainchain", Printify.getPrintifyInfo(newBtcBlock));
            itemsToSaveInMainchain.push(new BranchItem(null, rskBlockInMainchain));
            itemsToSaveInMainchain.push(new BranchItem(newBtcBlock.btcInfo, rskBlockMatchInHeight));
        } else {
            // Rsktag is in mainchain
            itemsToSaveInMainchain.push(new BranchItem(newBtcBlock.btcInfo, rskBlockInMainchain));
        }

        this.logger.info("Mainchain: Saving new items in mainchain with rsk heights:", itemsToSaveInMainchain.map(x => x.rskInfo.height.toString()));
        await this.mainchainService.save(itemsToSaveInMainchain);

        return true;
    }

    private getBlockMatchWithRskTag(blocks: RskBlock[], rskTag: ForkDetectionData): RskBlock {
        return blocks.find(b => b.forkDetectionData.equals(rskTag));
    }

    private getBestBlock(blocks: RskBlock[]): RskBlock {
        return blocks.find(b => b.mainchain);
    }

    private async getBranchesThatOverlap(rskTag: ForkDetectionData): Promise<Branch[]> {
        let branchesThatOverlap: Branch[] = []
        let lastTopsDetected: Branch[] = await this.getPossibleForks(rskTag.BN);

        for (const branch of lastTopsDetected) {
            if (branch.getLastDetected().rskInfo.forkDetectionData.overlapCPV(rskTag.CPV, this.minimunOverlapCPV)) {
                branchesThatOverlap.push(branch);
            }
        }

        return branchesThatOverlap;
    }

    private getHeightforPossibleBranches(numberBlock: number): number {
        if (numberBlock > this.maxBlocksBackwardsToSearch) {
            return numberBlock - this.maxBlocksBackwardsToSearch;
        } else {
            return 0;
        }
    }

    private async getPossibleForks(blockNumber: number): Promise<Branch[]> {
        //No necesitamos los branches si no los ultimos "nodos" que se agregaron de cada branch
        let minimunHeightToSearch = this.getHeightforPossibleBranches(blockNumber);

        //connect to the database to get possible branches forks , 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        return this.branchService.getForksDetected(minimunHeightToSearch);
    }

    private tagIsInBranch(branches: Branch[], item: BranchItem): boolean {
        return branches[0].getForkItems().some(x => x.rskInfo.forkDetectionData == item.rskInfo.forkDetectionData);
    }

    private newItemCanBeAddedInBranch(branches: Branch[], item: BranchItem) {
        return branches[0].getLastDetected().rskInfo.height < item.rskInfo.height;
    }

    private async addOrCreateBranch(btcBlock: BtcBlock, rskBlocksSameHeight: RskBlock) {
        var itemsBranch: BranchItem[];
        var rskBlock = new RskBlock(btcBlock.rskTag.BN, "", "", false, btcBlock.rskTag);

        //Possible mainchain block from where it started to fork
        let item: BranchItem = new BranchItem(btcBlock.btcInfo, rskBlock);
        itemsBranch = [item];

        if (btcBlock.rskTag.BN > rskBlocksSameHeight.height) {
            itemsBranch.unshift(new BranchItem(null, rskBlocksSameHeight));
        }

        let branches: Branch[] = await this.getBranchesThatOverlap(rskBlock.forkDetectionData);

        if (branches.length > 1) {
            this.logger.warn("FORK: More branches that we expect, found:", branches.length, "branches", "with CPV:", rskBlock.forkDetectionData.CPV);
        }

        //If rskTag is repeted
        if (branches.length > 0 && this.tagIsInBranch(branches, item)) {
            this.logger.warn("FORK: Tag repeated")
            return;
        }

        // TODO: For now, we get the first branch, there is a minimun change to get more than 1 item that match, but what happens if we find more?
        if (branches.length > 0 && this.newItemCanBeAddedInBranch(branches, item)) {

            this.logger.warn('FORK: RSKTAG', rskBlock.forkDetectionData.toString(), 'was found in BTC block with hash:', btcBlock.btcInfo.hash,
                'this new item was added in a existing branch');

            await this.branchService.addBranchItem(branches[0].getFirstDetected().rskInfo.forkDetectionData.prefixHash, item);

        } else {
            let mainchainRangeForkCouldHaveStarted = await this.rskApiService.getRskBlockAtCertainHeight(rskBlock, rskBlocksSameHeight);

            this.logger.warn('FORK: Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash);

            await this.branchService.save(new Branch(mainchainRangeForkCouldHaveStarted, itemsBranch));
        }
    }

    private async blockSuccessfullyProcessed(newBtcBlock: BtcBlock): Promise<void> {
        return this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
    }

    private async blockStillBeingMainchain(rskBlock: RskBlock) {
        var bestblockAtHeight: RskBlock = await this.rskApiService.getBlock(rskBlock.height);
        return bestblockAtHeight.hash == rskBlock.hash;
    }

    // This function should be use if there are a reorganization. The intention of if is to rebuild 
    // the armadillo mainchain with the correct blocks. 
    public async rebuildMainchainFromBlock(itemIsNotMoreInMainchain: BranchItem) {
        let rskBlocksAtNewRskTagHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(itemIsNotMoreInMainchain.rskInfo.forkDetectionData.BN);
        let itemShouldBeAnUncleAtLeast: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, itemIsNotMoreInMainchain.rskInfo.forkDetectionData);

        if (itemShouldBeAnUncleAtLeast == null) {
            this.logger.warn("Mainchain Reorganization: mainchain with a btc tag previously found was discarted because it doesn't belong any more to the mainchain", Printify.getPrintifyInfoBranchItem(itemIsNotMoreInMainchain))
        } else {
            // Up to here we know that the old tag is not longer in mainchain, but is an uncle.
            // let add it as an uncle in this height
            var newBranchItem = new BranchItem(null, itemShouldBeAnUncleAtLeast);
            this.logger.info("Mainchian Reorganization: Saving best block as an uncle", Printify.getPrintifyInfoBranchItem(newBranchItem));
            itemIsNotMoreInMainchain.rskInfo.mainchain = false;
            await this.mainchainService.save([newBranchItem]);
        }
        
        var bestblockAtHeight: RskBlock = await this.rskApiService.getBlock(itemIsNotMoreInMainchain.rskInfo.height);
        var branchItemToReplace = new BranchItem(null, bestblockAtHeight);
        this.logger.info("Mainchian Reorganization: Removing block that was best block", Printify.getPrintifyInfoBranchItem(itemIsNotMoreInMainchain), "for new block", Printify.getPrintifyInfoBranchItem(branchItemToReplace))

        await this.mainchainService.changeBlockInMainchain(itemIsNotMoreInMainchain.rskInfo.height, branchItemToReplace);

        //Now let's check if the reorganization took more blocks backwards.
        var prevBLockInMainchain = await this.mainchainService.getBlock(itemIsNotMoreInMainchain.rskInfo.height - 1)
       
        if (!await this.blockStillBeingMainchain(prevBLockInMainchain.rskInfo)) {
            await this.rebuildMainchainFromBlock(prevBLockInMainchain);
        }
    }
}
