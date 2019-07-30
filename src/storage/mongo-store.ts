import { MongoClient, Db, Collection } from 'mongodb';
import { MongoConfig } from '../config/mongo-config';
import { getLogger, Logger } from 'log4js';

export class MongoStore {
    private db: Db;
    private path: string;
    private mongoConfig: MongoConfig
    private mongoClient: MongoClient;
    private isConnected: boolean = false;
    private TRIES: number = 3;
    private messageConnectedWasSend: boolean;
    private logger: Logger;
    private collection: Collection<any>;

    public constructor(mongoConfig: MongoConfig) {
        this.logger = getLogger("mongo-store");
        this.mongoConfig = mongoConfig;
        this.path = "mongodb://" + this.mongoConfig.host + ":" + this.mongoConfig.port + "/" + this.mongoConfig.databaseName;
    }

    public async disconnect(): Promise<void> {
        this.isConnected = false;
        return this.mongoClient.close()
    }

    private sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public getCollection() {
        return this.collection;
    }

    public async connect() {
        await this.tryToConnection();
    }

    public getName(): string {
        return this.mongoConfig.databaseName + ' db';
    }

    private async tryToConnection(): Promise<void> {
        let connectionAttempt = 1;

        while (!this.isConnected && connectionAttempt <= this.TRIES) {
            await this.sleep(2000);
            await this.connectMongo();
            connectionAttempt++;

        }

        if (connectionAttempt > 3) {
            this.logger.debug("mongo db connection FAILED !!");
            process.exit();
        }

        if (this.isConnected && !this.messageConnectedWasSend) {
            this.messageConnectedWasSend = true; //I'm not proud of the use of this value
            this.logger.debug("mongo " + this.mongoConfig.databaseName + " for " + this.mongoConfig.collectionName + " is connected");
        }
    }

    private async connectMongo() {
        if (this.isConnected) {
            return;
        }

        try {
            this.mongoClient = new MongoClient(this.path, { useNewUrlParser: true });
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(this.mongoConfig.databaseName);
            this.collection = this.db.collection(this.mongoConfig.collectionName);
            this.isConnected = true;
        }
        catch (error) {
        }
    }
}
