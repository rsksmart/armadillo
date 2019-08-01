import { MongoStore } from "../storage/mongo-store";
import { Branch } from "../common/branch";

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
        this.store.getCollection().update({ 'firstDetected.prefixHash': branchToSave.firstDetected.prefixHash }, { $push: { 'items': branchToSave } });
    }

    public async getForksDetected(minimunHeightToSearch: number): Promise<Branch[]> {
        let branches: Branch[] = await this.store.getCollection().find({
            "firstDetected": {
                $gte: minimunHeightToSearch,
            }
        }).toArray();

        return branches;
    }

    public getAll(): any {
        return [];
    }
}
