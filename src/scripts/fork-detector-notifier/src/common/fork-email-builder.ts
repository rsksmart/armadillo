import { readFileSync } from "fs";
import { ForkInformation } from "./fork-information-builder";
import { ForkEmail } from "./model";
import { DefconLevel } from "./defcon-level";

export interface ForkEmailBuilder {
    build(fork: ForkInformation, defconLevel: DefconLevel) : Promise<ForkEmail>;
}

export default class ForkEmailBuilderImpl implements ForkEmailBuilder {
    private readonly TEMPLATES_BASE_PATH = './templates';

    async build(fork: ForkInformation, defconLevel: DefconLevel): Promise<ForkEmail> {
        return {
            subject: await this.buildSubject(fork, defconLevel),
            body: await this.buildBody(fork)
        }
    }

    async buildSubject(info: ForkInformation, defconLevel: DefconLevel) : Promise<string> {
        var forkLength = info.forkBTCitemsLength;
        const defconLevelName: string = defconLevel.getName();

        //given a for we have to know if a fork is repetead.

        var subject : string = forkLength > 1 ?
            readFileSync(`${this.TEMPLATES_BASE_PATH}/subject/${defconLevelName}-multiple-item-fork.txt`).toString() :
            readFileSync(`${this.TEMPLATES_BASE_PATH}/subject/${defconLevelName}-one-item-fork.txt`).toString();

        return this.replaceKeys(subject, info);
    }

    async buildBody(info: ForkInformation) : Promise<string> {
        const template : string =  info.forkBTCitemsLength > 1 ?
            readFileSync(`${this.TEMPLATES_BASE_PATH}/body/multiple-item-fork.txt`).toString() :
            readFileSync(`${this.TEMPLATES_BASE_PATH}/body/one-item-fork.txt`).toString();

        return this.replaceKeys(template, info);
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
