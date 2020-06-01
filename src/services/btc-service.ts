import { MongoStore } from '../storage/mongo-store';
import BaseService from './base-service';

export class BtcService extends BaseService {
    constructor(store: MongoStore) {
        super(store);
    }

    public async getLastBlockDetected(): Promise<any> {
        let lastBlockDetected = await this.store.getCollection().findOne({});

        // This is for testing purpose in prod
        if (!lastBlockDetected) {
            console.log("lastBlockDetected was found im null :) ", lastBlockDetected);
        }
        //

        return lastBlockDetected;
    }

    public async save(btc: any): Promise<void> {
        await this.store.getCollection().findOneAndDelete({});
        await this.store.getCollection().save(btc);
    }

    public async deleteAll() {
        return this.store.getCollection().drop().catch(function () { });
    }
}