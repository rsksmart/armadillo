import { armadilloApiURL, apiPoolingTime, loadingTime } from "./configs";
import { findOneMainchainBlock, updateOneMainchainBlock, deleteDB, armadilloDB, findBlocks, armadilloForks, updateLastCheckedBtcBlock } from "./mongo-utils";
import { scrumbleHash } from "./utils";
import { getSiblingFromRsk } from "./rsk-operations";
import { setHeightInMockBTCApi, mockBtcApiChangeRoute, getNextBlockInMockBTCApi } from "./btc-api-mocker";
import { sleep } from "../../../src/util/helper";

export async function getMainchainBlocks(number) {
    let response = await fetch(armadilloApiURL + "mainchain/getLastBlocks/" + number);
    return  await response.json();
}

export async function getBlockchains(number) {
    let response = await fetch(armadilloApiURL + "blockchains/" + number);
    return response.json();
}

export async function getForksFromHeight(number) {
    let response = await fetch(armadilloApiURL + "forks/getLastForks/" + number);
    return response.json();
}

export function getForkDetectionData(rskTag) {
    return {
        prefixHash: rskTag.substring(2, 42),
        CPV: rskTag.substring(42, 56),
        NU: parseInt("0x" + rskTag.substring(56, 58)),
        BN: parseInt("0x" + rskTag.substring(58))
    };
}

export async function fakeMainchainBlock(rskBlockNumber) {
    let blockInfoOriginal = await findOneMainchainBlock(rskBlockNumber, true);
    let blockInfo = JSON.parse(JSON.stringify(blockInfoOriginal));
    let prefixHash = scrumbleHash(blockInfo.rskInfo.forkDetectionData.prefixHash);
    let rskHash = scrumbleHash(blockInfo.rskInfo.hash);
    blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash;
    blockInfo.rskInfo.hash = rskHash;
    await updateOneMainchainBlock(rskBlockNumber, true, blockInfo);
    return blockInfoOriginal;
}

export async function swapMainchainBlockWithSibling(rskBlockNumber) {
    let blockInfoMainchain = await findOneMainchainBlock(rskBlockNumber, true);
    let blockInfoSibling = await getSiblingFromRsk(rskBlockNumber);
    await updateOneMainchainBlock(rskBlockNumber, true, blockInfoSibling);
    await updateOneMainchainBlock(rskBlockNumber, false, blockInfoMainchain);
    return blockInfoMainchain;
}

async function moveXBlocks(btcApiRoute, initialHeight, blocksToMove) {
    let c = 1;
    await mockBtcApiChangeRoute(btcApiRoute);
    await setHeightInMockBTCApi(initialHeight);
    await deleteDB(armadilloDB);
    await setBlockAsLastChecked(initialHeight - 1);
    await sleep(apiPoolingTime + loadingTime);
    const blocksToAdvance = blocksToMove;
    for (let i = 0; i < blocksToAdvance; i++) {
        await getNextBlockInMockBTCApi();
    }
    await sleep(loadingTime * 2);
}

export async function getBlockchainsAfterMovingXBlocks(btcApiRoute, initialHeight, blocksToMove, amountOfBlockchains) {
    await moveXBlocks(btcApiRoute, initialHeight, blocksToMove);
    return await getBlockchains(amountOfBlockchains);
}

export async function getDBForksAfterMovingXBlocks(btcApiRoute, initialHeight, blocksToMove) {
    await moveXBlocks(btcApiRoute, initialHeight, blocksToMove);
    return await findBlocks(armadilloDB, armadilloForks);
}

export async function setBlockAsLastChecked(blockNumber) {
    const btcBlock = await this.getBtcApiBlockNumber(blockNumber);
    await updateLastCheckedBtcBlock(btcBlock);
}