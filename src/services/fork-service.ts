import { MongoStore } from "../storage/mongo-store";
import { Fork, ForkItem } from "../common/forks";
import BaseService from "./base-service";

export class ForkService extends BaseService {
    constructor(store: MongoStore) {
        super(store);
    }

    public async save(fork: Fork): Promise<void> {
        await this.store.getCollection().insertOne(fork);
    }

    public async addForkItem(prefixHash: string, forkItem: ForkItem): Promise<void> {
        await this.store.getCollection().updateOne({ 'firstDetected.prefixHash': prefixHash }, { $push: { 'items': forkItem }, $set: { "btcHeightLastTagFound": forkItem.btcInfo.height }});
    }

    public async getForksDetectedFromBtcHeight(btcHeightToSearch: number = 0): Promise<Fork[]> {
        let forks: any[] = await this.store.getCollection().find({
            "btcHeightLastTagFound": {
                $gte: btcHeightToSearch,
            }
        }).toArray();

        return forks.map(x => Fork.fromObject(x));
    }

    public async getForksDetectedFromRskHeight(rskHeightToSearch: number = 0): Promise<Fork[]> {
        let forks: any[] = await this.store.getCollection().find({
            "rskHeightLastTagFound": {
                $gte: rskHeightToSearch,
            }
        }).toArray();

        return forks.map(x => Fork.fromObject(x));
    }

    public async getLastForks(numberOfForks: number = 1): Promise<Fork[]> {
        let forks: any[] = await this.store.getCollection().find({}).sort({ "btcHeightLastTagFound": -1 }).limit(numberOfForks).toArray();
        return forks.map(x => Fork.fromObject(x));
    }

    //FOR TESTING
    public async getAll(): Promise<Fork[]> {
        const forks: any[] = await this.store.getCollection().find().toArray();
        return forks.map(x => Fork.fromObject(x));
    }

    public async deleteAll(): Promise<void> {
        return this.store.getCollection().drop()
            .catch(function () {
            });
    }
}
