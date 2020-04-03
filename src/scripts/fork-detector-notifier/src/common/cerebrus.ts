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
    private alertSender: AlertSender;
    private logger: Logger;
    private lastBtcHeightLastTagFound: number[];
    private forkInfoBuilder: ForkInformationBuilder;
    private defconLevels: DefconLevel[];
    
    constructor(config: CerebrusConfig, alertSender: AlertSender, forkInfoBuilder: ForkInformationBuilder,
                defconLevels: DefconLevel[]) {
        this.logger = getLogger('cerebrus');
        this.config = config;
        this.alertSender = alertSender;
        this.forkInfoBuilder = forkInfoBuilder;
        this.defconLevels = defconLevels;

        this.lastBtcHeightLastTagFound = [];
    }

    public async processForks(forks: Fork[]) : Promise<void> {
        if (!this.shouldNotify(forks)) {
            this.logger.info('No forks to notify');
            return;
        }

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

    private findActiveDefconLevel(forkInfo: ForkInformation) : DefconLevel {
        // filter, order and return the highest level available
        return this.defconLevels
            .filter(level => level.activeFor(forkInfo))
            .sort((a, b) => a.getLevel() - b.getLevel())
            .shift();
    }
}