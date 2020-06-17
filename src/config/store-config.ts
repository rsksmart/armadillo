import { MongoConfig, AuthConfig } from './mongo-config';

export class StoreConfig {

    //rename forkdataDetection 
    public readonly forks: MongoConfig;
    public readonly mainchain: MongoConfig;
    public readonly btc: MongoConfig;

    public static fromObject(config: any): StoreConfig {
       
        let auth : any = config.auth ? AuthConfig.fromObject(config.auth) : {};

        return new StoreConfig(
            new MongoConfig(auth, config.host, config.port, config.databaseName, config.collections.forks),
            new MongoConfig(auth, config.host, config.port, config.databaseName, config.collections.mainchain),
            new MongoConfig(auth, config.host, config.port, config.databaseName, config.collections.btc)
        )
    }

    constructor(forksStorage: MongoConfig, mainchainStorage: MongoConfig, btcStorage: MongoConfig) {
        this.forks = forksStorage;
        this.mainchain = mainchainStorage;
        this.btc = btcStorage;
    }
}