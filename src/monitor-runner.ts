import { MainConfig } from './config/main-config';
import { MongoStore } from "./storage/mongo-store";
import { getLogger } from 'log4js';
import { BranchService } from './services/branch-service';
import { BtcMonitor } from './services/btc-monitor';
import { RskApiService } from './services/rsk-api-service';


export class MonitorRunner {

    private DEFAULT_CONFIG_PATH = './config.json';
    private mainConfig: MainConfig;
    private branchService: BranchService;
    private btcMonitor: BtcMonitor;
    private rskApiService: RskApiService;
    private logger;

    constructor() {
        this.mainConfig = MainConfig.getMainConfig(this.DEFAULT_CONFIG_PATH);
        this.branchService = new BranchService(new MongoStore(this.mainConfig.store.branches));
        this.btcMonitor = new BtcMonitor(this.mainConfig.btcMonitor);
        this.rskApiService = new RskApiService(this.mainConfig.rskApi);
        this.logger = getLogger("daemon-runner.ts");

        this.run();

        process.on('SIGINT', async () => {
            await this.stop();
        });
    }

    public stop(){
        this.logger.debug("STOP Connections!!!");
        this.btcMonitor.stop();
        this.rskApiService.disconnect();
        this.branchService.disconnect();
    }

    public async run(): Promise<void> {
        this.btcMonitor.run();
        this.rskApiService.connect();
        this.branchService.connect();
    }
}

new MonitorRunner();