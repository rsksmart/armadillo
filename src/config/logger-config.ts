import { configure, getLogger, Logger} from 'log4js';

export class LoggerConfig {
    public readonly configPath: string;
    public readonly log : Logger;

    public static fromObject(config: any): LoggerConfig {
        return new LoggerConfig(config.configFile);
    }
    
    constructor(configFile: string) {

        configure(configFile);
        
        this.log = getLogger("main.ts");
    }
}
