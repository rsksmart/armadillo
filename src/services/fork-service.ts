import { MongoStore } from "../storage/mongo-store";
import { Fork, ForkItem } from "../common/forks";
import BaseService from "./base-service";
import { ForkDetectionData } from "../common/fork-detection-data";
import { fork } from "cluster";

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

    public async getForksThatMatchWithSomePartOfForkDetectionData(forkDetectionData: string, guessedMiner: string) : Promise<Fork[]>{

        let forkDetectionDataObject = new ForkDetectionData(forkDetectionData);

        const matchEntireForkDetectionData : Fork[] = await this.store.getCollection().find({
                        "firstDetected.prefixHash": forkDetectionDataObject.prefixHash,
                        "firstDetected.CPV": forkDetectionDataObject.CPV,
                        "firstDetected.NU": forkDetectionDataObject.NU,
                        "firstDetected.BN": forkDetectionDataObject.BN})
                        .toArray();

        const matchJustPrefixHash : Fork[] = await this.store.getCollection().find({"firstDetected.prefixHash": forkDetectionDataObject.prefixHash}).toArray();

        const matchTheRest : Fork[] = await this.store.getCollection().find({
                        "firstDetected.CPV": forkDetectionDataObject.CPV,
                        "firstDetected.NU": forkDetectionDataObject.NU,
                        "firstDetected.BN": forkDetectionDataObject.BN})
                        .toArray();
        
        let concatAllData = matchEntireForkDetectionData.concat(matchJustPrefixHash.filter(x => matchEntireForkDetectionData.some(y => y.firstDetected.toString() == x.firstDetected.toString())));

        concatAllData = concatAllData.concat(concatAllData.filter(x => matchTheRest.some(y => y.firstDetected.toString() == x.firstDetected.toString())));

        return concatAllData;
    }
}
    