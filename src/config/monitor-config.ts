import { LoggerConfig } from './logger-config';
import { RskApiConfig } from './rsk-api-config';
import { readFileSync } from 'fs';
import { StoreConfig } from './store-config';
import { BtcApiConfig } from './btc-api-config';
import { ForkApiConfig } from './fork-api-config';

export class MonitorConfig {
    public configPath: string;
    public readonly logger: LoggerConfig;
    public readonly rskApi: RskApiConfig;
    public readonly btcApi: BtcApiConfig;
    public readonly store: StoreConfig;
    public readonly forkApi: ForkApiConfig;

    public static getMainConfig(configPath: string): MonitorConfig {

        var mainConfig = MonitorConfig.fromObject(JSON.parse(readFileSync(configPath).toString()));

        mainConfig.configPath = configPath;

        return mainConfig;
    }

    public static fromObject(config: any): MonitorConfig {
        return new MonitorConfig(
            LoggerConfig.fromObject(config.logger.monitor),
            RskApiConfig.fromObject(config.rskApi),
            StoreConfig.fromObject(config.store),
            BtcApiConfig.fromObject(config.btcApi),
            ForkApiConfig.fromObject(config.forkApi),
        );
    }

    constructor(logger: LoggerConfig, rskApi: RskApiConfig, store: StoreConfig, btcApi: BtcApiConfig, forkApi: ForkApiConfig) {
        this.logger = logger;
        this.rskApi = rskApi;
        this.store = store;
        this.btcApi = btcApi;
        this.forkApi = forkApi;
    }
}
