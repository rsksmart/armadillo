import { MongoStore } from '../storage/mongo-store';
import { BtcBlock } from '../common/btc-block';

export class BtcService {
    private store: MongoStore;

    constructor(store: MongoStore) {
        this.store = store;
    }

    public async getLastBlockDetected(): Promise<BtcBlock> {
        return this.store.getCollection().findOne({});
    }

    public async saveBlockDetected(btc: any) {
        //remove last block;
        await this.store.getCollection().drop();
        this.store.getCollection().insertOne(btc);
    }
}