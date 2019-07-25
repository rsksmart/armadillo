
export class RskApiConfig {
    public readonly host: string;
    public readonly port: number;

    public static fromObject(config: any): RskApiConfig {
        return new RskApiConfig(
            config.host,
            config.port,
        );
    }

    constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
    }
}