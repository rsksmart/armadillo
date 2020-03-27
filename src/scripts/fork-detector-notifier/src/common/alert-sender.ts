import { Fork } from "../../../../common/forks";
import { CerebrusConfig } from "./cerebrus";
import { Logger, getLogger } from "log4js";
import nodemailer from 'nodemailer';
import { readFileSync } from "fs";
import { ForkInformationEmail as ForkBodyEmail, GuessMinedBlockInfo } from "./model";
import { RskApiService } from "../../../../services/rsk-api-service";

export interface AlertSender {
    sendAlert(fork: Fork): Promise<void>;
}

export class MailAlertSender implements AlertSender {
    private config: CerebrusConfig;
    private rskApiService: RskApiService;
    private logger: Logger;
    
    constructor(config: CerebrusConfig, rskApiService: RskApiService) {
        this.config = config;
        this.logger = getLogger('mail-alert-sender');
        this.rskApiService = rskApiService;
    }

    async sendAlert(fork: Fork): Promise<void> {    
        const options = {
            host: this.config.server,
            auth: {
                user: this.config.user,
                pass: this.config.pass
            }
        };

        let transport = nodemailer.createTransport(options);
        let text = await this.forkBody(fork);
        let info = await transport.sendMail({
            from: this.config.sender,
            to: this.config.recipients,
            subject: this.forkTitle(fork),
            text: text
        });

        this.logger.info(`Sent message: ${info.messageId}`)
    }

    forkTitle(fork: Fork) : string {
        var forkLength = fork.items.length;
        var title : string = forkLength > 1 ? 
            readFileSync("./templates/title/multiple-item-fork.txt").toString() : 
            readFileSync("./templates/title/one-item-fork.txt").toString();
        
        var statingRSKHeight = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    
        title = title.replace('#forkLength', forkLength.toString())
                .replace('#statingRSKHeight', statingRSKHeight.toString())
                .replace('#btcGuessMined', this.getBtcGuessMinedInfo(fork)[0].poolName)
                .replace('#endingRSKHeight', fork.getLastDetected().rskForkInfo.forkDetectionData.BN.toString());
    
        return title;
    }

    getBtcGuessMinedInfo(fork: Fork): GuessMinedBlockInfo[] {
        let btcInfoList: GuessMinedBlockInfo[] = [];

        let minersJustChecked: string[] = [];
        for (var i = 0; i < fork.items.length; i++) {
            let name = fork.items[i].btcInfo.guessedMiner;

            if (!minersJustChecked.some(x => x == name)) {
                let infoMiner = new GuessMinedBlockInfo();
                infoMiner.numberOfBlocksMined = fork.items.filter(x => x.btcInfo.guessedMiner == name).length;
                infoMiner.poolName = name;
                infoMiner.totalPorcentageOfBlocksMined = infoMiner.numberOfBlocksMined / fork.items.length * 100;
                btcInfoList.push(infoMiner);
                minersJustChecked.push(name);
            }
        }

        return btcInfoList;
    }

    async forkBody(fork: Fork): Promise<string> {
        let info: ForkBodyEmail = new ForkBodyEmail();

        info.forkBTCitemsLength = fork.items.length;
        info.forkTime = this.getWhenForkIsHappening(fork);
        info.distanceFirstItemToBestBlock = this.getDistanceToBestBlock(fork);
        info.cpvInfo = await this.getInformationCPVDidNotMatch(fork);
        info.distanceCPVtoPrevJump = await this.getCPVdistanceToPreviousJump(fork);
        info.bestBlockInRskInThatMoment = fork.getFirstDetected().rskForkInfo.rskBestBlockHeight;
        info.rangeWhereForkCouldHaveStarted = fork.mainchainRangeWhereForkCouldHaveStarted;
        info.chainDistance = this.getChainDistance(fork);
        info.btcListHeights = this.getBtcListHeight(fork);
        info.forkLengthRskBlocks = this.getForkLengthInRskBlocks(fork);
        info.btcGuessedMinedInfo = this.getBtcGuessMinedInfo(fork);
        info.btcGuessedMinersNames = fork.items.map(x => x.btcInfo.guessedMiner);
        info.fork = fork;

        return this.body(info);
    }

