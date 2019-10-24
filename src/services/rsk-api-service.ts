import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlock } from "../common/rsk-block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";
import { RangeForkInMainchain } from "../common/branch";

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
        var blocksInfo: any[] = await this.nod3.rsk.getBlocksByNumber('0x' + height.toString(16), true);
        var blocks: RskBlock[] = [];

        for (const blockInfo of blocksInfo) {
            var block = await this.nod3.eth.getBlock(blockInfo.hash);
            blocks.push(new RskBlock(block.number, block.hash, block.parentHash, block.mainchain, new ForkDetectionData(block.hashForMergedMining)));
        }

        return blocks;
    }

    public async getBestBlock(): Promise<RskBlock> {
        let number : number = await this.nod3.eth.blockNumber();
        let block = await this.nod3.eth.getBlock(number);
        return new RskBlock(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    public async getBestBlockHeight(): Promise<number> {
        return await this.nod3.eth.blockNumber();
    }

    public async getBlock(height: number): Promise<RskBlock> {
        let block = await this.nod3.eth.getBlock(height);
        return new RskBlock(block.number, block.hash, block.parentHash, true, new ForkDetectionData(block.hashForMergedMining));
    }

    //This method returns the nearest block in rsk blockchain where we thought the fork could have started
    public async getRskBlockAtCertainHeight(forkBlock: RskBlock, rskBlockAtSameOrPrevHeight: RskBlock): Promise<RangeForkInMainchain> {
        let bytesOverlaps = forkBlock.forkDetectionData.getNumberOfOverlapInCPV(rskBlockAtSameOrPrevHeight.forkDetectionData.CPV);
       
        if (bytesOverlaps == 0) {
            //Range is from the begining of the times up to best block
            let startBlock: RskBlock = await this.getBlock(1);
            let lasBlock: RskBlock = await this.getBestBlock();

            return new RangeForkInMainchain(startBlock, lasBlock);
        }

        let jumpsBackwards = (7 - bytesOverlaps) * 64;
        let heightBackwards = Math.floor((rskBlockAtSameOrPrevHeight.height - 1) / 64) * 64 - jumpsBackwards;
        let blockAfterChangeCPV: RskBlock = await this.getBlock(heightBackwards);
        let startBlock: RskBlock = blockAfterChangeCPV;
        let endBlock: RskBlock = forkBlock;

        if (bytesOverlaps != 7) {
            heightBackwards += 64;
            endBlock = await this.getBlock(heightBackwards);
        }

        return new RangeForkInMainchain(startBlock, endBlock);
    }
}
