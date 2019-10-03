import { MongoStore } from '../storage/mongo-store';
import { BtcBlock } from '../common/btc-block';
import BaseService from './base-service';

export class BtcService extends BaseService {
    constructor(store: MongoStore) {
        super(store);
    }

    public async getLastBlockDetected(): Promise<BtcBlock> {
        return this.store.getCollection().findOne({});
    }

    public async save(btc: any) : Promise<void> {
        //remove last block;
        await this.store.getCollection().drop().catch(function(){});
        await this.store.getCollection().insertOne(btc);
    }

    public async removeAll() {
        await this.store.getCollection().drop().catch(function(){});
    }
}