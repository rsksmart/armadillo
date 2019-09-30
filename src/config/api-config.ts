import { LoggerConfig } from './logger-config';
import { readFileSync } from 'fs';
import { StoreConfig } from './store-config';
import { ForkApiConfig } from './fork-api-config';

export class ApiConfig {
    public configPath: string;
    public readonly logger: LoggerConfig;
    public readonly forkApi: ForkApiConfig;
    public readonly store: StoreConfig;

    public static getMainConfig(configPath: string): ApiConfig {

        var mainConfig = ApiConfig.fromObject(JSON.parse(readFileSync(configPath).toString()));

        mainConfig.configPath = configPath;

        return mainConfig;
    }

    public static fromObject(config: any): ApiConfig {
        return new ApiConfig(
            LoggerConfig.fromObject(config.logger.api),
            ForkApiConfig.fromObject(config.forkApi),
            StoreConfig.fromObject(config.store)
        );
    }

    constructor(logger: LoggerConfig, forkApi: ForkApiConfig, store: StoreConfig) {
        this.logger = logger;
        this.forkApi = forkApi;
        this.store = store;
    }
}
