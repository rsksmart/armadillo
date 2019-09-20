

import { MongoStore } from "../storage/mongo-store";
import { Branch, BranchItem } from "../common/branch";
import BaseService from "./base-service";

export class BranchService extends BaseService {
  
    constructor(store: MongoStore) {
        super(store);
    }

    public connect(): Promise<void> {
        return this.store.connect();
    }

    public disconnect() {
        this.store.disconnect();
    }

    public async save(branch: Branch): Promise<void> {
        await this.store.getCollection().insertOne(branch);
    }

    public async addBranchItem(prefixHash: string, branchItem: BranchItem): Promise<void> {
        await this.store.getCollection().updateOne({ 'firstDetected.prefixHash': prefixHash }, { $push: { 'items': branchItem } });
    }

    public async getForksDetected(heightToSearch: number = 0): Promise<Branch[]> {

        // let maxBranchFound : any = await this.store.getCollection().find().sort({"lastDetectedHeight":-1}).limit(1);
        
        // if(!maxBranchFound || maxBranchFound.length == 0){
        //     return [];
        // }
        let branches: any[] = await this.store.getCollection().find({
            "lastDetectedHeight": {
                $gte: heightToSearch,
            }
        }).toArray();
        
        //TODO: add into toReturn object the new item which is going to be connected to mainchain

        return branches;
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
