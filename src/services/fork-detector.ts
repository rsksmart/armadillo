import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Branch, BranchItem } from "../common/branch";
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
    private lastBlockChecked: BtcBlock;
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

    public async onNewBlock(newBtcBlock: BtcBlock) {
        
        if (this.lastBlockChecked && newBtcBlock.btcInfo.height <= this.lastBlockChecked.btcInfo.height) {
            // Nothing to do, already check previous BTC blocks
            // Is sure that we have to check if is same height or may happened a reorg 
            // in btc that is pushing the same btc block height with different hash and we are missing the mainchain.
            
            this.logger.warn("BTC API: Duplicate BTC block recieved, hash:", newBtcBlock.btcInfo.hash, "height:", newBtcBlock.btcInfo.height);
            return;
        }

        if (!this.lastBlockChecked || this.lastBlockChecked.btcInfo.hash != newBtcBlock.btcInfo.hash) {

            this.lastBlockChecked = newBtcBlock;

            if (newBtcBlock.rskTag == null) {
                this.logger.info('Skipping block', newBtcBlock.btcInfo.hash, '. No RSKTAG present')
                return;
            }

            let rskTag: ForkDetectionData = newBtcBlock.rskTag;
            let rskBestBlock: RskBlock = await this.rskApiService.getBestBlock();

            if(rskTag.BN > rskBestBlock.height){
                this.logger.warn("FORK: found a block in the future");
                // var items = [];
                // items.push(this.getMainchainConnection(rskBlock, rskBlocksSameHeight));
                //TODO: Missing: connect the tip of the chain where fork have started
                
                this.addOrCreateBranch(new RskBlock(rskTag.BN, rskTag.prefixHash, "", rskTag), newBtcBlock, rskBestBlock);
                return;
            }

            let rskBlocksSameHeight: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);

            if (rskBlocksSameHeight.length == 0) {
                //What should we do here? 
                //if blocks are empty, could means that there are not height at that BN.
                //maybe we have to check best block and compare the height to be sure if tag is well form
                //Maybe the selfiish chain height is bigger than the main chain
                this.logger.warn('Blocks are not in rsk at height', rskTag.BN, 'with tag in BTC', rskTag.toString())
                return;
            }

            let rskBLockThatMatch: RskBlock = this.getBlockMatchWithRskTag(rskBlocksSameHeight, rskTag);
            
            if (!rskBLockThatMatch) {
                this.addOrCreateBranch(rskBLockThatMatch, newBtcBlock, rskBlocksSameHeight[0]);
            } else {
                //reconstruimos la cadena
                this.addInMainchain(newBtcBlock, rskBLockThatMatch);

                this.logger.info('RSKTAG', newBtcBlock.rskTag.toString(), 'found in block', newBtcBlock.btcInfo.hash, 'found in RSK blocks at height', newBtcBlock.rskTag.BN);
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
                this.logger.fatal("Mainchain: building mainchain can not find a block in rsk at height:", i, "with hash:", rskHashToFind)
                // process.exit();
            }

            rskHashToFind = blockThatShouldBeInMainchain.hash;
            itemsToSaveInMainchain.push(new BranchItem(new BtcHeaderInfo(null, null), blockThatShouldBeInMainchain));
        }
        const hashTopInMainchain = lastBLockInMainchain.hash;
       
        if (rskHashToFind != rskBlock.prevHash) {
            this.logger.fatal("Mainchain: building mainchain can not connect the end of the chain. Last block in mainchain with hash:", hashTopInMainchain, " should connect with prevHash:", rskHashToFind)
            // process.exit(); // Should we finish the process ? 
            return
        }

        itemsToSaveInMainchain.push(new BranchItem(btcBlock.btcInfo, rskBlock));
        this.logger.info("Mainchain: Saving new items in mainchain with rsk heights:", itemsToSaveInMainchain.map(x => x.rskInfo.height))
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

    private async addOrCreateBranch(rskBlock: RskBlock, btcBlock: BtcBlock, rskBlocksSameHeight: RskBlock) {

        if(!rskBlock){
            rskBlock = new RskBlock(btcBlock.rskTag.BN, btcBlock.rskTag.prefixHash, "", btcBlock.rskTag);
        }

        let item: BranchItem = new BranchItem(btcBlock.btcInfo, rskBlock);
        let branches: Branch[] = [];

        branches = await this.getBranchesThatOverlap(rskBlock.forkDetectionData);
       
        if (branches.length > 0) {
            // For now, we get the first branch, there is a minimun change to get 2 items that match
            const existingBranch: Branch = branches[0];

            this.logger.warn('FORK: Adding RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash, 'to branch with start', existingBranch.getFirstDetected().toString());
            
            this.branchService.addBranchItem(existingBranch.getFirstDetected().prefixHash, new BranchItem(btcBlock.btcInfo, rskBlock));
        } else {
            let connectionWithMainchain = await this.rskApiService.getRskBlockAtCerteinHeight(rskBlock, rskBlocksSameHeight);
            this.logger.warn('FORK: Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash);
            this.branchService.save(new Branch(new BranchItem(null,connectionWithMainchain), item));
        }
    }

   
}
