import { armadilloApiURL, loadingTime } from './configs';
import { findOneMainchainBlock, updateOneMainchainBlock, updateLastCheckedBtcBlock } from './mongo-utils';
import { scrumbleHash } from './utils';
import { getSiblingFromRsk } from './rsk-operations';
import { moveToNextBlock, getBtcApiBlockNumber, getBtcApiLastBlock } from './btc-api-mocker';
import { sleep } from '../../../src/util/helper';
import fetch from 'node-fetch';
import { BtcService } from '../../../src/services/btc-service';
import { BtcHeaderInfo, BtcBlock } from '../../../src/common/btc-block';
import { RskBlockInfo } from '../../../src/common/rsk-block';
import { MainchainService } from '../../../src/services/mainchain-service';
import { Item } from '../../../src/common/forks';
import { RskApiService } from '../../../src/services/rsk-api-service';

export async function getBlockchains(number: number = 2000) {
    const response = await fetch(armadilloApiURL + 'blockchains/' + number);
    return response.json();
}

export function getForkDetectionData(rskTag) {
    return {
        prefixHash: rskTag.substring(2, 42),
        CPV: rskTag.substring(42, 56),
        NU: parseInt('0x' + rskTag.substring(56, 58), 16),
        BN: parseInt('0x' + rskTag.substring(58), 16),
    };
}

export async function fakeMainchainBlock(rskBlockNumber: number, mainchainService: MainchainService): Promise<void> {
    const blockInfo: Item = await mainchainService.getBlock(rskBlockNumber);
    const prefixHash = scrumbleHash(blockInfo.rskInfo.forkDetectionData.prefixHash);
    const rskHash = scrumbleHash(blockInfo.rskInfo.hash);
    console.log("======== rskBN", rskBlockNumber);
    console.log("expected hash ", blockInfo.rskInfo.hash);
    console.log("scrumbled hash", rskHash);
    blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash;
    blockInfo.rskInfo.hash = rskHash;
    mainchainService.changeBlockInMainchain(rskBlockNumber, blockInfo);
}

export async function swapMainchainBlockWithSibling(rskBlockNumber: number, mainchainService: MainchainService, rskApiService: RskApiService): Promise<Item> {
    const block: Item = await mainchainService.getBlock(rskBlockNumber);
    const blocksAtHeight: RskBlockInfo[] = await rskApiService.getBlocksByNumber(rskBlockNumber);
    const siblingHash: string = blocksAtHeight.filter((x: RskBlockInfo) => x.mainchain === false)[0].hash;
    const siblingRskBlockInfo: RskBlockInfo = await rskApiService.getBlockByHash(siblingHash);
    const siblingItem: Item = new Item(block.btcInfo, siblingRskBlockInfo);
    mainchainService.changeBlockInMainchain(rskBlockNumber, siblingItem);
    return siblingItem;
}

export async function moveXBlocks(blocksToMove: number, btcService: BtcService): Promise<void> {
    for (let i = 0; i < blocksToMove; i++) {
        await moveToNextBlock();
        const bestBlock = await getBtcApiLastBlock();
        let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();

        while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
            await sleep(100);
            btcLastCheckedBlock = await btcService.getLastBlockDetected();
        }
    }
}

export async function getBlockchainsAfterMovingXBlocks(blocksToMove: number, btcService: BtcService) {
    await moveXBlocks(blocksToMove, btcService);
    return await getBlockchains();
}

export async function setLastBlockDetected(blockNumber) {
    const btcBlock = await getBtcApiBlockNumber(blockNumber);
    await updateLastCheckedBtcBlock(btcBlock);
}
