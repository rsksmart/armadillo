const BtcApiURL = "http://localhost:5000/";
const ArmadilloApiURL = "http://localhost:6000/";
const Curl = require('node-libcurl').Curl;
const randomHex = require('randomhex');
const expect = require('chai').expect;
const btclib = require('bitcoinjs-lib');
const CURL_DEFAULT_HTTP_VERSION = "	1.1";
const submitMethodCases = require('./submit-method-cases').submitMethodCases;
const fetch = require("node-fetch");
const mongo_utils = require("./mongo-utils");

async function MockBtcApiChangeRoute(route) {
    let response = await fetch(`${BtcApiURL}route/${route}`);
    return response;
}

async function getMainchainBlocks(number) {
    let response = await fetch(ArmadilloApiURL + "mainchain/getLastBlocks/" + number);
    let result = await response.json();
    return result;
}

async function getBlockchains(number) {
    let response = await fetch(ArmadilloApiURL + "blockchains/" + number);
    let result = await response.json();
    return result;
}

async function getForksFromHeight(number) {
    let response = await fetch(ArmadilloApiURL + "forks/getLastForks/" + number);
    let result = await response.json();
    return result;
}

async function getNextBlockInMockBTCApi(_waitTime) {
    if (_waitTime) { await sleep(_waitTime); }
    let result = await fetch(BtcApiURL + "nextBlock");
    return result;
}

async function getBlockByHashInMockBTCApi(_hash) {
    let response = await fetch(BtcApiURL + "block/getCoinbase/" + _hash);
    let result = await response.json();
    return result;
}

async function setHeightInMockBTCApi(_height) {
    let url = `${BtcApiURL}height/${_height}`;
    await fetch(url);
}

const config = {
    "rskd": {
        "url": "localhost",
        "rpcport": 4444,
        "user": "user",
        "pass": "pass"
    },
    "bitcoind": {
        "url": "localhost",
        "rpcport": 32591,
        "user": "admin",
        "pass": "admin"
    }
}
const host = config.rskd.url + ":" + config.rskd.rpcport;
const context = {
    headers: [
        "Content-Type: application/json",
        `Host: ${host}`,
        "Accept: */*"
    ],
    httpversion: "	1.1"
}

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

const curlHttpVersions = {
    "	1.0": Curl.http.VERSION_1_0,
    "	1.1": Curl.http.VERSION_1_1,
    "NONE": Curl.http.VERSION_NONE
}

var addLeadingZeros = (totalLength, s) => {
    let lenS = s.toString(16).length;
    for (lenS; lenS < totalLength; lenS++) {
        s = "0" + s.toString(16);
    }
    return s;
}

