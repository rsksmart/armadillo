import { getLogger, Logger } from "log4js";
import { ArmadilloApi } from "./armadillo-api";
import { Fork } from "../../../../common/forks";
import { AlertSender } from "./alert-sender";

export interface CerebrusConfig {
    chainDepth: number;
    recipients: string[];
    pollIntervalMs: number;
    minForkLength: number;
    server: string;
    user: string;
    pass: string;
    sender: string;
    armadilloUrl: string;
    rskNodeUrl: string;
    nBlocksForBtcHashrateForRskMainchain: number;
}

export class Cerebrus {
    private config: CerebrusConfig;
    private armadilloApi: ArmadilloApi;
    private alertSender: AlertSender;
    private logger: Logger;
    private lastBtcHeightLastTagFound: number[];
    
    constructor(config: CerebrusConfig, armadilloApi: ArmadilloApi, alertSender: AlertSender) {
        this.logger = getLogger('cerebrus');
        this.config = config;
        this.armadilloApi = armadilloApi;
        this.alertSender = alertSender;
        this.lastBtcHeightLastTagFound = [];
    }

    async start() : Promise<void> {
        this.logger.info('Starting...');

        while (true) {
            var forks: Fork[] = await this.armadilloApi.getCurrentMainchain(this.config.chainDepth);

            if (this.shouldNotify(forks)) {
                this.logger.info(`Forks detected, sending notifications to ${this.config.recipients.join(', ')}`);

                for (var i = 0; i < forks.length; i++) {
                    let forkToSend = forks[i];
                    this.alertSender.sendAlert(forkToSend);
                }

                this.lastBtcHeightLastTagFound = forks.map(x => x.getHeightForLastTagFoundInBTC());
            } else {
                this.logger.info("NO Forks detected");
            }

            await this.sleep(this.config.pollIntervalMs);
        }
    }

    private shouldNotify(forks: Fork[]) : boolean {
        var forkFilted = forks.filter(x => !this.lastBtcHeightLastTagFound.includes(x.getHeightForLastTagFoundInBTC()));

        return forkFilted.length > 0 && forkFilted.some(x => x.items.length >= this.config.minForkLength);
    }

    async sleep(ms) : Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}