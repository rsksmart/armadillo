import { MongoStore } from "../storage/mongo-store";
import { BranchItem } from "../common/branch";
import BaseService from "./base-service";
import { ForkDetectionData } from "../common/fork-detection-data";
import { UpdateWriteOpResult } from "mongodb";
import { Printify } from "../util/printify";

export class MainchainService  extends BaseService {
    
    constructor(store: MongoStore) {
       super(store);
    }

    public async changeBlockInMainchain(height: number, branchItemToReplace: BranchItem) {
       //First remove the existing item and then save the new branchItem
        var blocks = await this.store.getCollection().find({"rskInfo.height" : height}).toArray();
        var block = blocks.find(b => b.rskInfo.mainchain);

        if(block){
            await this.store.getCollection().deleteMany({ _id: { $in: [block._id] }}); 
            await this.save([branchItemToReplace]);
        }
    }
    
    public async getBlock(height: number) : Promise<BranchItem> {
       var blocks  = await this.store.getCollection().find({"rskInfo.height" : height}).toArray();
       return blocks.length > 0 ? BranchItem.fromObject(blocks.find(b => b.rskInfo.mainchain)): null;
    }

    public async updateBtcInfoBranchItem(mainchainBlockAtHeight: BranchItem) : Promise<UpdateWriteOpResult>{
        return this.store.getCollection().updateOne({"rskInfo.forkDetectionData": mainchainBlockAtHeight.rskInfo.forkDetectionData }, { $set: {"btcInfo": mainchainBlockAtHeight.btcInfo}});
    }

    public async getBlockByForkDataDetection(forkDetectionData: ForkDetectionData) : Promise<BranchItem> {
        let objectsToReturn : any[] = await this.store.getCollection().find({"rskInfo.forkDetectionData": forkDetectionData, "rskInfo.height": forkDetectionData.BN}).toArray();
        return objectsToReturn.length > 0 ? BranchItem.fromObject(objectsToReturn[0]) : null;
    }

    public async getLastItems(numberOfItems): Promise<BranchItem[]> {
        let robjectsToReturn : any[] = await this.store.getCollection().find().sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
        return robjectsToReturn.map(x => BranchItem.fromObject(x));
    }

    public async getLastBtcBlocksDetectedInChain(numberOfBtcBlocks): Promise<BranchItem[]> {
        let blocks : any[] = await this.store.getCollection().find({"btcInfo":{$ne:null}}).sort({ "rskInfo.height": -1 }).limit(numberOfBtcBlocks).toArray();

        if(blocks.length > 1){
            blocks = await this.geRskBlocksBetweenHeight(blocks[blocks.length -1].rskInfo.height, blocks[0].rskInfo.height);
        }
        
        return blocks.map(x => BranchItem.fromObject(x));
    }
    
    private async geRskBlocksBetweenHeight(startHeight: any, endHeight: any): Promise<any[]> {
        return await this.store.getCollection().find({
            "rskInfo.height": {
                $gte: startHeight,
                $lte: endHeight
            }
        }).sort({ "rskInfo.height": -1, "rskInfo.mainchain": 1 }).toArray();
    }

    public async getLastMainchainItems(numberOfItems): Promise<BranchItem[]> {
        let robjectsToReturn : any[] = await this.store.getCollection().find({ "rskInfo.mainchain": true }).sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
        return robjectsToReturn.map(x => BranchItem.fromObject(x));
    }

    public async getFirstMainchainItem(numberOfItems): Promise<BranchItem> {
        let robjectsToReturn : any[] = await this.store.getCollection().find({ "rskInfo.mainchain": true }).sort({ "rskInfo.height": 1 }).limit(1).toArray();
        return robjectsToReturn.length > 0 ? BranchItem.fromObject(robjectsToReturn[0]) : null;
    }

    public async getBestBlock(): Promise<BranchItem> {
       let items : BranchItem[] = await this.getLastMainchainItems(1);
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
        return this.store.getCollection().drop().catch(function(){});
    }
}