async function promiseRequest(options, body) {
    return new Promise((resolve, reject) => {
        const curl = new Curl();
        curl.setOpt(Curl.option.URL, options.host);
        curl.setOpt(Curl.option.PORT, options.port);
        curl.setOpt(Curl.option.POST, 1);
        curl.setOpt(Curl.option.HTTPHEADER, [options.headers.join('; ')]);
        curl.setOpt(Curl.option.USERPWD, options.auth);
        curl.setOpt(Curl.option.POSTFIELDS, body);
        curl.setOpt(Curl.option.HTTP_VERSION, options.httpversion || curlHttpVersions[CURL_DEFAULT_HTTP_VERSION])

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

function rskdPromiseRequest(method, params, poolContext) {
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
        host: config.rskd.url,
        port: config.rskd.rpcport,
        auth: config.rskd.user + ":" + config.rskd.pass,
        method: 'POST',
        headers: headers,
        httpversion: curlHttpVersions[poolContext.httpversion]
    };
    return promiseRequest(options, postBody);
}

function bitcoindPromiseRequest(method, params, poolContext) {
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

function buildBlock(vtxs, gbt) {
    let block = new btclib.Block();
    block.prevHash = Buffer.from(gbt.previousblockhash, 'hex');
    block.merkleRoot = Buffer.from(btclib.Block.calculateMerkleRoot(vtxs), 'hex');
    block.timestamp = Buffer.from(randomHex(4).substr(2, 10), 'hex');
    block.bits = 0x1749500d; // hardcoded, no special meaning since we don't test against the bitcoin network
    block.transactions = vtxs;
    return block;
}

function buildCoinbase(gbt, rskwork) {
    const extraNonce1 = randomHex(4).substr(2);
    const extraNonce2 = randomHex(4).substr(2);
    const blockHashForMergedMining = rskwork.blockHashForMergedMining.substr(2);
    const coinbase1 = "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff28";
    const coinbase2 = "6f6e312f50726f6a65637420425443506f6f6c2f010000000000000000000000ffffffff03c862a804000000001976a914c0174e89bd93eacd1d5a1af4ba1802d412afc08688ac0000000000000000266a24aa21a9edf315b8139d4920109434e248fd6b58d5623b2bde1617816df4f27cbe460eaf6500000000000000002952534b424c4f434b3a" + blockHashForMergedMining + "00000000";
    return btclib.Transaction.fromHex(coinbase1 + extraNonce1 + extraNonce2 + coinbase2);
}

function buildTransactions(gbt, rskwork) {
    return [buildCoinbase(gbt, rskwork)];
}

function mineValidBlock(gbt, rskwork) {
    let block, vtxs;
    const target = Buffer.from(rskwork.target.substr(2), 'hex');
    do {
        vtxs = buildTransactions(gbt, rskwork);
        block = buildBlock(vtxs, gbt, rskwork);
        blockHash = block.getHash().reverse();
    } while (blockHash.compare(target) > 0)
    return block;
}

async function getBlockTemplate() {
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

function rskJsonRpcRequestMiningModule(method, params, poolContext) {
    methodWithPreffix = method;
    if (!methodWithPreffix.startsWith("mnr_"))
        methodWithPreffix = "mnr_" + methodWithPreffix;
    return rskdPromiseRequest(methodWithPreffix, params, poolContext);
}

function getRskWork(poolContext) {
    return rskdPromiseRequest("mnr_getWork", [], poolContext);
}

let lastWork = null;
async function prepareRskWork(poolContext, expectNewWork = false) {
    let work = JSON.parse(await getRskWork(poolContext)).result;
    while (expectNewWork && lastWork && (work.blockHashForMergedMining == lastWork.blockHashForMergedMining)) {
        await sleep(100);
        work = JSON.parse(await getRskWork(poolContext)).result;
    }
    lastWork = work;
    return work;
}

async function buildAndMergeMineBlock(poolContext, expectNewWork = false) {
    const gbt = JSON.parse(await getBlockTemplate()).result;
    const rskwork = await prepareRskWork(poolContext, expectNewWork);
    const block = mineValidBlock(gbt, rskwork);
    return block;
}

function validateMergeMinedBlockResponse(response) {
    expect(response).to.have.property('id');
    expect(response).to.have.property('result');
    expect(response.result).to.have.property('blockImportedResult');
    expect(response.result).to.have.property('blockHash');
    expect(response.result).to.have.property('blockIncludedHeight');
}

async function mineBlockResponse(poolContext) {
    const method = "submitBitcoinBlock";
    const block = await buildAndMergeMineBlock(poolContext);
    const params = submitMethodCases[method].extractSubmitParameters(block);
    const hasUncle = 1 === Math.floor(100000 * Math.random()) % 2;
    if (hasUncle) {
        const block2 = await buildAndMergeMineBlock(poolContext);
        const params2 = submitMethodCases[method].extractSubmitParameters(block2);
        await rskJsonRpcRequestMiningModule(method, params2, poolContext);
    }
    const response = JSON.parse(await rskJsonRpcRequestMiningModule(method, params, poolContext));
    validateMergeMinedBlockResponse(response);
    return response.result;
}

async function getLastRSKHeight(context) {
    let response = JSON.parse(await rskdPromiseRequest("eth_blockNumber", [], context));
    return parseInt(response.result);
}

async function setRskTagInBtcMockData(btcBlocksJSON, btcBlockNumber, rskHeight, context) {
    const rskResponse = JSON.parse(await rskdPromiseRequest("eth_getBlockByNumber", ["0x" + rskHeight.toString(16), true], context));
    const rskTag = rskResponse.result.hashForMergedMining;
    btcBlocksJSON.raw[btcBlockNumber].coinbase.transaction.outputs[0].rskTag = rskTag;
    return btcBlocksJSON;
}
function getRskBlockByNumber(blockNumber, context) {
    return rskdPromiseRequest("eth_getBlockByNumber", [blockNumber, true], context);
}

async function validateRskBlockNodeVsArmadilloMonitor(armadilloBlock) {
    let height = "0x" + armadilloBlock.rskInfo.height.toString(16);
    let rskBlock = JSON.parse(await getRskBlockByNumber(height, context));
    let mergeMiningHash = rskBlock.result.hashForMergedMining;
    expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
    expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
    let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
    expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(prefixHashFromRskBlock);
    let CPVFromRskBlock = mergeMiningHash.substring(42, 56);
    expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.equal(CPVFromRskBlock);
    let nbrUnclesFromRskBlock = parseInt("0x" + mergeMiningHash.substring(56, 58));
    expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
    let heightFromHashForMergeMiningRskBlock = parseInt("0x" + mergeMiningHash.substring(58));
    expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
}

async function validateBtcBlockNodeVsArmadilloMonitor(armadilloBlock, btcRskMap) {
    let shouldHaveBtcInfo = btcRskMap.includes(armadilloBlock.rskInfo.height);

    if (!shouldHaveBtcInfo) {
        expect(armadilloBlock.btcInfo.height).to.be.null;
        expect(armadilloBlock.btcInfo.hash).to.be.null;
    }
    else {
        expect(armadilloBlock.btcInfo.height).not.to.be.null;
        expect(armadilloBlock.btcInfo.hash).not.to.be.null;
        let btcBlockInfo = await getBlockByHashInMockBTCApi(armadilloBlock.btcInfo.hash);
        let btcHash = btcBlockInfo.coinbase.transactionBlockInfo.hash;
        let btcHeight = btcBlockInfo.coinbase.transactionBlockInfo.height;
        expect(armadilloBlock.btcInfo.height).to.be.equal(btcHeight);
        expect(armadilloBlock.btcInfo.hash).to.be.equal(btcHash);
    }
}

async function validateRskBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock) {
    let height = "0x" + armadilloBlock.rskInfo.height.toString(16);
    let rskBlock = JSON.parse(await getRskBlockByNumber(height, context));
    let mergeMiningHash = rskBlock.result.hashForMergedMining;
    expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
    expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
    let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
    expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(prefixHashFromRskBlock);
    let CPVFromRskBlock = mergeMiningHash.substring(42, 56);
    expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.equal(CPVFromRskBlock);
    let nbrUnclesFromRskBlock = parseInt("0x" + mergeMiningHash.substring(56, 58));
    expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
    let heightFromHashForMergeMiningRskBlock = parseInt("0x" + mergeMiningHash.substring(58));
    expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
}

async function validateBtcBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock, btcRskMap) {
    let shouldHaveBtcInfo = btcRskMap.includes(armadilloBlock.rskInfo.height);

    if (!shouldHaveBtcInfo) {
        expect(armadilloBlock.btcInfo.height).to.be.null;
        expect(armadilloBlock.btcInfo.hash).to.be.null;
    }
    else {
        expect(armadilloBlock.btcInfo.height).not.to.be.null;
        expect(armadilloBlock.btcInfo.hash).not.to.be.null;
        let btcBlockInfo = await getBlockByHashInMockBTCApi(armadilloBlock.btcInfo.hash);
        let btcHash = btcBlockInfo.coinbase.transactionBlockInfo.hash;
        let btcHeight = btcBlockInfo.coinbase.transactionBlockInfo.height;
        expect(armadilloBlock.btcInfo.height).to.be.equal(btcHeight);
        expect(armadilloBlock.btcInfo.hash).to.be.equal(btcHash);
    }
}

async function getBlockchainsAfterMovingXBlocks(
    btcApiRoute, initialHeight, blocksToMove,
    amountOfBlockchains, apiPoolingTime, loadingTime) {
    let c = 1;
    await MockBtcApiChangeRoute(btcApiRoute);
    await setHeightInMockBTCApi(initialHeight);
    await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
    await sleep(apiPoolingTime + loadingTime);
    const blocksToAdvance = blocksToMove;
    for (let i = 0; i < blocksToAdvance; i++) {
        await getNextBlockInMockBTCApi(apiPoolingTime);
    }
    await sleep(loadingTime);
    return blockchainsResponse = await getBlockchains(amountOfBlockchains);

}

module.exports = {
    rskdPromiseRequest,
    config,
    getLastRSKHeight,
    mineBlockResponse,
    bitcoindPromiseRequest,
    setRskTagInBtcMockData,
    sleep,
    MockBtcApiChangeRoute,
    getMainchainBlocks,
    getNextBlockInMockBTCApi,
    setHeightInMockBTCApi,
    validateRskBlockNodeVsArmadilloMonitor,
    validateBtcBlockNodeVsArmadilloMonitor,
    validateRskBlockNodeVsArmadilloMonitorMongoDB,
    validateBtcBlockNodeVsArmadilloMonitorMongoDB,
    getBlockByHashInMockBTCApi,
    getForksFromHeight,
    getBlockchains,
    getBlockchainsAfterMovingXBlocks
}