import { MongoStore } from "../storage/mongo-store";
import Branch from "../common/branch";
import { ForkDetectionData } from "../common/fork-detection-data";

export class BranchService {
  

    private store: MongoStore;

    constructor(store: MongoStore) {
        this.store = store;
    }

    public connect(): Promise<void> {
        return this.store.connect();
    }

    public disconnect() {
        this.store.disconnect();
    }

    public saveBranch(branchToSave: Branch) {
        this.store.getCollection().update({'firstDetected.prefixHash': branchToSave.firstDetected.prefixHash }, {$push: { 'items': branchToSave } } );
    }

    public async getForksDetected(minimunHeightToSearch: number): Promise<ForkDetectionData[]> {

        let branches: ForkDetectionData[] = await this.store.getCollection().find().toArray();
        return branches;
    }

    public getAll(): any {
        return [];
    }
}