    getWhenForkIsHappening(fork: Fork): string {
        let forkTime = "PRESENT";
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            forkTime = "FUTURE";
        }
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN < fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            forkTime = "PAST";
        }
    
        return forkTime;
    }

    getDistanceToBestBlock(fork: Fork): number {
        return Math.abs(fork.getFirstDetected().rskForkInfo.forkDetectionData.BN - fork.getFirstDetected().rskForkInfo.rskBestBlockHeight);
    }
    
    async getInformationCPVDidNotMatch(fork: Fork): Promise<any> {
        let heightToFind = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    
        if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
            //Future case
            heightToFind = fork.getFirstDetected().rskForkInfo.rskBestBlockHeight;
        }
    
        var block = await this.rskApiService.getBlock(heightToFind);
        let info: any = {};
        info.bytesMatch = fork.getFirstDetected().rskForkInfo.forkDetectionData.getNumberOfOverlapInCPV(block.forkDetectionData.toString());
    
        //TODO: Do we need more info ?
    
        return info;
    }

    getCPVdistanceToPreviousJump(fork: Fork): number {
        var realForkHeight = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;
        var cpvWhereForkJump = Math.floor((fork.getLastDetected().rskForkInfo.forkDetectionData.BN - 1) / 64) * 64;
        return realForkHeight - cpvWhereForkJump;
    }

    getChainDistance(fork: Fork): string {
        var chainDistance = [];
    
        for (var i = 0; i < fork.items.length; i++) {
            chainDistance.push(Math.abs(fork.items[i].rskForkInfo.forkDetectionData.BN - fork.items[i].rskForkInfo.rskBestBlockHeight))
        }
    
        return chainDistance.toString();
    }

    getBtcListHeight(fork: Fork): number[] {
        var btcHeightList = [];
    
        for (var i = 0; i < fork.items.length; i++) {
            btcHeightList.push(Math.abs(fork.items[i].btcInfo.height));
        }
    
        return btcHeightList;
    }

    getForkLengthInRskBlocks(fork: Fork): number {
        return Math.abs(fork.getFirstDetected().rskForkInfo.forkDetectionData.BN - fork.getLastDetected().rskForkInfo.forkDetectionData.BN);
    }

    body(data: ForkBodyEmail): string {
        let minerListGuess = this.getGuessMinedBlocksList(data.btcGuessedMinedInfo);
        let body : string =  data.forkBTCitemsLength > 1 ? readFileSync("./templates/body/multiple-item-fork.txt").toString() : readFileSync("./templates/body/one-item-fork.txt").toString();
        body = body
                .replace('#forkTime', data.forkTime)
                .replace('#minerMinedFirstItem', data.btcGuessedMinedInfo[0].poolName.toString())
                .replace('#distanceFirstItemToBestBlock', data.distanceFirstItemToBestBlock.toString())
                .replace('#startRangeWhereForkCouldHaveStarted', data.rangeWhereForkCouldHaveStarted.startBlock.height.toString())
                .replace('#endRangeWhereForkCouldHaveStarted', data.rangeWhereForkCouldHaveStarted.endBlock.height.toString())
                .replace('#diferenceInBlocksBetweenEndAndStart',  Math.abs((data.rangeWhereForkCouldHaveStarted.startBlock.height - data.rangeWhereForkCouldHaveStarted.endBlock.height)).toString())
                .replace('#distanceCPVtoPrevJump', data.distanceCPVtoPrevJump.toString())
                .replace('#btcListHeights', data.btcListHeights.join(", "))
                .replace('#forkLengthRskBlocks', data.forkLengthRskBlocks.toString())
                .replace('#forkBTCitemsLength', data.forkBTCitemsLength.toString())
                .replace('#minerListGuess', minerListGuess)
                .replace('#btcGuessedMinedInfo', data.btcGuessedMinersNames.join(" | "))
                .replace('#completeForkData', JSON.stringify(data.fork));
    
        console.log(body)
    
        return body;
    }

    getGuessMinedBlocksList(list: GuessMinedBlockInfo[]): string {
        let minerListInfo: string[] = [];
    
        for (var i = 0; i < list.length; i++) {
            minerListInfo.push(`${list[i].poolName} had mined ${list[i].totalPorcentageOfBlocksMined}% of total fork's blocks (# blocks: ${list[i].numberOfBlocksMined})`);
        }
    
        return minerListInfo.join('\n');
    }
}