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
        this.lastBlockChecked = new BtcBlock(0, "", "");
        this.branchService = branchService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    private async onNewBlock(newBlock: BtcBlock) {
        if (this.lastBlockChecked.btcInfo.hash != newBlock.btcInfo.hash) {
            this.lastBlockChecked = newBlock;
            if (this.lastBlockChecked.rskTag == null) {
                //this block doesn't have rsktag, nothing to do
                return;
            }
         
            //is a new block, let's detect rsk tag
            let rskTag: ForkDetectionData = this.lastBlockChecked.rskTag;
            let blocks: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);

            let tagIsInblock: boolean = this.rskTagIsInSomeBlock(blocks, rskTag);

            if (!tagIsInblock) {
                //save it into db, into a new o existing temporal line 
                this.addOrCreateInTemporalLine(rskTag, newBlock.btcInfo);
            } else {
                //Should we do something with this information
                //if CPV is in main chain or in rsk uncles?
            }
        }
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

    private rskTagIsInSomeBlock(blocks: RskBlock[], rskTag: ForkDetectionData): boolean {

        for (const block of blocks) {
            if (block.rskTag == rskTag) {
                return true;
            }
        }

        return false;
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
            if (branch.getLast().forkDetectionData.overlapCPV(rskTag.CPV, this.minimunOverlapCPV)) {
                branchesThatOverlap.push(branch);
            }
        }

        return branchesThatOverlap;
    }

    private async addOrCreateInTemporalLine(rskTag: ForkDetectionData, btcInfo: BtcHeaderInfo) {
        let branchToSave: Branch;
        const branches: Branch[] = await this.getBranchesThatOverlap(rskTag)

        if (branches.length > 0) {
            // For now, we get the first branch, there is a minimun change to get 2 items that match
            this.branchService.addBranchItem(branches[0].firstDetected.prefixHash, new BranchItem(btcInfo, rskTag));
        } else {
            branchToSave = new Branch(new BranchItem(btcInfo, rskTag));
            this.branchService.saveNewBranch(branchToSave);
        }
    }
}
