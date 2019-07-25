import { MongoConfig } from './mongo-config';

export class StoreConfig {

    //rename forkdataDetection 
    public readonly branches: MongoConfig;

    public static fromObject(config: any): StoreConfig {
        return new StoreConfig(
            new MongoConfig(config.host, config.port, config.databaseName, config.branchStorage.collectionName),
        )
    }

    constructor(branchStorage: MongoConfig) {
        this.branches = branchStorage;
    }
}