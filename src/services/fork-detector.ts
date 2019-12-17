import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Branch, BranchItem, RangeForkInMainchain as RangeForkInMainchain } from "../common/branch";
import { BtcWatcher, BTCEvents } from "./btc-watcher";
import { getLogger, Logger } from "log4js";
import { MainchainService } from "./mainchain-service";
import { BranchService } from "./branch-service";
import { RskApiService } from "./rsk-api-service";

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
        if (newBtcBlock.rskTag == null) {
            this.logger.info('NO RSKTAG present - Skipping BTC block with hash:', newBtcBlock.btcInfo.hash, 'and height:', newBtcBlock.btcInfo.height);
            await this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
            return;
        } else {
            this.logger.info('RSKTAG present - BTC hash:', newBtcBlock.btcInfo.hash, 'and height:', newBtcBlock.btcInfo.height);
        }

        let rskTag: ForkDetectionData = newBtcBlock.rskTag;
        let rskBestBlock: RskBlock = await this.rskApiService.getBestBlock();

        if (rskTag.BN > rskBestBlock.height) {
            this.logger.warn("Newtwork could be behind some blocks");
            this.logger.warn("FORK: found a block in the future");
            await this.addOrCreateBranch(null, newBtcBlock, rskBestBlock);
            await this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
            return;
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

            // Because rsk tag in current BTC block is pointing to an rsk uncle block, we save:
            // 1) best rsk block to keep the armadillo mainchain well form


            // 2) rsk uncle block with the BTC block information associated because RSK's tag found in BTC
            if (rskBLockMatchInHeight.hash != rskBestBlockAtHeigth.hash) {
                //save uncle to have information of where rsk tag in btc is pointing
                this.logger.info("Mainchain: Saving an uncle in mainchain with rsk tag btc height:", newBtcBlock.btcInfo.height, "rsk height:", rskBLockMatchInHeight.height);
                await this.mainchainService.save([new BranchItem(newBtcBlock.btcInfo, rskBLockMatchInHeight)]);
                ok = await this.addInMainchain(null, rskBestBlockAtHeigth);
            } else {
                ok = await this.addInMainchain(newBtcBlock, rskBestBlockAtHeigth);
            }

            if (!ok) {
                return;
            }

            this.logger.info('RSKTAG', newBtcBlock.rskTag.toString(), 'found in block', newBtcBlock.btcInfo.hash, 'found in RSK blocks at height', newBtcBlock.rskTag.BN);
        }

        await this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
    }

    public async addInMainchain(newBtcBlock: BtcBlock, rskBlockInMainchain: RskBlock): Promise<boolean> {
        const btcInfo = newBtcBlock != null ? newBtcBlock.btcInfo : null;

        let bestBlockInMainchain: BranchItem = await this.mainchainService.getBestBlock();

        // There is no Armadillo Mainnet yet, let's create it!.
        if (bestBlockInMainchain == null) {
            let newMainnet: BranchItem = new BranchItem(btcInfo, rskBlockInMainchain);
            await this.mainchainService.save([newMainnet]);
            this.logger.info("Mainchain: Created the first item in mainchain");
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
            //process.exit(); // Should we finish the process ?
            return false;
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

    private getBlockThatMatch(blocks: RskBlock[], rskHash: string): RskBlock {
        for (let j = 0; j < blocks.length; j++) {
            let rskBlock: RskBlock = blocks[j];
            if (rskBlock.prevHash == rskHash) {
                //here we also can check that cpv overlap no less than 6 bytes (IMPORTANT)
                return rskBlock;
            }
        }

        return null;
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
        if (branches.length > 0) {

            // For now, we get the first branch, there is a minimun change to get 2 items that match,  but what happens if we find more ?
            if (branches.length > 1) {
                this.logger.warn("FORK: More branches that we expect, found:", branches.length, "branches", "with CPV:", rskBlock.forkDetectionData.CPV);
            }

            const existingBranch: Branch = branches[0];

            this.logger.warn('FORK: RSKTAG', rskBlock.forkDetectionData.toString(), 'was found in BTC block with hash:', btcBlock.btcInfo.hash,
                'this new item was added in a existing branch');

            // TODO: We have to check last height branch item before connect new item branch
            // Otherwise we could be adding heights already added

            await this.branchService.addBranchItem(existingBranch.getFirstDetected().rskInfo.forkDetectionData.prefixHash, item);
        } else {
            let mainchainRangeForkCouldHaveStarted = await this.rskApiService.getRskBlockAtCertainHeight(rskBlock, rskBlocksSameHeight);

            this.logger.warn('FORK: Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash);

            await this.branchService.save(new Branch(mainchainRangeForkCouldHaveStarted, itemsBranch));
        }
    }
}
