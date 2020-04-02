import { getLogger, Logger } from "log4js";
import { ArmadilloApi } from "./armadillo-api";
import { Fork } from "../../../../common/forks";
import { AlertSender } from "./alert-sender";
import { ForkInformationBuilder, ForkInformation } from "./fork-information-builder";

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
    private forkInfoBuilder: ForkInformationBuilder;
    
    constructor(config: CerebrusConfig, armadilloApi: ArmadilloApi, alertSender: AlertSender, forkInfoBuilder: ForkInformationBuilder) {
        this.logger = getLogger('cerebrus');
        this.config = config;
        this.armadilloApi = armadilloApi;
        this.alertSender = alertSender;
        this.forkInfoBuilder = forkInfoBuilder;

        this.lastBtcHeightLastTagFound = [];
    }

    async start() : Promise<void> {
        this.logger.info('Starting...');

        while (true) {
            var forks: Fork[] = await this.armadilloApi.getCurrentMainchain(this.config.chainDepth);

            if (this.shouldNotify(forks)) {
                await this.processForks(forks);
            } else {
                this.logger.info("NO Forks detected");
            }

            await this.sleep(this.config.pollIntervalMs);
        }
    }

    private async processForks(forks: Fork[]) : Promise<void> {
        this.logger.info(`Forks detected, sending notifications to ${this.config.recipients.join(', ')}`);

        for (let fork of forks) {
            const forkInfo: ForkInformation = await this.forkInfoBuilder.build(fork);
            await this.alertSender.sendAlert(forkInfo);
        }

        this.lastBtcHeightLastTagFound = forks.map(x => x.getHeightForLastTagFoundInBTC());
    }

    private shouldNotify(forks: Fork[]) : boolean {
        var forkFilted = forks.filter(x => !this.lastBtcHeightLastTagFound.includes(x.getHeightForLastTagFoundInBTC()));

        return forkFilted.length > 0 && forkFilted.some(x => x.items.length >= this.config.minForkLength);
    }

    async sleep(ms) : Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}