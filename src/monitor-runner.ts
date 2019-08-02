import { MainConfig } from './config/main-config';
import { MongoStore } from "./storage/mongo-store";
import { getLogger } from 'log4js';
import { BranchService } from './services/branch-service';
import { BtcWatcher } from './services/btc-watcher';
import { RskApi, RskApiService } from './services/rsk-api-service';
import { ForkDetector } from './services/fork-detector';
import { HttpBtcApi } from './services/btc-api';

class MonitorRunner {
    private DEFAULT_CONFIG_PATH = './config.json';
    private mainConfig: MainConfig;
    private branchService: BranchService;
    private btcWatcher: BtcWatcher;
    private rskApiService: RskApi;
    private logger;
    private forkDetector: ForkDetector;

    constructor() {
        this.mainConfig = MainConfig.getMainConfig(this.DEFAULT_CONFIG_PATH);
        let mongoStore = new MongoStore(this.mainConfig.store.branches);
        this.branchService = new BranchService(mongoStore);
        this.btcWatcher = new BtcWatcher(new HttpBtcApi(this.mainConfig.btcApi));
        this.rskApiService = new RskApiService(this.mainConfig.rskApi);
        this.forkDetector = new ForkDetector(this.branchService, this.btcWatcher, this.rskApiService);
        this.logger = getLogger("monitor-runner.ts");
    }

    public async stop() : Promise<void> {
        this.logger.info("Stopping monitor");

        this.forkDetector.stop();
    }

    public async start() : Promise<void> {
        this.logger.info("Starting monitor");

        let that = this;

        this.branchService.connect().then(function () {
            that.forkDetector.start();
        });
    }
}

const monitor = new MonitorRunner();

process.on('SIGINT', async () => {
    await monitor.stop();
});

monitor.start();
