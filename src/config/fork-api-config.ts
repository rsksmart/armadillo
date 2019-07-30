export class ForkApiConfig
 {
    public PORT : string;

    public static fromObject(config: any): ForkApiConfig {
        return new ForkApiConfig(config.port);
    }
    
    constructor(port: string) {
        this.PORT = port;
    }
}
