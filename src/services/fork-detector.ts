import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Branch, BranchItem } from "../common/branch";
import { BtcWatcher, BTCEvents } from "./btc-watcher";
import { RskApi } from "./rsk-api-service";
import { getLogger, Logger } from "log4js";
import { MainchainService } from "./mainchain-service";
import { BranchService } from "./branch-service";

export class ForkDetector {

    private logger: Logger;
    private branchService: BranchService;
    private rskApiService: RskApi;
    private btcWatcher: BtcWatcher;
    private lastBlockChecked: BtcBlock;
    private maxBlocksBackwardsToSearch: number = 448;
    private minimunOverlapCPV: number = 3;
    private mainchainService: MainchainService;

    constructor(branchService: BranchService, mainchainService: MainchainService, btcWatcher: BtcWatcher, rskApiService: RskApi) {
        this.branchService = branchService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.mainchainService = mainchainService
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    public async onNewBlock(newBlock: BtcBlock) {

        if (this.lastBlockChecked && newBlock.btcInfo.height <= this.lastBlockChecked.btcInfo.height) {
            //Nothing to do, already check previous BTC blocks
            // Is sure that we have to check if is same height or may happened a reorg 
            // in btc that is pushing the same btc block height with different hash and we are missing the mainchain.
            this.logger.warn("Some BTC block recieved hash:", newBlock.btcInfo.hash, "height:", newBlock.btcInfo.height);
            return;
        }

        if (!this.lastBlockChecked || this.lastBlockChecked.btcInfo.hash != newBlock.btcInfo.hash) {

            this.lastBlockChecked = newBlock;

            if (newBlock.rskTag == null) {
                this.logger.info('Skipping block', newBlock.btcInfo.hash, '. No RSKTAG present')
                return;
            }

            let rskTag: ForkDetectionData = newBlock.rskTag;
            
            let blocks: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);
            if (blocks.length == 0) {
                //What should we do here? 
                //if blocks are empty, could means that there are not height at that BN.
                //maybe we have to check best block and compare the height to be sure if tag is well form
                //Maybe the selfiish chain height is bigger than the main chain
                this.logger.warn('Blocks are not in rsk at height', rskTag.BN, 'with tag in BTC', rskTag.toString())
                return;
            }

            let rskBLockThatMatch: RskBlock = this.getBlockMatchWithRskTag(blocks, rskTag);
            // let tagIsInblock: boolean = this.rskTagIsInSomeBlock(blocks, rskTag);

            if (!rskBLockThatMatch) {
                this.logger.info('RSKTAG', newBlock.rskTag.toString(), 'found in block', newBlock.btcInfo.hash, 'not present in any RSK block at height', newBlock.rskTag.BN);
                this.addOrCreateBranch(rskBLockThatMatch, newBlock.btcInfo);
            } else {
                //reconstruimos la cadena
                this.addInMainchain(newBlock, rskBLockThatMatch);

                this.logger.info('RSKTAG', newBlock.rskTag.toString(), 'found in block', newBlock.btcInfo.hash, 'found in RSK blocks at height', newBlock.rskTag.BN);
            }
        }
    }

