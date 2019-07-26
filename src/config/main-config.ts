import { LoggerConfig } from './logger-config';
import { RskApiConfig } from './rsk-api-config';
import { readFileSync } from 'fs';
import { StoreConfig } from './store-config';
import { BtcMonitorConfig } from './btc-monitor-config';

export class MainConfig {
    public configPath: string;
    public readonly logger: LoggerConfig;
    public readonly rskApi: RskApiConfig;
    public readonly btcMonitor: BtcMonitorConfig; 
    public readonly store: StoreConfig;

    public static getMainConfig(configPath: string): MainConfig {

        var mainConfig = MainConfig.fromObject(JSON.parse(readFileSync(configPath).toString()));

        mainConfig.configPath = configPath;

        return mainConfig;
    }

    public static fromObject(config: any): MainConfig {
        return new MainConfig(
            LoggerConfig.fromObject(config.logger),
            RskApiConfig.fromObject(config.rskApi),
            StoreConfig.fromObject(config.store),
            BtcMonitorConfig.fromObject(config.btcMonitor)
        );
    }

    constructor(logger: LoggerConfig, rskApi: RskApiConfig, store: StoreConfig, btcApi: BtcMonitorConfig) {
        this.logger = logger;
        this.rskApi = rskApi;
        this.store = store;
        this.btcMonitor = btcApi;
    }
}
