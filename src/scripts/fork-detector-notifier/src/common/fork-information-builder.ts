import { Fork, Item, RangeForkInMainchain } from "../../../../common/forks";
import { RskApiService } from "../../../../services/rsk-api-service";
import { ArmadilloApi } from "./armadillo-api";
import { CerebrusConfig } from "./cerebrus";

export interface ForkInformation {
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
    fork: Fork;
    nBlocksForBtcHashrateForRskMainchain: number;
    btcHashrateForRskMainchain: number;
    btcHashrateForRskMainchainDuringFork: number;
    endingRskHeight: number;
    btcForkBlockPercentageOverMergeMiningBlocks: number;
}

export interface GuessMinedBlockInfo {
    poolName: string;
    totalPorcentageOfBlocksMined: number;
    numberOfBlocksMined: number;
}

export interface ForkInformationBuilder {
    build(fork: Fork) : Promise<ForkInformation>;
}

export class ForkInformationBuilderImpl implements ForkInformationBuilder {
    private rskApiService: RskApiService;
    private armadilloApi: ArmadilloApi;
    private cerebrusConfig: CerebrusConfig;
    
    private readonly BTC_TO_RSK_AVERAGE_RATIO = 20;

    constructor(rskApiService: RskApiService, armadilloApi: ArmadilloApi, cerebrusConfig: CerebrusConfig) {
        this.rskApiService = rskApiService;
        this.armadilloApi = armadilloApi;
        this.cerebrusConfig = cerebrusConfig;
    }

    async build(fork: Fork): Promise<ForkInformation> {
        const btcGuessedMinedInfo = this.getBtcGuessMinedInfo(fork);

        let info: ForkInformation = {
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
            fork: fork,
            nBlocksForBtcHashrateForRskMainchain: this.cerebrusConfig.nBlocksForBtcHashrateForRskMainchain,
            btcHashrateForRskMainchain: await this.getBtcMainchainHashrate(fork),
            btcHashrateForRskMainchainDuringFork: await this.getBtcMainchainHashrateDuringFork(fork),
            endingRskHeight: fork.getLastDetected().rskForkInfo.forkDetectionData.BN,
            btcForkBlockPercentageOverMergeMiningBlocks: await this.getBtcForkBlockPercentageOverMergeMiningBlocks(fork)
        }

        return info;
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

    async getBtcMainchainHashrate(fork: Fork) : Promise<number> {
        const blocksToAccountFor: number = this.cerebrusConfig.nBlocksForBtcHashrateForRskMainchain;

        const end: number = fork.getHeightForLastTagFoundInBTC();
        const start: number = end - blocksToAccountFor;

        const items: Item[] = await this.armadilloApi.getLastBtcBlocksBetweenHeight(start, end);

        return items.length / blocksToAccountFor;
    }

    async getBtcMainchainHashrateDuringFork(fork: Fork) : Promise<number> {
        // earliest possible start of the fork
        const start: number = fork.mainchainRangeWhereForkCouldHaveStarted.startBlock.height;
        // height of the fork's last rsk block not found in rsk
        const end: number = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;

        const items: Item[] = await this.armadilloApi.getBtcBlocksBetweenRskHeight(start, end);

        // average number of rsk blocks for each btc block is 20 on average
        const expectedBtcBlocks: number = (end - start) / this.BTC_TO_RSK_AVERAGE_RATIO;

        return items.length / expectedBtcBlocks;
    }

    async getBtcForkBlockPercentageOverMergeMiningBlocks(fork: Fork) : Promise<number> {
        const rangeStart: number = fork.mainchainRangeWhereForkCouldHaveStarted.startBlock.height;
        const rangeEnd: number = fork.mainchainRangeWhereForkCouldHaveStarted.endBlock.height;
        const lastDetectedHeight: number = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;

        // take the end height when the range is too big (no CPV matches)
        let start: number = rangeStart;
        if ((rangeEnd - rangeStart) > 448) {
            start = rangeEnd;
        }

        const honestBlocks: Item[] = await this.armadilloApi.getBtcBlocksBetweenRskHeight(start, lastDetectedHeight);

        const attackerBlockCount: number = fork.items.length;
        const honestBlockCount: number = honestBlocks.length;

        return attackerBlockCount / (attackerBlockCount + honestBlockCount);
    }
}