import { RskBlock } from "../common/rsk-block";
import { BtcBlock, BtcHeaderInfo } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { BranchService } from "./branch-service";
import Branch, { BranchItem } from "../common/branch";
import { BtcMonitor, BTCEvents } from "./btc-monitor";
import { RskApi } from "./rsk-api-service";

export class ForkDetector {

    private branchService: BranchService;
    private rskApiService: RskApi;
    private btcMonitor: BtcMonitor;
    private lastBlockChecked: BtcBlock;

    constructor(branchService: BranchService, btcMonitor: BtcMonitor, rskApiService: RskApi) {
        this.branchService = branchService;
        this.btcMonitor = btcMonitor;
        this.rskApiService = rskApiService;

        this.btcMonitor.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    private async onNewBlock(newBlock: BtcBlock) {
        if (this.lastBlockChecked.btcInfo.hash != newBlock.btcInfo.hash) {
            if (this.lastBlockChecked.rskTag == null) {
                //this block doesn't have rsktag, nothing to do
                return;
            }
            //is a new block, let's detect rsk tag

            let rskTag: ForkDetectionData = this.lastBlockChecked.rskTag;

            //Should we get rsk block from height:
            let blocks: RskBlock[] = await this.rskApiService.getBlocksByNumber(rskTag.BN);

            let tagIsInblock: boolean = this.rskTagIsInSomeBlock(blocks, rskTag);

            if (!tagIsInblock) {
                //save it into db to temporal line, we have to know which is the miner ? 
                this.addOrCreateInTemporalLine(rskTag, newBlock.btcInfo);
            } else {
                //Should we do something with this information ? 
                // if CPV is in main chain or in rsk uncles ? 
            }
        }
    }

    public stop() {
        this.btcMonitor.stop();
        this.branchService.disconnect();
    }

    public start() {
        this.btcMonitor.run();
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
        let maxBlocksBackwardsToSearch = 448;

        if (numberBlock > maxBlocksBackwardsToSearch) {
            return numberBlock - maxBlocksBackwardsToSearch;
        } else {
            return 0;
        }
    }

    private async getPossibleForks(blockNumber: number): Promise<ForkDetectionData[]> {
        //No necesitamos los branches si no los ultimos "nodos" que se agregaron
        let minimunHeightToSearch = this.getHeightforPossibleBranches(blockNumber);

        //connect to the database to get possible branches forks , 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        return this.branchService.getForksDetected(minimunHeightToSearch);
    }

    private async getBranchesThatOverlap(rskTag: ForkDetectionData) {
        let branchesThatOverlap = []
        // Hay que renombrar mejor
        let lastTopsDetected: ForkDetectionData[] = await this.getPossibleForks(rskTag.BN);

        for (const branch of lastTopsDetected) {
            if (branch.overlapCPV(rskTag.CPV, 3)) {
                branchesThatOverlap.push(branch)
            }
        }

        return branchesThatOverlap;
    }


    private async addOrCreateInTemporalLine(rskTag: ForkDetectionData, btcInfo: BtcHeaderInfo) {
        let branchToSave: Branch;
        const branches: Branch[] = await this.getBranchesThatOverlap(rskTag)

        if (branches.length > 0) {
            // por ahora solo usamos el primero
            branchToSave = branches[0];
            branchToSave.pushTop(new BranchItem(btcInfo, rskTag));
        } else {
            branchToSave = new Branch(new BranchItem(btcInfo, rskTag));
        }

        //Deberia crear o editar un branch existente en db
        this.branchService.saveBranch(branchToSave);
    }
}
