import { RskBlockInfo } from '../../../src/common/rsk-block';
import { Item } from '../../../src/common/forks';
import { RskApiService } from '../../../src/services/rsk-api-service';

export function getRskBlockHashOfSibling(blockArray: RskBlockInfo[]): string {
    for (const block of blockArray) {
        if (block.mainchain === false) {
            return block.hash;
        }
    }
}

export async function getSiblingFromRsk(rskBlockNumber: number, rskApi: RskApiService): Promise<Item> {
    const blocksAtHeight: RskBlockInfo[] = await rskApi.getBlocksByNumber(rskBlockNumber);
    const siblingHash: string = getRskBlockHashOfSibling(blocksAtHeight);
    const rskBlock: RskBlockInfo = await rskApi.getBlockByHash(siblingHash);
    return new Item(null, rskBlock);
}
