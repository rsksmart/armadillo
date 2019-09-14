import { MongoStore } from "../storage/mongo-store";
import { BranchItem } from "../common/branch";
import BaseService from "./base-service";

export class MainchainService  extends BaseService {
    constructor(store: MongoStore) {
       super(store);
    }

    public connect(): Promise<void> {
        return this.store.connect();
    }

    public disconnect() {
        this.store.disconnect();
    }

    public getLastItems(numberOfItems): Promise<BranchItem[]> {
        return this.store.getCollection().find().sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
    }

    public async save(items: BranchItem[]): Promise<boolean> {
        var response = true;

        await this.store.getCollection().insertMany(items).catch(function(){
            response = false;
        });

        return response;
    }
    
    public async removeLastBlocks(n: number) : Promise<string[]> {
        const removeIdsArray: any[] = await this.store.getCollection().find()
        .limit(n)
        .sort({ "rskInfo.height" : -1 })
        .toArray().then(list => list.map(function (doc) { return doc._id; }));

        await this.store.getCollection().deleteMany({ _id: { $in: removeIdsArray }})

        return removeIdsArray;
    }
}
