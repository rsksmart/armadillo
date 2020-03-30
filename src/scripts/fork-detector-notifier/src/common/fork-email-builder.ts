import { Fork, RangeForkInMainchain } from "../../../../common/forks";
import { ForkEmail } from "./model";
import { readFileSync } from "fs";
import { RskApiService } from "../../../../services/rsk-api-service";

export interface ForkEmailBuilder {
    build(fork: Fork) : Promise<ForkEmail>;
}

interface ForkEmailBodyInformation {
    btcGuessedMinersNames: string[];
    forkBTCitemsLength: number;
    forkTime: string;
    distanceFirstItemToBestBlock: number;
    cpvInfo: any;
    distanceCPVtoPrevJump: number;
    bestBlockInRskInThatMoment: number;
    rangeWhereForkCouldHaveStarted: RangeForkInMainchain;
    chainDistance: any;
    btcListHeights: number[];
    forkLengthRskBlocks: number;
    btcGuessedMinedInfo: GuessMinedBlockInfo[];
    minerListGuess: string;
    fork: Fork
}

interface GuessMinedBlockInfo {
    poolName: string;
    totalPorcentageOfBlocksMined: number;
    numberOfBlocksMined: number;
}

export default class ForkEmailBuilderImpl implements ForkEmailBuilder {
    private rskApiService: RskApiService;
    
    constructor(rskApiService: RskApiService) {
        this.rskApiService = rskApiService;
    }

    async build(fork: Fork): Promise<ForkEmail> {
        return {
            subject: await this.buildSubject(fork),
            body: await this.buildBody(fork)
        }
    }

    async buildSubject(fork: Fork) : Promise<string> {
        var forkLength = fork.items.length;
        var subject : string = forkLength > 1 ? 
            readFileSync("./templates/subject/multiple-item-fork.txt").toString() : 
            readFileSync("./templates/subject/one-item-fork.txt").toString();
        
        var statingRSKHeight = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    
        subject = subject.replace('#forkLength', forkLength.toString())
                .replace('#statingRSKHeight', statingRSKHeight.toString())
                .replace('#btcGuessMined', this.getBtcGuessMinedInfo(fork)[0].poolName)
                .replace('#endingRSKHeight', fork.getLastDetected().rskForkInfo.forkDetectionData.BN.toString());
    
        return subject;
    }

    getBtcGuessMinedInfo(fork: Fork): GuessMinedBlockInfo[] {
        let btcInfoList: GuessMinedBlockInfo[] = [];

        let minersJustChecked: string[] = [];
        for (var i = 0; i < fork.items.length; i++) {
            let name = fork.items[i].btcInfo.guessedMiner;

            if (!minersJustChecked.some(x => x == name)) {
                const numberOfBlocksMined = fork.items.filter(x => x.btcInfo.guessedMiner == name).length;
                
                let infoMiner: GuessMinedBlockInfo = {
                    numberOfBlocksMined: numberOfBlocksMined,
                    poolName: name,
                    totalPorcentageOfBlocksMined: numberOfBlocksMined / fork.items.length * 100
                }
                btcInfoList.push(infoMiner);
                minersJustChecked.push(name);
            }
        }

        return btcInfoList;
    }

    async buildBody(fork: Fork) : Promise<string> {
        const info: ForkEmailBodyInformation = await this.buildBodyInformation(fork);
        
        const template : string =  info.forkBTCitemsLength > 1 ? readFileSync("./templates/body/multiple-item-fork.txt").toString() : readFileSync("./templates/body/one-item-fork.txt").toString();

        const body: string = template
                .replace('#forkTime', info.forkTime)
                .replace('#minerMinedFirstItem', info.btcGuessedMinedInfo[0].poolName.toString())
                .replace('#distanceFirstItemToBestBlock', info.distanceFirstItemToBestBlock.toString())
                .replace('#startRangeWhereForkCouldHaveStarted', info.rangeWhereForkCouldHaveStarted.startBlock.height.toString())
                .replace('#endRangeWhereForkCouldHaveStarted', info.rangeWhereForkCouldHaveStarted.endBlock.height.toString())
                .replace('#diferenceInBlocksBetweenEndAndStart',  Math.abs((info.rangeWhereForkCouldHaveStarted.startBlock.height - info.rangeWhereForkCouldHaveStarted.endBlock.height)).toString())
                .replace('#distanceCPVtoPrevJump', info.distanceCPVtoPrevJump.toString())
                .replace('#btcListHeights', info.btcListHeights.join(", "))
                .replace('#forkLengthRskBlocks', info.forkLengthRskBlocks.toString())
                .replace('#forkBTCitemsLength', info.forkBTCitemsLength.toString())
                .replace('#minerListGuess', info.minerListGuess)
                .replace('#btcGuessedMinedInfo', info.btcGuessedMinersNames.join(" | "))
                .replace('#completeForkData', JSON.stringify(info.fork));
        
        return body;
    }

    async buildBodyInformation(fork: Fork) : Promise<ForkEmailBodyInformation> {
        const btcGuessedMinedInfo = this.getBtcGuessMinedInfo(fork);

        let info: ForkEmailBodyInformation = {
            forkBTCitemsLength: fork.items.length,
            forkTime: this.getWhenForkIsHappening(fork),
            distanceFirstItemToBestBlock: this.getDistanceToBestBlock(fork),
            cpvInfo: await this.getInformationCPVDidNotMatch(fork),
            distanceCPVtoPrevJump: await this.getCPVdistanceToPreviousJump(fork),
            bestBlockInRskInThatMoment: fork.getFirstDetected().rskForkInfo.rskBestBlockHeight,
            rangeWhereForkCouldHaveStarted: fork.mainchainRangeWhereForkCouldHaveStarted,
            chainDistance: this.getChainDistance(fork),
            btcListHeights: this.getBtcListHeight(fork),
            forkLengthRskBlocks: this.getForkLengthInRskBlocks(fork),
            btcGuessedMinedInfo: btcGuessedMinedInfo,
            btcGuessedMinersNames: fork.items.map(x => x.btcInfo.guessedMiner),
            minerListGuess: this.getGuessMinedBlocksList(btcGuessedMinedInfo),
            fork: fork
        }

        return info;
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

    getGuessMinedBlocksList(list: GuessMinedBlockInfo[]): string {
        let minerListInfo: string[] = [];
    
        for (var i = 0; i < list.length; i++) {
            minerListInfo.push(`${list[i].poolName} had mined ${list[i].totalPorcentageOfBlocksMined}% of total fork's blocks (# blocks: ${list[i].numberOfBlocksMined})`);
        }
    
        return minerListInfo.join('\n');
    }
}
