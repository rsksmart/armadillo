import { RskBlockInfo } from '../../../src/common/rsk-block';
import { RskApiService } from '../../../src/services/rsk-api-service';

export class RskOperations {
    private rskApiService: RskApiService;
    constructor(rskApiService: RskApiService) {
        this.rskApiService = rskApiService;
    }
    public getRskBlockHashOfSibling(blockArray: RskBlockInfo[]): string {
        for (const block of blockArray) {
            if (block.mainchain === false) {
                return block.hash;
            }
        }
    }

    public async getSiblingFromRsk(rskBlockNumber: number): Promise<RskBlockInfo> {
        const blocksAtHeight: RskBlockInfo[] = await this.rskApiService.getBlocksByNumber(rskBlockNumber);
        const siblingHash: string = this.getRskBlockHashOfSibling(blocksAtHeight);
        const rskBlock: RskBlockInfo = await this.rskApiService.getBlockByHash(siblingHash);
        return rskBlock;
    }
}
