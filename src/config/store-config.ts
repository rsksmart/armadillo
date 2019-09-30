import { MongoConfig } from './mongo-config';

export class StoreConfig {

    //rename forkdataDetection 
    public readonly branches: MongoConfig;
    public readonly mainchain: MongoConfig;
    public readonly btc: MongoConfig;

    public static fromObject(config: any): StoreConfig {
        return new StoreConfig(
            new MongoConfig(config.host, config.port, config.databaseName, config.collections.branches),
            new MongoConfig(config.host, config.port, config.databaseName, config.collections.mainchain),
            new MongoConfig(config.host, config.port, config.databaseName, config.collections.btc)
        )
    }

    constructor(branchStorage: MongoConfig, mainchainStorage: MongoConfig, btcStorage: MongoConfig) {
        this.branches = branchStorage;
        this.mainchain = mainchainStorage;
        this.btc = btcStorage;
    }
}