import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlockInfo, RskForkItemInfo } from "../common/rsk-block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";
import { RangeForkInMainchain } from "../common/forks";
import { retry3Times } from "../util/helper";

export class RskApiService {
    private config: RskApiConfig;
    private nod3: any;

    constructor(config: RskApiConfig) {
        this.config = config;

        this.nod3 = new Nod3(
            new Nod3.providers.HttpProvider(this.config.completeUrl)
        );
    }

    public async getBlocksByNumber(height: number): Promise<RskBlockInfo[]> {
        var blocksInfo: any[] = await retry3Times(this.nod3.rsk.getBlocksByNumber, ['0x' + height.toString(16), true]);
        var blocks: RskBlockInfo[] = [];

        for (const blockInfo of blocksInfo) {
            var block = await retry3Times(this.nod3.eth.getBlock, [blockInfo.hash]);
            blocks.push(new RskBlockInfo(block.number, block.hash, block.parentHash, blockInfo.inMainChain, new ForkDetectionData(block.hashForMergedMining)));
        }

        return blocks;
    }

    public async getBestBlock(): Promise<RskBlockInfo> {
        let number: number = await retry3Times(this.nod3.eth.blockNumber);
        let block = await retry3Times(this.nod3.eth.getBlock, [number]);
        return new RskBlockInfo(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    public async getBestBlockHeight(): Promise<number> {
        return await retry3Times(this.nod3.eth.blockNumber);
    }

    public async getBlock(height: number): Promise<RskBlockInfo> {
        let block = await retry3Times(this.nod3.eth.getBlock, [height]);
        return new RskBlockInfo(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    //This method returns the nearest block in rsk blockchain where we thought the fork could have started
    public async getRangeForkWhenItCouldHaveStarted(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo): Promise<RangeForkInMainchain> {
        let startBlock: RskBlockInfo = await this.defineForkStart(forkDetectionData, maxRskHeighCouldMatch);
        let endBlock: RskBlockInfo = await this.defineForkEnd(forkDetectionData, maxRskHeighCouldMatch);

        return new RangeForkInMainchain(startBlock, endBlock);
    }

    private async defineForkStart(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo): Promise<RskBlockInfo> {
        let bytesOverlaps: number = forkDetectionData.getNumberOfOverlapInCPV(maxRskHeighCouldMatch.forkDetectionData.CPV);
        let jumpsBackwards = (7 - bytesOverlaps) * 64;
        let whenWasTheLastCPVChange = Math.floor((maxRskHeighCouldMatch.height - 1) / 64) * 64;
        let heightBackwards =  whenWasTheLastCPVChange - jumpsBackwards;
        let startBlock: RskBlockInfo;
        
        if (bytesOverlaps == 0) {
            //This block could have startart from the begining of the times
            //Range is from the begining of the times up to best block
            startBlock = await this.getBlock(1);
            // This block daesn't have forkDetectionData, 
            // what it comes from RSK node is garbage for this block (Same happends to blocks before activation)
            startBlock.forkDetectionData = null;

            return startBlock;
        }

        if (heightBackwards > maxRskHeighCouldMatch.height) {
            return await this.getBlock(maxRskHeighCouldMatch.height);
        }
        
        return await this.getBlock(heightBackwards);
    }

    private async defineForkEnd(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo): Promise<RskBlockInfo> {
        let bytesOverlaps: number = forkDetectionData.getNumberOfOverlapInCPV(maxRskHeighCouldMatch.forkDetectionData.CPV);
        let jumpsBackwards = (7 - bytesOverlaps) * 64;
        let whenWasTheLastCPVChange = Math.floor((maxRskHeighCouldMatch.height - 1) / 64) * 64;
        let heightWhereForkShouldEnd = whenWasTheLastCPVChange - jumpsBackwards + 64
        
        if (bytesOverlaps == 0) {

            if(this.isFarInTheFuture(forkDetectionData, maxRskHeighCouldMatch)){
                return maxRskHeighCouldMatch;
            }

            //Esto esta mal:
            if(this.isInTheFuture(forkDetectionData, maxRskHeighCouldMatch)){
                return await this.getBlock(heightWhereForkShouldEnd);
            }

            //Is in the pass/present
            return await this.getBlock(heightWhereForkShouldEnd);
        }

        if (maxRskHeighCouldMatch.height > heightWhereForkShouldEnd) {
            return await this.getBlock(heightWhereForkShouldEnd);
        }

        return maxRskHeighCouldMatch;
    }

    private isInTheFuture(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo) {
        return forkDetectionData.BN > maxRskHeighCouldMatch.height;
    }

    private isFarInTheFuture(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo) {
        return this.isInTheFuture(forkDetectionData, maxRskHeighCouldMatch) && this.heightDismatchForTheDistance(forkDetectionData, maxRskHeighCouldMatch);
    }

    private heightDismatchForTheDistance(forkDetectionData: ForkDetectionData, maxRskHeighCouldMatch: RskBlockInfo) {
        return (forkDetectionData.BN - maxRskHeighCouldMatch.height) > 448;
    }
}
