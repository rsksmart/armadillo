import { BlockBTC, BlockRSK } from "../common/block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { BranchService } from "./branch-service";
import Branch from "../common/branch";
import { BtcMonitor, BTCEvents } from "./btc-monitor";
import { RskApiService, RskApi } from "./rsk-api-service";

export class ForkDetector {

    private branchService: BranchService;
    private lastBTCheck: BlockBTC;
    private rskApiService: RskApi;
    private btcMonitor: BtcMonitor;
    private lastBlockChecked: BlockBTC;

    constructor(branchService: BranchService, btcMonitor: BtcMonitor, rskApiService: RskApi) {
        this.lastBTCheck = new BlockBTC(0, "", "");
        this.branchService = branchService;
        this.btcMonitor = btcMonitor;
        this.rskApiService = rskApiService;

        this.btcMonitor.on(BTCEvents.NEW_BLOCK, (block: BlockBTC) => this.onNewBlock(block))
    }

    private async onNewBlock(newBlock: BlockBTC) {
        if (this.lastBlockChecked.hash != newBlock.hash) {
            if (this.lastBlockChecked.rskTag == null) {
                //this block doesn't have rsktag, nothing to do
                return;
            }
            //is a new block, let's detect rsk tag

            let rskTag: ForkDetectionData = this.lastBlockChecked.rskTag;

            let hashPrefix = rskTag.prefixHash;
            let CPV = rskTag.CPV;
            let NU = rskTag.NU;
            let BN = rskTag.BN;

            //Should we get rsk block from height:
            let blocks: BlockRSK[] = await this.rskApiService.getBlocksByNumber(BN);

            let tagIsInblock: boolean = this.rskTagIsInSomeBlock(blocks, rskTag);

            if (!tagIsInblock) {
                //save it into db to temporal line, we have to know which is the miner ? 
                this.addOrCreateInTemporalLine(rskTag);
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

    start() {
        this.btcMonitor.run();
    }

    private rskTagIsInSomeBlock(blocks: BlockRSK[], rskTag: ForkDetectionData): boolean {

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
            if (this.overlapCPV(branch, rskTag)) {
                branchesThatOverlap.push(branch)
            }
        }

        return branchesThatOverlap;
    }

    private overlapCPV(existingTag: ForkDetectionData, tagToCheck: ForkDetectionData): boolean {
        let countCPVtoMatch = 3; // I think we can say that 3 is enaugh to say that is in the same branch

        let cpvInFork = existingTag.CPV.split("");
        let cpvToCheck = tagToCheck.CPV.split("");

        var numberOfMatch = 0;

        for (var i = 0; i < cpvToCheck.length; i++) {
            if (cpvInFork[cpvInFork.length - i] == cpvToCheck[i]) {
                numberOfMatch++;
            } else {
                break;
            }
        }

        if (numberOfMatch >= countCPVtoMatch) {
            return true;
        } else {
            return false;
        }
    }

    private async addOrCreateInTemporalLine(rskTag: ForkDetectionData) {
        let branchToSave: Branch;
        const branches: Branch[] = await this.getBranchesThatOverlap(rskTag)

        if (branches.length > 0) {
            // por ahora solo usamos el primero
            branchToSave = branches[0];
            branchToSave.pushTop(rskTag);
        } else {
            branchToSave = new Branch(rskTag);
        }

        //Deberia crear o editar un branch existente en db
        this.branchService.saveBranch(branchToSave);
    }
}
