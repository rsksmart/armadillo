import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
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
    private minimunOverlapCPV: number = 3;
    private mainchainService: MainchainService;

    constructor(branchService: BranchService, mainchainService: MainchainService, btcWatcher: BtcWatcher, rskApiService: RskApiService) {
        this.branchService = branchService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.mainchainService = mainchainService
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    // main function, it's called every times a BTC block arrives
    public async onNewBlock(newBtcBlock: BtcBlock) {

        if (!newBtcBlock.hasRskTag()) {
            this.logger.info('NO RSKTAG present - Skipping BTC block', Printify.getPrintifyInfo(newBtcBlock));
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        this.logger.info('RSKTAG present', Printify.getPrintifyInfo(newBtcBlock));

        let rskTag: ForkDetectionData = newBtcBlock.rskTag;
        let rskBestBlock: RskBlock = await this.rskApiService.getBestBlock();
        let rskBlockInMainchain: BranchItem = await this.mainchainService.getBestBlock();

        if (rskTag.BN > rskBestBlock.height) {
            this.logger.warn("Newtwork could be behind some blocks");
            this.logger.warn("FORK: found a block in the future");
            await this.addOrCreateBranch(null, newBtcBlock, rskBestBlock);
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }
       
        // First of all we have to check if rsktag is in armadillo mainchain or not, or if it comes repeated.
        // If tag is in mainchain, it is very probable that a miner is stuck in the same rsk block.
        if(rskBlockInMainchain != null && rskTag.BN <= rskBlockInMainchain.rskInfo.height){
            
            this.logger.warn("Mainchain: A BTC block was found with a tag pointing at a backward height to the mainchain", Printify.getPrintifyInfo(newBtcBlock));
            
            //Check if this tag is in mainchain or uncles at certain height.
            var mainchainBlockAtHeight : BranchItem = await this.mainchainService.getBlockByForkDataDetection(rskBlockInMainchain.rskInfo.forkDetectionData);
           
            if(mainchainBlockAtHeight.btcInfo == null){
                mainchainBlockAtHeight.btcInfo = newBtcBlock.btcInfo
                await this.mainchainService.updateBtcInfoBranchItem(mainchainBlockAtHeight);
            } else {
                this.logger.warn("Mainchain: New rsk tag is pointing to a existing armadillo mainchain height. A miner could be stuck");
            }

            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        let rskBlocksSameHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);
        
        if (rskBlocksSameHeight.length == 0) {
            this.logger.fatal("RSKd: The service is not working as expected, blocks at height", rskTag.BN, 'with tag in BTC', rskTag.toString(), "are not in the rskd");
            return;
        }

        let rskBLockMatchInHeight: RskBlock = this.getBlockMatchWithRskTag(rskBlocksSameHeight, rskTag);
        let rskBestBlockAtHeigth: RskBlock = this.getBestBlock(rskBlocksSameHeight);

        if (!rskBLockMatchInHeight) {
            await this.addOrCreateBranch(null, newBtcBlock, rskBlocksSameHeight[0]);
        } else {
            let ok: boolean = false;

            if (rskBLockMatchInHeight.hash != rskBestBlockAtHeigth.hash) {
                // Because rsk tag in current BTC block is pointing to an rsk uncle block, we save:
                // 1) best rsk block to keep the armadillo mainchain well form
                // 2) rsk uncle block with the BTC block information associated because RSK's tag found in BTC
                this.logger.info("Mainchain: Saving an uncle in mainchain", Printify.getPrintifyInfo(newBtcBlock));
                await this.mainchainService.save([new BranchItem(newBtcBlock.btcInfo, rskBLockMatchInHeight)]);
                ok = await this.addInMainchain(null, rskBestBlockAtHeigth);
            } else {
                this.logger.info("Mainchain: Saving a new btc block in mainchain", Printify.getPrintifyInfo(newBtcBlock));
                ok = await this.addInMainchain(newBtcBlock, rskBestBlockAtHeigth);
            }

            if (!ok) {
                return;
            }
        }

        return await this.blockSuccessfullyProcessed(newBtcBlock);
    }

    private async blockSuccessfullyProcessed(newBtcBlock: BtcBlock) : Promise<void> {
        return this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
    }

    // The idea of this method is build an armadillo mainchain, similar rsk mainchain adding btc information if applicable.
    public async addInMainchain(newBtcBlock: BtcBlock, rskBlockInMainchain: RskBlock): Promise<boolean> {
       
        let bestBlockInMainchain: BranchItem = await this.mainchainService.getBestBlock();
        //newBtcBlock could be null if tag found is in an uncle.
        const btcInfo = newBtcBlock != null ? newBtcBlock.btcInfo : null;

        // There is no Armadillo Mainnet yet, let's create it!.
        if (bestBlockInMainchain == null) {
            let newMainnet: BranchItem = new BranchItem(btcInfo, rskBlockInMainchain);
            await this.mainchainService.save([newMainnet]);
            this.logger.info("Armadillo Mainchain: Created the first item in mainchain");
            return true;
        }

        // Rebuilding the chain between last tag find up to the new tag height, to have the complete mainchain
        let prevRskHashToMatch: string = bestBlockInMainchain.rskInfo.hash;
        let itemsToSaveInMainchain: BranchItem[] = [];
        let searchFromHeight = bestBlockInMainchain.rskInfo.height + 1;
        let searchToHeight = rskBlockInMainchain.height;

        if (searchFromHeight != searchToHeight) {

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
        }

        if (bestBlockInMainchain.rskInfo.height != rskBlockInMainchain.height && prevRskHashToMatch != rskBlockInMainchain.prevHash) {
            this.logger.fatal("Mainchain: building mainchain can not connect the end of the chain. Last block in mainchain with hash:", bestBlockInMainchain.rskInfo.hash, " should connect with prevHash:", prevRskHashToMatch)
            return;
        }

        itemsToSaveInMainchain.push(new BranchItem(btcInfo, rskBlockInMainchain));
        this.logger.info("Mainchain: Saving new items in mainchain with rsk heights:", itemsToSaveInMainchain.map(x => x.rskInfo.height))
        await this.mainchainService.save(itemsToSaveInMainchain);

        return true;
    }

    public stop() {
        this.logger.info('Stopping fork detector')
        this.btcWatcher.stop();
    }

    public start() {
        this.logger.info('Starting fork detector');
        this.btcWatcher.start();
    }

    public getBlockMatchWithRskTag(blocks: RskBlock[], rskTag: ForkDetectionData): RskBlock {
        return blocks.find(b => b.forkDetectionData.equals(rskTag));
    }

    public getBestBlock(blocks: RskBlock[]): RskBlock {
        return blocks.find(b => b.mainchain);
    }

    public async getBranchesThatOverlap(rskTag: ForkDetectionData): Promise<Branch[]> {
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

    private async addOrCreateBranch(rskBlock: RskBlock, btcBlock: BtcBlock, rskBlocksSameHeight: RskBlock) {
        var itemsBranch: BranchItem[];

        if (!rskBlock) {
            rskBlock = new RskBlock(btcBlock.rskTag.BN, "", "", false, btcBlock.rskTag);
        }

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
        if(branches.length > 0 && this.tagIsInBranch(branches, item)){
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
}
