import { MongoStore } from "../storage/mongo-store";
import { Branch, BranchItem } from "../common/branch";

export class MainchainService {
    private store: MongoStore;

    constructor(store: MongoStore) {
        this.store = store;
    }

    public connect(): Promise<void> {
        return this.store.connect();
    }

    public disconnect() {
        this.store.disconnect();
    }

    public getLastItems(numberOfItems): Promise<BranchItem[]> {
        return this.store.getCollection().find().sort({ "rskInfo.height" : -1 }).limit(numberOfItems).toArray();
    }

    public saveMainchainItem(branch: BranchItem): void {
       this.store.getCollection().insertOne(branch);
    }
}
