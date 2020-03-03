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
        await this.store.getCollection().updateOne({ 'firstDetected.prefixHash': prefixHash }, { $push: { 'items': forkItem } });
    }

    public async getForksDetected(heightToSearch: number = 0): Promise<Fork[]> {
        let forks: any[] = await this.store.getCollection().find({
            "lastDetectedHeight": {
                $gte: heightToSearch,
            }
        }).toArray();

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
