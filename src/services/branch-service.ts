import { MongoStore } from "../storage/mongo-store";
import Branch from "../common/branch";
import { ForkDetectionData } from "../common/fork-detection-data";

export class BranchService{
    
    private store : MongoStore;

    constructor(store: MongoStore){
        this.store = store;
    }

    public connect() {
    }
    
    public disconnect() {
    }

    public saveBranch(branchToSave: Branch) {
    }

    public getForksDetected(minimunHeightToSearch: number) : ForkDetectionData[] {
        return [];
    }
}
