
export class MongoConfig {
    public user: string;
    public password: string;
    public host: string;
    public port: string;
    public databaseName: string;
    public collectionName: string;

    public constructor(user: string, password: string, host: string, port: string, databaseName: string, collectionName: string) {
        this.user = user;
        this.password = password;
        this.host = host;
        this.port = port;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }
}