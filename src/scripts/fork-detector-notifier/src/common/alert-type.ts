import { Fork } from "../../../../common/forks";
import { ForkInformation } from "./fork-information-builder";
import { DefconLevel } from "./defcon-level";
import { readFileSync } from "fs";

export interface Alert {
    getBody() : string;
    getSubject() : string;
}

export class DefconAlert implements Alert{
    private readonly TEMPLATES_BASE_PATH = './templates';
    private forkInfo: ForkInformation
    private level: DefconLevel;
    
    constructor(forkInfo: ForkInformation, level: DefconLevel) {
        this.forkInfo = forkInfo;
        this.level = level;
    }

    public getSubject(): string {
        var forkLength = this.forkInfo.forkBTCitemsLength;
        const defconLevelName: string = this.level.getName();

        //given a for we have to know if a fork is repetead.

        var subject : string = forkLength > 1 ?
            readFileSync(`${this.TEMPLATES_BASE_PATH}/subject/${defconLevelName}-multiple-item-fork.txt`).toString() :
            readFileSync(`${this.TEMPLATES_BASE_PATH}/subject/${defconLevelName}-one-item-fork.txt`).toString();

        return this.replaceKeys(subject, this.forkInfo);
    }

    public getBody(): string {
         const template : string =  this.forkInfo.forkBTCitemsLength > 1 ?
            readFileSync(`${this.TEMPLATES_BASE_PATH}/body/multiple-item-fork.txt`).toString() :
            readFileSync(`${this.TEMPLATES_BASE_PATH}/body/one-item-fork.txt`).toString();

        return this.replaceKeys(template, this.forkInfo);
    }

    private replaceKeys(template: string, info: ForkInformation) : string {
        const startingRskHeight: number = info.fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
        const startingBtcHeight: number = info.fork.getFirstDetected().btcInfo.height;
        const endingBtcHeight: number = info.fork.getLastDetected().btcInfo.height;

        return template
                .replace('#forkTime', info.forkTime)
                .replace('#btcGuessMined', info.btcGuessedMinedInfo[0].poolName)
                .replace('#startingRskHeight', startingRskHeight.toString())
                .replace('#endingRskHeight', info.endingRskHeight.toString())
                .replace('#startingBtcHeight', startingBtcHeight.toString())
                .replace('#endingBtcHeight', endingBtcHeight.toString())
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
                .replace('#completeForkData', JSON.stringify(info.fork))
                .replace('#nBlocksForBtcHashrateForRskMainchain', info.nBlocksForBtcHashrateForRskMainchain.toString())
                .replace('#btcHashrateForRskMainchain', info.btcHashrateForRskMainchain.toFixed(2))
                .replace('#btcHashrateForRskMainchainDuringFork', info.btcHashrateForRskMainchainDuringFork.toFixed(2))
                .replace('#btcForkBlockPercentageOverMergeMiningBlocks', info.btcForkBlockPercentageOverMergeMiningBlocks.toFixed(2))
                .replace('#estimatedTimeFor4000Blocks', 
                    info.estimatedTimeFor4000Blocks.toString() === 'Invalid Date' ? 
                        'Not enough items to perform an estimation with' :
                        info.estimatedTimeFor4000Blocks.toString());
    }
}

export class RepeatedForkAlert implements Alert {
    private readonly TEMPLATES_BASE_PATH = './templates';
    private forkInfo: ForkInformation;

    constructor(forkInfo: ForkInformation) {
        this.forkInfo = forkInfo;
    }

    public getSubject(): string {
        var subject : string = readFileSync(`${this.TEMPLATES_BASE_PATH}/subject/repeated-fork.txt`).toString();

        return this.replaceKeys(subject, this.forkInfo);
    }

    public getBody(): string {
        const template : string = readFileSync(`${this.TEMPLATES_BASE_PATH}/body/repeated-fork.txt`).toString();

        return this.replaceKeys(template, this.forkInfo);
    }

    private replaceKeys(template: string, info: ForkInformation) : string {
        const startingRskHeight: number = info.fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
        const startingBtcHeight: number = info.fork.getFirstDetected().btcInfo.height;
        const endingBtcHeight: number = info.fork.getLastDetected().btcInfo.height;

        return template
                .replace('#forkTime', info.forkTime)
                .replace('#btcGuessMined', info.btcGuessedMinedInfo[0].poolName)
                .replace('#startingRskHeight', startingRskHeight.toString())
                .replace('#endingRskHeight', info.endingRskHeight.toString())
                .replace('#startingBtcHeight', startingBtcHeight.toString())
                .replace('#endingBtcHeight', endingBtcHeight.toString())
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
                .replace('#completeForkData', JSON.stringify(info.fork))
                .replace('#nBlocksForBtcHashrateForRskMainchain', info.nBlocksForBtcHashrateForRskMainchain.toString())
                .replace('#btcHashrateForRskMainchain', info.btcHashrateForRskMainchain.toFixed(2))
                .replace('#btcHashrateForRskMainchainDuringFork', info.btcHashrateForRskMainchainDuringFork.toFixed(2))
                .replace('#btcForkBlockPercentageOverMergeMiningBlocks', info.btcForkBlockPercentageOverMergeMiningBlocks.toFixed(2))
                .replace('#estimatedTimeFor4000Blocks', 
                    info.estimatedTimeFor4000Blocks.toString() === 'Invalid Date' ? 
                        'Not enough items to perform an estimation with' :
                        info.estimatedTimeFor4000Blocks.toString());
    }
}