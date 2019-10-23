import { MongoStore } from "../storage/mongo-store";
import { Branch, BranchItem } from "../common/branch";
import BaseService from "./base-service";

export class BranchService extends BaseService {
  
    constructor(store: MongoStore) {
        super(store);
    }

    public async save(branch: Branch): Promise<void> {
        await this.store.getCollection().insertOne(branch);
    }

    public async addBranchItem(prefixHash: string, branchItem: BranchItem): Promise<void> {
        await this.store.getCollection().updateOne({ 'firstDetected.prefixHash': prefixHash }, { $push: { 'items': branchItem } });
    }

    public async getForksDetected(heightToSearch: number = 0): Promise<Branch[]> {
        let branches: any[] = await this.store.getCollection().find({
            "lastDetectedHeight": {
                $gte: heightToSearch,
            }
        }).toArray();

        return branches.map(x => Branch.fromObject(x));
    }

    //FOR TESTING
    public async getAll(): Promise<Branch[]> {
        const branches: any[] = await this.store.getCollection().find().toArray();
        return branches.map(x => Branch.fromObject(x));
    }

    public async removeAll(): Promise<void> {
        return this.store.getCollection().drop()
            .catch(function () {
            });
    }
}
