import { MongoStore } from "./storage/mongo-store";
import { getLogger } from 'log4js';
import { MainchainService } from './services/mainchain-service';
import { BtcWatcher } from './services/btc-watcher';
import { RskApiService } from './services/rsk-api-service';
import { ForkDetector } from './services/fork-detector';
import { ForkService } from './services/fork-service';
import { MonitorConfig } from "./config/monitor-config";
import { HttpBtcApi } from "./services/btc-api";
import { BtcService } from "./services/btc-service";

class MonitorRunner {
    private DEFAULT_CONFIG_PATH = './config.json';
    private monitorConfig: MonitorConfig;
    private forkService: ForkService;
    private mainchainService: MainchainService;
    private btcService: BtcService;
    private btcWatcher: BtcWatcher;
    private rskApiService: RskApiService;
    private logger;
    private forkDetector: ForkDetector;

    constructor() {
        this.monitorConfig = MonitorConfig.getMainConfig(this.DEFAULT_CONFIG_PATH);
        let mongoForksStore = new MongoStore(this.monitorConfig.store.forks);
        let mongoMainchainStore = new MongoStore(this.monitorConfig.store.mainchain);
        let mongoBtcStore = new MongoStore(this.monitorConfig.store.btc);
        this.forkService = new ForkService(mongoForksStore);
        this.mainchainService = new MainchainService(mongoMainchainStore);
        this.btcService = new BtcService(mongoBtcStore);
        this.btcWatcher = new BtcWatcher(new HttpBtcApi(this.monitorConfig.btcApi), this.btcService, this.monitorConfig.rskApi.lastBtcBlockDetectedCheckpoint);
        this.rskApiService = new RskApiService(this.monitorConfig.rskApi);
        this.forkDetector = new ForkDetector(this.forkService, this.mainchainService, this.btcWatcher, this.rskApiService, this.monitorConfig.forkDetector);
        this.logger = getLogger("monitor-runner.ts");
    }

    public async stop() : Promise<void> {
        this.logger.info("Stopping monitor");
        this.forkDetector.stop();
        this.forkService.disconnect();
        this.mainchainService.disconnect();
        this.btcService.disconnect();
    }

    public async start() : Promise<void> {
        this.logger.info("Starting monitor");
        await this.forkService.connect();
        await this.mainchainService.connect();
        await this.btcService.connect();
        await this.forkDetector.start();
    }
}

const monitor = new MonitorRunner();

process.on('SIGINT', async () => {
    await monitor.stop();
});

monitor.start();
