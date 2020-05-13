import { sleep } from "../../../src/util/helper";
import fetch from 'node-fetch'
import { BtcHeaderInfo } from "../../../src/common/btc-block";
import { BtcService } from "../../../src/services/btc-service";
const btcApiURL = "http://localhost:5000/";
const apiPoolingTime = 200;
const loadingTime = 800;

export async function mockBtcApiChangeRoute() {
    let response = await fetch(`${btcApiURL}route/raw`);
    return response;
}

export async function getBtcApiBlockNumber(number) {
    let response = await fetch(`${btcApiURL}block/getBlock/${number}`);
    let result = await response.json();
    let btcInfo = {
        btcInfo: {
            height: result.block.header.height,
            hash: result.block.header.hash
        }
    };
    return btcInfo;
}

export async function getBtcApiLastBlock(): Promise<BtcHeaderInfo> {
    let response = await fetch(`${btcApiURL}block/getBestBlock`);
    let result = await response.json();
    let btcInfo =  {
            height: result.block.header.height,
            hash: result.block.header.hash
        
    };
    return BtcHeaderInfo.fromObject (btcInfo);
}

export async function moveToNextBlock() : Promise<void>{
    await fetch(btcApiURL + "nextBlock");
}

// export async function moveXBlocks( blocksToMove: number, btcService: BtcService): Promise<void> {
//     for (let i = 0; i < blocksToMove; i++) {
//         await moveToNextBlock()
//         let bestBlock = await getBtcApiLastBlock()
//         let btcLastCheckedBlock = await btcService.getLastBlockDetected();
//         while (!btcLastCheckedBlock || btcLastCheckedBlock.height != bestBlock.height) {
//             await sleep(100);
//             btcLastCheckedBlock = await btcService.getLastBlockDetected();
//         }
//     }
// }

export async function getBlockByHashInMockBTCApi(_hash) {
    let response = await fetch(btcApiURL + "block/getCoinbase/" + _hash);
    let result = await response.json();
    return result;
}

export async function setHeightInMockBTCApi(_height) : Promise<void>{
    //THIS SHOULD BE A POST
    await fetch(`${btcApiURL}height/${_height}`);
}