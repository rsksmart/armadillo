import { getLogger, Logger } from "log4js";
import { ArmadilloApi } from "./armadillo-api";
import { Fork } from "../../../../common/forks";
import { AlertSender } from "./alert-sender";
import { ForkInformationBuilder, ForkInformation } from "./fork-information-builder";
import { DefconLevel } from "./defcon-level";

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
    private defconLevels: DefconLevel[];
    
    constructor(config: CerebrusConfig, armadilloApi: ArmadilloApi, alertSender: AlertSender, forkInfoBuilder: ForkInformationBuilder,
                defconLevels: DefconLevel[]) {
        this.logger = getLogger('cerebrus');
        this.config = config;
        this.armadilloApi = armadilloApi;
        this.alertSender = alertSender;
        this.forkInfoBuilder = forkInfoBuilder;
        this.defconLevels = defconLevels;

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
            const defconLevel: DefconLevel = this.findActiveDefconLevel(forkInfo);
            await this.alertSender.sendAlert(forkInfo, defconLevel);
        }

        this.lastBtcHeightLastTagFound = forks.map(x => x.getHeightForLastTagFoundInBTC());
    }

    private shouldNotify(forks: Fork[]) : boolean {
        var forkFilted = forks.filter(x => !this.lastBtcHeightLastTagFound.includes(x.getHeightForLastTagFoundInBTC()));

        return forkFilted.length > 0 && forkFilted.some(x => x.items.length >= this.config.minForkLength);
    }

    private async sleep(ms) : Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private findActiveDefconLevel(forkInfo: ForkInformation) : DefconLevel {
        // filter, order and return the highest level available
        return this.defconLevels
            .filter(level => level.activeFor(forkInfo))
            .sort((a, b) => a.getLevel() - b.getLevel())
            .shift();
    }
}