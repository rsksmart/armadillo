import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { BranchService } from "./branch-service";
import { Branch, BranchItem } from "../common/branch";
import { BtcWatcher, BTCEvents } from "./btc-watcher";
import { RskApi } from "./rsk-api-service";
import { getLogger, Logger } from "log4js";

export class ForkDetector {

    private logger: Logger;
    private branchService: BranchService;
    private rskApiService: RskApi;
    private btcWatcher: BtcWatcher;
    private lastBlockChecked: BtcBlock;
    private maxBlocksBackwardsToSearch : number = 448;
    private minimunOverlapCPV : number = 3;

    constructor(branchService: BranchService, btcWatcher: BtcWatcher, rskApiService: RskApi) {
        this.branchService = branchService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    public async onNewBlock(newBlock: BtcBlock) {
        if(this.lastBlockChecked && newBlock.btcInfo.height <= this.lastBlockChecked.btcInfo.height){
            //Nothing to do, already check previous blocks
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


            if(blocks.length == 0){
                //What should we do here? 
                //if blocks are empty, could means that there are not height at that BN.
                //maybe we have to check best block and compare the height to be sure if tag is well form
                //Maybe the selfiish chain height is bigger than the main chain
                this.logger.warn('Blocks are not in rsk at height', rskTag.BN, 'with tag in BTC', rskTag.toString())
                return;
            }

            let rskBLockThatMatch : RskBlock = this.getBlockMatchWithRskTag(blocks, rskTag);
            let tagIsInblock: boolean = this.rskTagIsInSomeBlock(blocks, rskTag);

            if (!tagIsInblock) {
                this.logger.info('RSKTAG', newBlock.rskTag.toString(),' found in block', newBlock.btcInfo.hash, 'not present in any RSK block at height', newBlock.rskTag.BN);
                this.addOrCreateInTemporalLine(rskBLockThatMatch, newBlock.btcInfo);
            } else {
                //reconstruimos la cadena
                this.addInMainchain(newBlock, rskBLockThatMatch);

                this.logger.info('RSKTAG', newBlock.rskTag.toString(),' found in block', newBlock.btcInfo.hash, 'found in RSK blocks at height', newBlock.rskTag.BN);
            }
        }
    }
    
    public async addInMainchain(block: BtcBlock, rskBlock : RskBlock): Promise<void> {
        let mainnet : Branch = await this.branchService.getMainnetBranch();

        let newItemInMainnet = new BranchItem(BtcHeaderInfo.fromObject(block), rskBlock);

        if(mainnet == null){
            // there is no mainnet yet, we create it now.

            let newMainnet = new Branch(newItemInMainnet, true);

            this.branchService.saveNewBranch(newMainnet);

            return;
        }

        // search last tag find   
        let prevTagFind = mainnet.getTop();

        let lastRskBNInMainnetbranch = prevTagFind.rskInfo.forkDetectionData.BN;

        //rebuilding the chain between last tag find and the new tag, to have the complete mainchain

        for(let i = lastRskBNInMainnetbranch + 1; i < newItemInMainnet.rskInfo.forkDetectionData.BN ; i++){
            let blocksAtHeghti : RskBlock[] =  await this.rskApiService.getBlocksByNumber(i);
            for(let j= 0; j < blocksAtHeghti.length; j++){
                let rskBlock: RskBlock = blocksAtHeghti[j];
                if(rskBlock.prevHash == newItemInMainnet.btcInfo.hash){
                    //here we also can check that cpv overlap no less than 6 bytes (IMPORTANT)
                    mainnet.pushTop(new BranchItem(new BtcHeaderInfo(), rskBlock));

                }
                
            }
        }

        mainnet.pushTop(new BranchItem(BtcHeaderInfo.fromObject(block), rskBlock));
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

    private rskTagIsInSomeBlock(blocks: RskBlock[], rskTag: ForkDetectionData): boolean {
        return blocks.findIndex(b => b.forkDetectionData.equals(rskTag)) != -1;
    }

    private getHeightforPossibleBranches(numberBlock: number): number {
        if (numberBlock > this.maxBlocksBackwardsToSearch) {
            return numberBlock - this.maxBlocksBackwardsToSearch;
        } else {
            return 0;
        }
    }

    private async getPossibleForks(blockNumber: number): Promise<Branch[]> {
        //No necesitamos los branches si no los ultimos "nodos" que se agregaron
        let minimunHeightToSearch = this.getHeightforPossibleBranches(blockNumber);

        //connect to the database to get possible branches forks , 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        return this.branchService.getForksDetected(minimunHeightToSearch);
    }

    public async getBranchesThatOverlap(rskTag: ForkDetectionData) : Promise<Branch[]> {
        let branchesThatOverlap : Branch[] = []
        // Hay que renombrar mejor
        let lastTopsDetected: Branch[] = await this.getPossibleForks(rskTag.BN);
        
        for (const branch of lastTopsDetected) {
            if (branch.getLast().rskInfo.forkDetectionData.overlapCPV(rskTag.CPV, this.minimunOverlapCPV)) {
                branchesThatOverlap.push(branch);
            }
        }

        return branchesThatOverlap;
    }

    private async addOrCreateInTemporalLine(rskBlock: RskBlock, btcInfo: BtcHeaderInfo) {
        let branchToSave: Branch;
        const branches: Branch[] = await this.getBranchesThatOverlap(rskBlock.forkDetectionData);

        if (branches.length > 0) {
            const existingBranch: Branch = branches[0];

            this.logger.info('Adding RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcInfo.hash, 'to branch with start', existingBranch.firstDetected.toString());

            // For now, we get the first branch, there is a minimun change to get 2 items that match
            this.branchService.addBranchItem(existingBranch.firstDetected.prefixHash, new BranchItem(btcInfo, rskBlock));
        } else {
            this.logger.info('Creating branch for RSKTAG', rskBlock.forkDetectionData.toString(), 'found in block', btcInfo.hash);

            branchToSave = new Branch(new BranchItem(btcInfo, rskBlock));
            this.branchService.saveNewBranch(branchToSave);
        }
    }
}
