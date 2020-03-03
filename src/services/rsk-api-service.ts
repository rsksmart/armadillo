import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlock } from "../common/rsk-block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";
import { RangeForkInMainchain } from "../common/branch";
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

    public async getBlocksByNumber(height: number): Promise<RskBlock[]> {
        var blocksInfo: any[] = await retry3Times(this.nod3.rsk.getBlocksByNumber, ['0x' + height.toString(16), true]);
        var blocks: RskBlock[] = [];

        for (const blockInfo of blocksInfo) {
            var block = await retry3Times(this.nod3.eth.getBlock, [blockInfo.hash]);
            blocks.push(new RskBlock(block.number, block.hash, block.parentHash, blockInfo.inMainChain, new ForkDetectionData(block.hashForMergedMining)));
        }

        return blocks;
    }

    public async getBestBlock(): Promise<RskBlock> {
        let number: number = await retry3Times(this.nod3.eth.blockNumber);
        let block = await retry3Times(this.nod3.eth.getBlock, [number]);
        return new RskBlock(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    public async getBestBlockHeight(): Promise<number> {
        return await retry3Times(this.nod3.eth.blockNumber);
    }

    public async getBlock(height: number): Promise<RskBlock> {
        let block = await retry3Times(this.nod3.eth.getBlock, [height]);
        return new RskBlock(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    //This method returns the nearest block in rsk blockchain where we thought the fork could have started
    public async getRangeForkWhenItCouldHaveStarted(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock): Promise<RangeForkInMainchain> {
        let startBlock: RskBlock = await this.defineForkStart(forkBlock, maxRskHeighCouldMatch);
        let endBlock: RskBlock = await this.defineForkEnd(forkBlock, maxRskHeighCouldMatch);

        return new RangeForkInMainchain(startBlock, endBlock);
    }

    private async defineForkStart(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock): Promise<RskBlock> {
        let bytesOverlaps: number = forkBlock.forkDetectionData.getNumberOfOverlapInCPV(maxRskHeighCouldMatch.forkDetectionData.CPV);
        let jumpsBackwards = (7 - bytesOverlaps) * 64;
        let whenWasTheLastCPVChange = Math.floor((maxRskHeighCouldMatch.height - 1) / 64) * 64;
        let heightBackwards =  whenWasTheLastCPVChange - jumpsBackwards;
        let startBlock: RskBlock;
        
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

    private async defineForkEnd(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock): Promise<RskBlock> {
        let bytesOverlaps: number = forkBlock.forkDetectionData.getNumberOfOverlapInCPV(maxRskHeighCouldMatch.forkDetectionData.CPV);
        let jumpsBackwards = (7 - bytesOverlaps) * 64;
        let whenWasTheLastCPVChange = Math.floor((maxRskHeighCouldMatch.height - 1) / 64) * 64;
        let heightWhereForkShouldEnd = whenWasTheLastCPVChange - jumpsBackwards + 64
        
        if (bytesOverlaps == 0) {

            if(this.isFarInTheFuture(forkBlock, maxRskHeighCouldMatch)){
                return maxRskHeighCouldMatch;
            }

            //Esto esta mal:
            if(this.isInTheFuture(forkBlock, maxRskHeighCouldMatch)){
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

    private isInTheFuture(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock) {
        return forkBlock.height > maxRskHeighCouldMatch.height;
    }

    private isFarInTheFuture(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock) {
        return this.isInTheFuture(forkBlock, maxRskHeighCouldMatch) && this.heightDismatchForTheDistance(forkBlock, maxRskHeighCouldMatch);
    }

    private heightDismatchForTheDistance(forkBlock: RskBlock, maxRskHeighCouldMatch: RskBlock) {
        return (forkBlock.height - maxRskHeighCouldMatch.height) > 448;
    }
}
