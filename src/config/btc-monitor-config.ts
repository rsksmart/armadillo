export class BtcMonitorConfig
 {
    public PORT : string;
    public HOST : string;

    public static fromObject(config: any): BtcMonitorConfig {
        return new BtcMonitorConfig(config.host, config.port);
    }
    
    constructor(host: string, port: string) {
        this.HOST = host;
        this.PORT = port;
    }
}
