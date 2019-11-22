import { MongoStore } from "../storage/mongo-store";
import { BranchItem } from "../common/branch";
import BaseService from "./base-service";

export class MainchainService  extends BaseService {

     constructor(store: MongoStore) {
       super(store);
    }

    public async getLastItems(numberOfItems): Promise<BranchItem[]> {
        let robjectsToReturn : any[] = await this.store.getCollection().find().sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
        return robjectsToReturn.map(x => BranchItem.fromObject(x));
    }

    public async getBestBlock(): Promise<BranchItem> {
       let items : BranchItem[] = await this.getLastItems(1);
       return items.length > 0 ? items[0] : null;
    }

    public async save(items: BranchItem[]): Promise<boolean> {
        var response = true;

        await this.store.getCollection().insertMany(items).catch(function(ex){
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

    public async getAll() : Promise<BranchItem[]>{
        let items : any[] = await this.store.getCollection().find({}).toArray();
        return items.map(x => BranchItem.fromObject(x));
    }

    public async deleteAll(){
        await this.store.getCollection().drop();
    }
}
