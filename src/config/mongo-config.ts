
export class MongoConfig {
    public host: string;
    public port: string;
    public databaseName: string;
    public collectionName: string;

    public constructor(host: string, port: string, databaseName: string, collectionName: string) {
        this.host = host;
        this.port = port;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }
}