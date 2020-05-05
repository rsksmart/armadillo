import {curlHttpVersions, CURL_DEFAULT_HTTP_VERSION, config } from "./configs";
import { sleep } from "../../../src/util/helper";
import { getForkDetectionData } from "./armadillo-operations";
import curl from 'node-libcurl';
import btclib from 'bitcoinjs-lib';
import randomHex from 'randomhex';

export async function promiseRequest(options, body) {
    return new Promise((resolve, reject) => {
        curl.setOpt(curl.option.URL, options.host);
        curl.setOpt(curl.option.PORT, options.port);
        curl.setOpt(curl.option.POST, 1);
        curl.setOpt(curl.option.HTTPHEADER, [options.headers.join('; ')]);
        curl.setOpt(curl.option.USERPWD, options.auth);
        curl.setOpt(curl.option.POSTFIELDS, body);
        curl.setOpt(curl.option.HTTP_VERSION, options.httpversion || curlHttpVersions[CURL_DEFAULT_HTTP_VERSION])

        curl.on('end', (statusCode, body, responseHeaders) => {
            curl.close();
            resolve(body);
        });

        curl.on('error', (e) => {
            curl.close();
            reject(e);
        });
        curl.perform();
    });
}

export function rskdPromiseRequest(method, params, poolContext) {
    const body = {
        jsonrpc: "2.0",
        method: method,
        params: params || [],
        id: 1
    }
    const postBody = JSON.stringify(body);

    const headers = poolContext.headers.slice(0);
    headers.push("Content-Length: " + postBody.length);
    const options = {
        host: config.rskd.url,
        port: config.rskd.rpcport,
        auth: config.rskd.user + ":" + config.rskd.pass,
        method: 'POST',
        headers: headers,
        httpversion: curlHttpVersions[poolContext.httpversion]
    };
    return promiseRequest(options, postBody);
}

export function bitcoindPromiseRequest(method, params, poolContext) {
    const body = {
        jsonrpc: "2.0",
        method: method,
        params: params || [],
        id: 1
    }
    const postBody = JSON.stringify(body);
    const headers = poolContext.headers.slice(0); // copy array
    headers.push("Content-Length: " + postBody.length);
    const options = {
        host: config.bitcoind.url,
        port: config.bitcoind.rpcport,
        auth: config.bitcoind.user + ":" + config.bitcoind.pass,
        method: 'POST',
        headers: headers,
        httpversion: curlHttpVersions[poolContext.httpversion]
    };
    return promiseRequest(options, postBody);
}

export function buildBlock(vtxs, gbt) {
    let block = new btclib.Block();
    block.prevHash = Buffer.from(gbt.previousblockhash, 'hex');
    block.merkleRoot = Buffer.from(btclib.Block.calculateMerkleRoot(vtxs), 'hex');
    block.timestamp = Buffer.from(randomHex(4).substr(2, 10), 'hex');
    block.bits = 0x1749500d; // hardcoded, no special meaning since we don't test against the bitcoin network
    block.transactions = vtxs;
    return block;
}

export function buildCoinbase(gbt, rskwork) {
    const extraNonce1 = randomHex(4).substr(2);
    const extraNonce2 = randomHex(4).substr(2);
    const blockHashForMergedMining = rskwork.blockHashForMergedMining.substr(2);
    const coinbase1 = "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff28";
    const coinbase2 = "6f6e312f50726f6a65637420425443506f6f6c2f010000000000000000000000ffffffff03c862a804000000001976a914c0174e89bd93eacd1d5a1af4ba1802d412afc08688ac0000000000000000266a24aa21a9edf315b8139d4920109434e248fd6b58d5623b2bde1617816df4f27cbe460eaf6500000000000000002952534b424c4f434b3a" + blockHashForMergedMining + "00000000";
    return btclib.Transaction.fromHex(coinbase1 + extraNonce1 + extraNonce2 + coinbase2);
}

export function buildTransactions(gbt, rskwork) {
    return [buildCoinbase(gbt, rskwork)];
}

export async function getBlockTemplate() {
    const body = {
        jsonrpc: "2.0",
        method: "getblocktemplate",
        params: [],
        id: 1
    }
    const postBody = JSON.stringify(body);
    const options = {
        host: config.bitcoind.url,
        port: config.bitcoind.rpcport,
        auth: config.bitcoind.user + ":" + config.bitcoind.pass,
        method: "POST",
        headers: [
            "Content-Type: application/json",
            "Content-Length: " + postBody.length
        ]
    };
    const promiseBlockTemplate = await promiseRequest(options, postBody);
    return promiseBlockTemplate;
}

export function rskJsonRpcRequestMiningModule(method, params, poolContext) {
    let methodWithPreffix = method;
    if (!methodWithPreffix.startsWith("mnr_"))
        methodWithPreffix = "mnr_" + methodWithPreffix;
    return rskdPromiseRequest(methodWithPreffix, params, poolContext);
}

export function getRskWork(poolContext) {
    return rskdPromiseRequest("mnr_getWork", [], poolContext);
}

export async function prepareRskWork(poolContext, expectNewWork = false) {
    let lastWork = null;
    let work = JSON.parse(await this.getRskWork(poolContext)).result;
    while (expectNewWork && lastWork && (work.blockHashForMergedMining == lastWork.blockHashForMergedMining)) {
        await sleep(100);
        work = JSON.parse(await this.getRskWork(poolContext)).result;
    }
    lastWork = work;
    return work;
}

export async function getLastRSKHeight(context) {
    let response = JSON.parse(await this.rskdPromiseRequest("eth_blockNumber", [], context));
    return parseInt(response.result);
}

export async function getRskBlockByNumber(blockNumber, context) {
    return rskdPromiseRequest("eth_getBlockByNumber", [blockNumber, false], context);
}

export async function getRskBlockByHash(blockNumber, context) {
    let response = await rskdPromiseRequest("eth_getBlockByHash", [blockNumber, false], context);
    console.log("ACA HAY QUE ARREGLAR ALGO")
    return response;
}

export async function getRskBlocksByNumber(blockNumber, context) {
    let response = await rskdPromiseRequest("eth_getBlocksByNumber", [blockNumber], context);
    console.log("ACA HAY QUE ARREGLAR ALGO")
    return response;
}

export function getRskBlockHashOfSibling(blockArray) {
    for (let block in blockArray) {
        if (blockArray[block].inMainChain === false) {
            return blockArray[block].hash;
        }
    }
}

export async function getSiblingFromRsk(rskBlockNumber) {
    let blocksAtHeight = await getRskBlocksByNumber(rskBlockNumber, context)
    let siblingHash = getRskBlockHashOfSibling(blocksAtHeight);
    let block: any = await getRskBlockByHash(siblingHash, context);
    return {
        btcInfo: null,
        rskInfo: {
            height: block.number,
            hash: block.hash,
            forkDetectionData: getForkDetectionData(block.hashForMergedMining),
            prevHash: block.parentHash,
            mainchain: false
        }
    };
}
//TODO: Review use
export async function setRskTagInBtcMockData(btcBlocksJSON, btcBlockNumber, rskHeight, context) {
    const rskResponse = JSON.parse(await this.rskdPromiseRequest("eth_getBlockByNumber", ["0x" + rskHeight.toString(16), true], context));
    const rskTag = rskResponse.result.hashForMergedMining;
    btcBlocksJSON.raw[btcBlockNumber].coinbase.transaction.outputs[0].rskTag = rskTag;
    return btcBlocksJSON;
}