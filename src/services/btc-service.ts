import { MongoStore } from '../storage/mongo-store';
import { BtcBlock } from '../common/btc-block';
import BaseService from './base-service';
import { sleep } from '../util/helper';

export class BtcService extends BaseService {
    constructor(store: MongoStore) {
        super(store);
    }

    public async getLastBlockDetected(): Promise<any> {
        return this.store.getCollection().findOne({});
    }

    public async save(btc: any) : Promise<void> {
        await this.store.getCollection().findOneAndDelete({});
        await this.store.getCollection().save(btc);
    }

    public async deleteAll() {
        return this.store.getCollection().drop().catch(function(){});
    }
}