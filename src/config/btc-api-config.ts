export class BtcApiConfig {
    public PORT : string;
    public HOST : string;

    public static fromObject(config: any): BtcApiConfig {
        return new BtcApiConfig(config.host, config.port);
    }
    
    constructor(host: string, port: string) {
        this.HOST = host;
        this.PORT = port;
    }
}
