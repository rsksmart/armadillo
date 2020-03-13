import { MongoStore } from "../storage/mongo-store";
import { Item } from "../common/forks";
import BaseService from "./base-service";
import { ForkDetectionData } from "../common/fork-detection-data";
import { UpdateWriteOpResult } from "mongodb";

export class MainchainService  extends BaseService {
    
    constructor(store: MongoStore) {
       super(store);
    }

    public async changeBlockInMainchain(height: number, itemsToReplace: Item) {
       //First remove the existing item and then save the new items
        var blocks = await this.store.getCollection().find({"rskInfo.height" : height}).toArray();
        var block = blocks.find(b => b.rskInfo.mainchain);

        if(block){
            await this.store.getCollection().deleteMany({ _id: { $in: [block._id] }}); 
            await this.save([itemsToReplace]);
        }
    }
    
    public async getBlock(height: number) : Promise<Item> {
       var blocks  = await this.store.getCollection().find({"rskInfo.height" : height}).toArray();
       return blocks.length > 0 ? Item.fromObject(blocks.find(b => b.rskInfo.mainchain)): null;
    }

    public async updateBtcInfoItem(mainchainBlockAtHeight: Item) : Promise<UpdateWriteOpResult>{
        return this.store.getCollection().updateOne({"rskInfo.forkDetectionData": mainchainBlockAtHeight.rskInfo.forkDetectionData }, { $set: {"btcInfo": mainchainBlockAtHeight.btcInfo}});
    }

    public async getBlockByForkDataDetection(forkDetectionData: ForkDetectionData) : Promise<Item> {
        let objectsToReturn : any[] = await this.store.getCollection().find({"rskInfo.forkDetectionData": forkDetectionData, "rskInfo.height": forkDetectionData.BN}).toArray();
        return objectsToReturn.length > 0 ? Item.fromObject(objectsToReturn[0]) : null;
    }

    public async getLastItems(numberOfItems): Promise<Item[]> {
        let robjectsToReturn : any[] = await this.store.getCollection().find().sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
        return robjectsToReturn.map(x => Item.fromObject(x));
    }

    public async getLastBtcBlocksDetectedInChainCompleteWithRSK(numberOfBtcBlocks): Promise<Item[]> {
        let blocks : any[] = await this.store.getCollection().find({"btcInfo":{$ne:null}}).sort({ "btcInfo.height": -1 }).limit(numberOfBtcBlocks).toArray();

        if(blocks.length > 1){
            blocks = await this.geRskBlocksBetweenHeight(blocks[blocks.length -1].rskInfo.height, blocks[0].rskInfo.height);
        }
        
        return blocks.map(x => Item.fromObject(x));
    }

    public async getFirstBtcBlockDetectedInChainGoingBackwards(numberOfBtcBlocks): Promise<Item> {
        let blocks : any[] = await this.store.getCollection().find({"btcInfo":{$ne:null}}).sort({ "btcInfo.height": -1 }).limit(numberOfBtcBlocks).toArray();

        if(blocks.length > 0){
            return Item.fromObject(blocks[blocks.length -1]);
        }

        return null;
    }
    
    private async geRskBlocksBetweenHeight(startHeight: any, endHeight: any): Promise<any[]> {
        return await this.store.getCollection().find({
            "rskInfo.height": {
                $gte: startHeight,
                $lte: endHeight
            }
        }).sort({ "rskInfo.height": -1, "rskInfo.mainchain": 1 }).toArray();
    }

    public async getLastMainchainItems(numberOfItems): Promise<Item[]> {
        let robjectsToReturn : any[] = await this.store.getCollection().find({ "rskInfo.mainchain": true }).sort({ "rskInfo.height": -1 }).limit(numberOfItems).toArray();
        return robjectsToReturn.map(x => Item.fromObject(x));
    }

    public async getFirstMainchainItem(numberOfItems): Promise<Item> {
        let robjectsToReturn : any[] = await this.store.getCollection().find({ "rskInfo.mainchain": true }).sort({ "rskInfo.height": 1 }).limit(1).toArray();
        return robjectsToReturn.length > 0 ? Item.fromObject(robjectsToReturn[0]) : null;
    }

    public async getBestBlock(): Promise<Item> {
       let items : Item[] = await this.getLastMainchainItems(1);
       return items.length > 0 ? items[0] : null;
    }

    public async save(items: Item[]): Promise<boolean> {
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

    public async getAll() : Promise<Item[]>{
        let items : any[] = await this.store.getCollection().find({}).toArray();
        return items.map(x => Item.fromObject(x));
    }

    public async deleteAll(){
        return this.store.getCollection().drop().catch(function(){});
    }
}
