
export class RskApiConfig {
    public readonly completeUrl: string;

    public static fromObject(config: any): RskApiConfig {
        return new RskApiConfig(
            config.completeUrl
        );
    }

    constructor(completeUrl: string) {
        this.completeUrl = completeUrl;
    }
}