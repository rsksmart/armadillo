import { armadilloApiURL, loadingTime } from './configs'
import {
    findOneMainchainBlock,
    updateOneMainchainBlock,
    updateLastCheckedBtcBlock,
} from './mongo-utils'
import { scrumbleHash } from './utils'
import { getSiblingFromRsk } from './rsk-operations'
import {
    moveToNextBlock,
    getBtcApiBlockNumber,
    getBtcApiLastBlock,
} from './btc-api-mocker'
import { sleep } from '../../../src/util/helper'
import fetch from 'node-fetch'
import { BtcService } from '../../../src/services/btc-service'
import { BtcHeaderInfo, BtcBlock } from '../../../src/common/btc-block'

export async function getMainchainBlocks(number) {
    let response = await fetch(
        armadilloApiURL + 'mainchain/getLastBlocks/' + number
    )
    return await response.json()
}

export async function getBlockchains(number: number = 2000) {
    let response = await fetch(armadilloApiURL + 'blockchains/' + number)
    return response.json()
}

export async function getForksFromHeight(number) {
    let response = await fetch(armadilloApiURL + 'forks/getLastForks/' + number)
    return response.json()
}

export function getForkDetectionData(rskTag) {
    return {
        prefixHash: rskTag.substring(2, 42),
        CPV: rskTag.substring(42, 56),
        NU: parseInt('0x' + rskTag.substring(56, 58)),
        BN: parseInt('0x' + rskTag.substring(58)),
    }
}

export async function fakeMainchainBlock(rskBlockNumber) {
    let blockInfoOriginal = await findOneMainchainBlock(rskBlockNumber, true)
    let blockInfo = JSON.parse(JSON.stringify(blockInfoOriginal))
    let prefixHash = scrumbleHash(
        blockInfo.rskInfo.forkDetectionData.prefixHash
    )
    let rskHash = scrumbleHash(blockInfo.rskInfo.hash)
    blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash
    blockInfo.rskInfo.hash = rskHash
    await updateOneMainchainBlock(rskBlockNumber, true, blockInfo)
    return blockInfoOriginal
}

export async function swapMainchainBlockWithSibling(rskBlockNumber) {
    let blockInfoMainchain = await findOneMainchainBlock(rskBlockNumber, true)
    let blockInfoSibling = await getSiblingFromRsk(rskBlockNumber)
    await updateOneMainchainBlock(rskBlockNumber, true, blockInfoSibling)
    await updateOneMainchainBlock(rskBlockNumber, false, blockInfoMainchain)
    return blockInfoMainchain
}

export async function moveXBlocks( blocksToMove: number, btcService: BtcService): Promise<void> {
    for (let i = 0; i < blocksToMove; i++) {
        await moveToNextBlock()
        let bestBlock = await getBtcApiLastBlock()
        let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
        while (btcLastCheckedBlock.btcInfo.height != bestBlock.height) {
            await sleep(100);
            btcLastCheckedBlock = await btcService.getLastBlockDetected();
        }
    }
}

export async function getBlockchainsAfterMovingXBlocks(
    blocksToMove: number,
    btcService: BtcService
) {
    await moveXBlocks(blocksToMove, btcService)
    return await getBlockchains()
}

export async function setLastBlockDetected(blockNumber) {
    const btcBlock = await getBtcApiBlockNumber(blockNumber)
    await updateLastCheckedBtcBlock(btcBlock)
}
