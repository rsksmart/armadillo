import { BlockBTC, BlockRSK } from "../common/block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { BranchService } from "./branch-service";
import Branch from "../common/branch";

export class ForkDetector {
    private service: BranchService;
    private lastBTCheck: BlockBTC;

    constructor(branchService: BranchService) {
        this.lastBTCheck = new BlockBTC(0, "", "");
        this.service = branchService;
    }

    start() {
        //for now we just do a polling to get last btc block
        let lastBlock: BlockBTC = this.getLastBlockFromBTC();

        if (lastBlock.hash != this.lastBTCheck.hash) {

            if (lastBlock.rskTag == null) {
                //this block doesn't have rsktag, nothing to do
                return;
            }
            //is a new block, let's detect rsk tag

            let rskTag: ForkDetectionData = lastBlock.rskTag;

            let hashPrefix = rskTag.prefixHash;
            let CPV = rskTag.CPV;
            let NU = rskTag.NU;
            let BN = rskTag.BN

            //Should we get rsk block from height:
            let blocks: BlockRSK[] = this.getBlocksFromRSK(BN);

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

    private getLastBlockFromBTC() {
        return new BlockBTC(1, "hash", "tag loco");
    }

    private getBlocksFromRSK(blockNumber: number) {

        let listBLocks: BlockRSK[] = [];

        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag1")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag2")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag3")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag4")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag5")));

        return listBLocks;
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

    private getPossibleForks(blockNumber: number): ForkDetectionData[] {
        //No necesitamos los branches si no los ultimos "nodos" que se agregaron
        let minimunHeightToSearch = this.getHeightforPossibleBranches(blockNumber);

        //connect to the database to get possible branches forks , 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        let forks: ForkDetectionData[] = this.service.getForksDetected(minimunHeightToSearch);

        return forks;
    }

    private getBranchesThatOverlap(rskTag: ForkDetectionData) {
        let branchesThatOverlap = []
        // Hay que renombrar mejor
        let lastTopsDetected: ForkDetectionData[] = this.getPossibleForks(rskTag.BN);

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

    private addOrCreateInTemporalLine(rskTag: ForkDetectionData) {
        let branchToSave: Branch;
        const branches: Branch[] = this.getBranchesThatOverlap(rskTag)

        if (branches.length > 0) {
            // por ahora solo usamos el primero
            branchToSave = branches[0];
            branchToSave.pushTop(rskTag);
        } else {
            branchToSave = new Branch(rskTag);
        }

        //Deberia crear o editar un branch existente en db
        this.service.saveBranch(branchToSave);
    }
}
