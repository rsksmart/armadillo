import { MongoConfig } from './mongo-config';

export class StoreConfig {

    //rename forkdataDetection 
    public readonly branches: MongoConfig;

    public static fromObject(config: any): StoreConfig {
        return new StoreConfig(
            new MongoConfig(config.host, config.port, config.databaseName, config.blockStorage.collectionName),
        )
    }

    constructor(blockStorage: MongoConfig) {
        this.branches = blockStorage;
    }
}