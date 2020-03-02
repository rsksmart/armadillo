import { RskBlock } from "../common/rsk-block";
import { BtcBlock } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Branch, BranchItem, Item } from "../common/branch";
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
    //This is the 
    private blockForkWhenArmadilloStated: number = 1591000;

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

    // Main function, it's called every times a BTC block arrives
    public async onNewBlock(newBtcBlock: BtcBlock) {
        this.logger.info("<< -------------- NEW BTC BLOCK ------------------ >>");

        if (!newBtcBlock.hasRskTag()) {
            this.logger.info('NO RSKTAG present - Skipping BTC block', Printify.getPrintifyInfo(newBtcBlock));
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        this.logger.info('RSKTAG present', Printify.getPrintifyInfo(newBtcBlock));

        //TODO Check if tag has rsk height pointing to a heihgt that Armadillo mainchain can manage 
        // if (newBtcBlock.rskTag.BN < this.blockForkWhenArmadilloStated) {
        //     this.logger.info("BTC block has a tag with invalid height");
        //     return await this.blockSuccessfullyProcessed(newBtcBlock);
        // }

        //TODO Check if tag has rsk height pointing to a heihgt that Armadillo mainchain started
        // if () {
        //     this.logger.info("BTC block has a tag pointing to a rsk height that is not contenplaiting in armadillo mainchain");
        //     return await this.blockSuccessfullyProcessed(newBtcBlock);
        // }

        let rskBlocksAtNewRskTagHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(newBtcBlock.rskTag.BN);
        let rskBlockMatchInHeight: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, newBtcBlock.rskTag);

        if (rskBlockMatchInHeight) {
            // New tag is in mainchain
            let ok = await this.tryToAddInMainchain(newBtcBlock, rskBlocksAtNewRskTagHeight);

            if (!ok) {
                return;
            }
        } else {
            
            await this.addOrCreateBranch(newBtcBlock);
        }

        return await this.blockSuccessfullyProcessed(newBtcBlock);
    }

    // The idea of this method is build an armadillo mainchain (like rsk mainchain) adding btc information if applicable.
    private async tryToAddInMainchain(newBtcBlock: BtcBlock, rskBlocksAtRskTagHeight: RskBlock[]): Promise<boolean> {
        this.logger.info("Mainchain: Saving a new btc block in mainchain", Printify.getPrintifyInfo(newBtcBlock));

        let rskBestBlockInMainchain: Item = await this.mainchainService.getBestBlock();
        let rskBlockInMainchain: RskBlock = this.getBestBlock(rskBlocksAtRskTagHeight);

        // There is no Armadillo Mainnet yet, let's create it!.
        if (!rskBestBlockInMainchain) {
            //TODO: there is a bug here. At this point we don't know if this tag is pointing to a uncle or a mainchain block
            let newItemInMainnet: Item = new Item(newBtcBlock.btcInfo, rskBlockInMainchain);
            await this.mainchainService.save([newItemInMainnet]);
            this.logger.info("Armadillo Mainchain: Created the first item in mainchain");
            return true;
        }

        // Verify armadillo top of Mainchain is still being the best block, just to be sure there was't any reorganization.
        // In case there are update armadillo mainchain:
        if (!await this.blockStillBeingMainchain(rskBestBlockInMainchain.rskInfo)) {
            this.logger.info("There was a reorganization for rsk block", Printify.getPrintifyInfoBranchItem(rskBestBlockInMainchain))
            await this.rebuildMainchainFromBlock(rskBestBlockInMainchain);

            // There was a reorganization, mainchain has changed!
            rskBestBlockInMainchain = await this.mainchainService.getBestBlock();
        }

        // First of all, we have to check if rsktag is in armadillo mainchain or not, and if it comes repeated.
        // If tag is in mainchain, it is very probable that a miner is stuck in the same rsk block.
        if (this.tagIsPointingToABackwardHeight(newBtcBlock, rskBestBlockInMainchain)) {
            this.logger.info("Mainchain: A BTC block was found with a tag pointing at a backward height to the mainchain", Printify.getPrintifyInfo(newBtcBlock));

            // Check if this tag is in mainchain or uncle at certain height.
            var blockThatMatchInMainnet: Item = await this.mainchainService.getBlockByForkDataDetection(newBtcBlock.rskTag);
           
            if (blockThatMatchInMainnet) {
                this.logger.info("Mainchain: rsk tag is pointing to an existing armadillo mainchain height. A miner could be stuck");

                if (!blockThatMatchInMainnet.btcInfo) {
                    blockThatMatchInMainnet.btcInfo = newBtcBlock.btcInfo
                    await this.mainchainService.updateBtcInfoItem(blockThatMatchInMainnet);
                } else {
                    this.logger.info("Mainchain: rsk tag is pointing to an existing armadillo mainchain height. BTC data is already at that height");
                }
            } else {
                this.logger.info("Mainchain: New rsk tag is pointing to an old armadillo mainchain height, and is a uncle");

                // New btc block could be an uncle
                var blockThatMatch: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtRskTagHeight, newBtcBlock.rskTag);

                var item: Item = new Item(newBtcBlock.btcInfo, blockThatMatch);
                await this.mainchainService.save([item]);
            }

            return true;
        }

        // Rebuilding the chain between last tag find up to the new tag height, to have the complete mainchain
        let prevRskHashToMatch: string = rskBestBlockInMainchain.rskInfo.hash;
        let itemsToSaveInMainchain: BranchItem[] = [];
        let searchFromHeight = rskBestBlockInMainchain.rskInfo.height + 1;
        let searchToHeight = rskBlockInMainchain.height;

        this.logger.info("Getting all RSK blocks from height", searchFromHeight, "to height", searchToHeight)

        for (let i = searchFromHeight; i < searchToHeight; i++) {
            let block: RskBlock = await this.rskApiService.getBlock(i);
            if (block.prevHash != prevRskHashToMatch) {
                this.logger.fatal("Mainchain: building mainchain can not find a block in RSK at height:", i, "with prev hash:", prevRskHashToMatch)
                return false;
            } else {
                this.logger.info("Mainchain: adding RSK block into mainchain at height:", i, "with hash:", block.hash, "prevHash:", block.prevHash)
            }

            prevRskHashToMatch = block.hash;
            itemsToSaveInMainchain.push(new BranchItem(null, block, 0));
        }

        let rskBlockMatchInHeight: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtRskTagHeight, newBtcBlock.rskTag);

        if (rskBlockMatchInHeight.hash != rskBlockInMainchain.hash) {
            // Because rsk tag in current BTC block is pointing to an rsk uncle block, we save:
            // 1) best rsk block to keep the armadillo mainchain well formed.
            // 2) rsk uncle block which is being targeted by the new BTC block.
            this.logger.info("Mainchain: Saving an uncle in armadillo mainchain", Printify.getPrintifyInfo(newBtcBlock));
            itemsToSaveInMainchain.push(new BranchItem(null, rskBlockInMainchain, 0));
            itemsToSaveInMainchain.push(new BranchItem(newBtcBlock.btcInfo, rskBlockMatchInHeight, 0));
        } else {
            // Rsktag is in mainchain
            itemsToSaveInMainchain.push(new BranchItem(newBtcBlock.btcInfo, rskBlockInMainchain, 0));
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
        return branches[0].getForkItems().some(x => x.rskInfo.forkDetectionData.equals(item.rskInfo.forkDetectionData));
    }

    private newItemCanBeAddedInBranch(branches: Branch[], item: BranchItem) {
        return branches[0].getLastDetected().rskInfo.height < item.rskInfo.height;
    }

    private async addOrCreateBranch(btcBlock: BtcBlock) {
        let rskBestBlock: RskBlock = await this.rskApiService.getBestBlock();
        let rskBlocksSameHeight;

        //Rsktag is comming pointing in a future rsk height, for armadillo monitor this is a fork
        //TODO: check when a future case is a posible case or a miner is messing up.
        if (btcBlock.rskTag.BN > rskBestBlock.height) {
            this.logger.info("Newtwork could be behind some blocks");
            this.logger.info("FORK: found a block in the future");
            rskBlocksSameHeight = rskBestBlock;
        } else {
            rskBlocksSameHeight = this.rskApiService.getBlock(btcBlock.rskTag.BN);

            //We shouldn't remove this if, should not come a null checking this heigh
            if(!rskBlocksSameHeight){
                return await this.btcWatcher.blockProcessingFailed(btcBlock);
            }
        }

        var rskBlock = RskBlock.fromForkDetectionData(btcBlock.rskTag);
        //Possible mainchain block from where it started to fork
        let item: BranchItem = new BranchItem(btcBlock.btcInfo, rskBlock, rskBestBlock.height);

        let branches: Branch[] = await this.getBranchesThatOverlap(rskBlock.forkDetectionData);

        if (branches.length > 1) {
            this.logger.info("FORK: More branches that we expect, found:", branches.length, "branches", "with CPV:", rskBlock.forkDetectionData.CPV);
        }

        //If rskTag is repeted
        if (branches.length > 0 && this.tagIsInBranch(branches, item)) {
            this.logger.info("FORK: Tag repeated")
            return;
        }

        // TODO: For now, we get the first branch, there is a minimun change to get more than 1 item that match, but what happens if we find more?
        if (branches.length > 0 && this.newItemCanBeAddedInBranch(branches, item)) {

            this.logger.info('FORK: RSKTAG', rskBlock.forkDetectionData.toString(), 'was found in BTC block with hash:', btcBlock.btcInfo.hash,
                'this new item was added in a existing branch');

            await this.branchService.addBranchItem(branches[0].getFirstDetected().rskInfo.forkDetectionData.prefixHash, item);
        } else {
            let mainchainRangeForkCouldHaveStarted = await this.rskApiService.getRangeForkWhenItCouldHaveStarted(rskBlock, rskBlocksSameHeight);

            this.logger.info('FORK: Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash);

            await this.branchService.save(new Branch(mainchainRangeForkCouldHaveStarted, [item]));
        }
    }

    private async blockSuccessfullyProcessed(newBtcBlock: BtcBlock): Promise<void> {
        return this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
    }

    private async blockStillBeingMainchain(rskBlock: RskBlock) {
        var bestblockAtHeight: RskBlock = await this.rskApiService.getBlock(rskBlock.height);
        return bestblockAtHeight.hash == rskBlock.hash;
    }

    private tagIsPointingToABackwardHeight(newBtcBlock: BtcBlock, rskBestBlockInMainchain: Item) {
        return newBtcBlock.rskTag.BN <= rskBestBlockInMainchain.rskInfo.height;
    }

    // This function should be use if there are a reorganization. The intention of if is to rebuild 
    // the armadillo mainchain with the correct blocks. 
    public async rebuildMainchainFromBlock(itemIsNotMoreInMainchain: Item) {
        let rskBlocksAtNewRskTagHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(itemIsNotMoreInMainchain.rskInfo.forkDetectionData.BN);
        let itemShouldBeAnUncleAtLeast: RskBlock = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, itemIsNotMoreInMainchain.rskInfo.forkDetectionData);

        if (itemShouldBeAnUncleAtLeast == null) {
            this.logger.info("Mainchain Reorganization: mainchain with a btc tag previously found was discarted because it doesn't belong any more to the mainchain", Printify.getPrintifyInfoBranchItem(itemIsNotMoreInMainchain))
        } else {
            // Up to here we know that the old tag is not longer in mainchain, but is an uncle.
            // let add it as an uncle in this height
            var newItem = new Item(null, itemShouldBeAnUncleAtLeast);
            this.logger.info("Mainchian Reorganization: Saving best block as an uncle", Printify.getPrintifyInfoBranchItem(newItem));
            itemIsNotMoreInMainchain.rskInfo.mainchain = false;
            await this.mainchainService.save([newItem]);
        }

        var bestblockAtHeight: RskBlock = await this.rskApiService.getBlock(itemIsNotMoreInMainchain.rskInfo.height);
        var branchItemToReplace = new BranchItem(null, bestblockAtHeight, 0);
        this.logger.info("Mainchian Reorganization: Removing block that was best block", Printify.getPrintifyInfoBranchItem(itemIsNotMoreInMainchain), "for new block", Printify.getPrintifyInfoBranchItem(branchItemToReplace))

        await this.mainchainService.changeBlockInMainchain(itemIsNotMoreInMainchain.rskInfo.height, branchItemToReplace);

        //Now let's check if the reorganization took more blocks backwards.
        var prevBLockInMainchain = await this.mainchainService.getBlock(itemIsNotMoreInMainchain.rskInfo.height - 1)

        if (prevBLockInMainchain && !await this.blockStillBeingMainchain(prevBLockInMainchain.rskInfo)) {
            await this.rebuildMainchainFromBlock(prevBLockInMainchain);
        }
    }
}