    public async addInMainchain(btcBlock: BtcBlock, rskBlock: RskBlock): Promise<void> {
        let newItemInMainchain = new BranchItem(BtcHeaderInfo.fromObject(btcBlock), rskBlock);
        let mainchain: BranchItem[] = await this.mainchainService.getLastItems(1);

        if (mainchain.length == 0) {
            // there is no mainnet yet, we create it now.

            let newMainnet = new BranchItem(btcBlock.btcInfo, rskBlock);

            this.mainchainService.save([newMainnet]);

            this.logger.info("Mainchain: Created the first item in mainchain");

            return;
        }

        // search last block in mainchain   
        let lastBLockInMainchain = mainchain[0].rskInfo;
        let lastRskBNInMainchainbranch = lastBLockInMainchain.forkDetectionData.BN;

        //rebuilding the chain between last tag find up to the new tag, to have the complete mainchain
        let rskHashToFind = lastBLockInMainchain.hash;
        let itemsToSaveInMainchain: BranchItem[] = [];
        for (let i = lastRskBNInMainchainbranch + 1; i < newItemInMainchain.rskInfo.forkDetectionData.BN; i++) {
            let blocks: RskBlock[] = await this.rskApiService.getBlocksByNumber(i);
            var blockThatShouldBeInMainchain: RskBlock = this.getBlockThatMatch(blocks, rskHashToFind);
            
            if (!blockThatShouldBeInMainchain) {
                this.logger.fatal("Mainchain: building mainchain can not find a block in rsk at heigth:", i, "with hash:", rskHashToFind)
                // process.exit();
                
            }

            rskHashToFind = blockThatShouldBeInMainchain.hash;
            itemsToSaveInMainchain.push(new BranchItem(BtcHeaderInfo.fromObject(btcBlock), blockThatShouldBeInMainchain));
        }
        const hashTopInMainchain = lastBLockInMainchain.hash;
       
        if (rskHashToFind != rskBlock.prevHash) {
            this.logger.fatal("Mainchain: building mainchain can not connect the end of the chain. Last block in mainchain with hash:", hashTopInMainchain, " should connect with prevHash:", rskHashToFind)
            // process.exit(); // Should we finish the process ? 
            return
        }

        itemsToSaveInMainchain.push(new BranchItem(BtcHeaderInfo.fromObject(btcBlock), rskBlock));
        this.logger.info("Mainchain: Saving new items in mainchain with rsk heights:", itemsToSaveInMainchain.map(x => x.rskInfo.height) )
        this.mainchainService.save(itemsToSaveInMainchain);
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

    public stop() {
        this.logger.info('Stopping fork detector')

        this.btcWatcher.stop();
        this.branchService.disconnect();
    }

    public start() {
        this.logger.info('Starting fork detector');

        this.btcWatcher.start();
    }

    public getBlockMatchWithRskTag(blocks: RskBlock[], rskTag: ForkDetectionData): RskBlock {
        return blocks.find(b => b.forkDetectionData.equals(rskTag));
    }

    private getHeightforPossibleBranches(numberBlock: number): number {
        if (numberBlock > this.maxBlocksBackwardsToSearch) {
            return numberBlock - this.maxBlocksBackwardsToSearch;
        } else {
            return 0;
        }
    }

    private async getPossibleForks(blockNumber: number): Promise<Branch[]>{
        //No necesitamos los branches si no los ultimos "nodos" que se agregaron de cada branch
        let minimunHeightToSearch = this.getHeightforPossibleBranches(blockNumber);

        //connect to the database to get possible branches forks , 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        return this.branchService.getForksDetected(minimunHeightToSearch);
    }

    public async getBranchesThatOverlap(rskTag: ForkDetectionData): Promise<Branch[]> {
        let branchesThatOverlap: Branch[] = []
        // Hay que renombrar mejor
        let lastTopsDetected: Branch[] = await this.getPossibleForks(rskTag.BN);

        for (const branch of lastTopsDetected) {
            if (branch.getLast().rskInfo.forkDetectionData.overlapCPV(rskTag.CPV, this.minimunOverlapCPV)) {
                branchesThatOverlap.push(branch);
            }
        }

        return branchesThatOverlap;
    }

    private async addOrCreateBranch(rskBlock: RskBlock, btcInfo: BtcHeaderInfo) {
        let item: BranchItem = new BranchItem(btcInfo, rskBlock);
        const branches: Branch[] = await this.getBranchesThatOverlap(rskBlock.forkDetectionData);

        if (branches.length > 0) {
            const existingBranch: Branch = branches[0];

            this.logger.info('Adding RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcInfo.hash, 'to branch with start', existingBranch.firstDetected.toString());

            // For now, we get the first branch, there is a minimun change to get 2 items that match
            this.branchService.addBranchItem(existingBranch.firstDetected.prefixHash, new BranchItem(btcInfo, rskBlock));
        } else {
            this.logger.info('Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcInfo.hash);
            this.branchService.saveNewBranch(new Branch(item));
        }
    }
}
