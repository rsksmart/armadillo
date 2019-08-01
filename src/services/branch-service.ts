import { MongoStore } from "../storage/mongo-store";
import { Branch, BranchItem } from "../common/branch";

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

    public saveNewBranch(branch: Branch): void {
        this.store.getCollection().save(branch);
    }

    public addBranchItem(prefixHash: string, branchItem: BranchItem): void {
        this.store.getCollection().updateOne(
            { 'firstDetected.prefixHash': prefixHash },
            { $push: { 'items': branchItem} });
    }

    public async getForksDetected(minimunHeightToSearch: number = 0): Promise<Branch[]> {
        let branches: any[] = await this.store.getCollection().find({
            "lastDetectedHeight": {
                $gte: minimunHeightToSearch,
            }
        }).toArray();

        return branches.map(x => Branch.fromObject(x));
    }

    public async getAll(): Promise<Branch[]> {
        const branches: any[] = await this.store.getCollection().find().toArray();
        return branches.map(x => Branch.fromObject(x));
    }
}
