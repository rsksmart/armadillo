import { sleep } from "../../../src/util/helper";
import fetch from 'node-fetch'
const btcApiURL = "http://localhost:5000/";
const apiPoolingTime = 200;
const loadingTime = 800;

export async function mockBtcApiChangeRoute(route) {
    let response = await fetch(`${btcApiURL}route/${route}`);
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

export async function getNextBlockInMockBTCApi() {
    await sleep(apiPoolingTime + loadingTime);
    let result = await fetch(btcApiURL + "nextBlock");
    return result;
}

export async function getBlockByHashInMockBTCApi(_hash) {
    let response = await fetch(btcApiURL + "block/getCoinbase/" + _hash);
    let result = await response.json();
    return result;
}

export async function setHeightInMockBTCApi(_height) {
    let url = `${btcApiURL}height/${_height}`;
    await fetch(url);
}