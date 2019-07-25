export class BtcApiConfig {
    public PORT : string;
    public openApiForTesting : boolean;

    public static fromObject(config: any): BtcApiConfig {
        return new BtcApiConfig(config.port, config.openApiForTesting);
    }
    
    constructor(port: string, openApiForTesting: boolean) {
        this.PORT = port;
        this.openApiForTesting = openApiForTesting;
    }
}
