import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlock } from "../common/rsk-block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";

export class RskApiService {
    private config: RskApiConfig;
    private nod3: any;

    constructor(config: RskApiConfig) {
        this.config = config;
        
        const url = `http://${this.config.host}:${this.config.port}`
        this.nod3 = new Nod3(
            new Nod3.providers.HttpProvider(url)
        );
    }

    public async getBlocksByNumber(height: number): Promise<RskBlock[]> {

        var blocksInfo: any[] = await this.nod3.rsk.getBlocksByNumber(height);
        var blocks: RskBlock[] = [];

        for (const blockInfo of blocksInfo) {
            var block = await this.nod3.eth.getBlock(blockInfo.hash);
            blocks.push(new RskBlock(block.number, block.hash, block.parentHash, new ForkDetectionData(block.hashForMergedMining)));
        }

        return blocks;
    }

    public async getBestBlock(): Promise<RskBlock> {
        let number = await this.nod3.eth.blockNumber();
        let block = await this.nod3.eth.getBlock(number);
        return new RskBlock(block.number, block.hash, block.parentHash, new ForkDetectionData(block.hashForMergedMining));
    }

    public async getBestBlockHeight(): Promise<number> {
        return await this.nod3.eth.blockNumber();
    }

    public async getBlock(height: number): Promise<RskBlock> {
        return await this.nod3.eth.getBlock(height);
    }

    //This method returns the nearest block in rsk blockchain where we thought the fork could have started
    public async getRskBlockAtCerteinHeight(forkBlock: RskBlock, rskBlockAtSameOrPrevHeight: RskBlock): Promise<RskBlock> {
        let bytesOverlaps = forkBlock.forkDetectionData.getNumberOfOverlapInCPV(rskBlockAtSameOrPrevHeight.forkDetectionData.CPV);
        if (bytesOverlaps == 0) {
            return await this.getBlock(1);
        }

        let jumpsBackwwards = (7 - bytesOverlaps) * 64;
        let heightBackwards = Math.floor((rskBlockAtSameOrPrevHeight.height - 1) / 64) * 64 - jumpsBackwwards;
        let cpvBlock = rskBlockAtSameOrPrevHeight.forkDetectionData.CPV;
        let foundBlockCPVBeforeChange = false;
        let blockAfterChangeCPV: RskBlock = null;

        for (let i = 0; !foundBlockCPVBeforeChange; i++) {

            if (i > 64) {
                //TODO: add logger
                // this.logger.error("Match CPV error at heigh:", forkBlock.height, "comparing with block height:", rskBlockAtSameOrPrevHeight)
            }

            blockAfterChangeCPV = await this.getBlock(heightBackwards + i);
            if (blockAfterChangeCPV.forkDetectionData.CPV == cpvBlock) {
                foundBlockCPVBeforeChange = true;
            }
        }

        return blockAfterChangeCPV;
    }
}
