import { readFileSync } from "fs";
import { ForkInformation } from "./fork-information-builder";
import { ForkEmail } from "./model";
import { DefconLevel } from "./defcon-level";

export interface ForkEmailBuilder {
    build(fork: ForkInformation, defconLevel: DefconLevel) : Promise<ForkEmail>;
}

export default class ForkEmailBuilderImpl implements ForkEmailBuilder {
    async build(fork: ForkInformation, defconLevel: DefconLevel): Promise<ForkEmail> {
        return {
            subject: await this.buildSubject(fork, defconLevel),
            body: await this.buildBody(fork)
        }
    }

    async buildSubject(info: ForkInformation, defconLevel: DefconLevel) : Promise<string> {
        var forkLength = info.forkBTCitemsLength;
        const level: string = defconLevel.getName();

        var subject : string = forkLength > 1 ?
            readFileSync(`./templates/subject/${level}-multiple-item-fork.txt`).toString() : 
            readFileSync(`./templates/subject/${level}-one-item-fork.txt`).toString();
        
        var statingRSKHeight = info.fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    
        subject = subject.replace('#forkLength', forkLength.toString())
                .replace('#statingRSKHeight', statingRSKHeight.toString())
                .replace('#btcGuessMined', info.btcGuessedMinedInfo[0].poolName)
                .replace('#endingRSKHeight', info.endingRskHeight.toString());
    
        return subject;
    }

    async buildBody(info: ForkInformation) : Promise<string> {
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
                .replace('#completeForkData', JSON.stringify(info.fork))
                .replace('#nBlocksForBtcHashrateForRskMainchain', info.nBlocksForBtcHashrateForRskMainchain.toString())
                .replace('#btcHashrateForRskMainchain', info.btcHashrateForRskMainchain.toFixed(2))
                .replace('#btcHashrateForRskMainchainDuringFork', info.btcHashrateForRskMainchainDuringFork.toFixed(2))
                .replace('#btcForkBlockPercentageOverMergeMiningBlocks', info.btcForkBlockPercentageOverMergeMiningBlocks.toFixed(2));
        
        return body;
    }
}
