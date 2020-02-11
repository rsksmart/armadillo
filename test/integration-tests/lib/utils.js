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
const timeoutTests = 5 * 60 * 1000;//5 minutes
const apiPoolingTime = 200;
const loadingTime = 500;
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
const curlHttpVersions = {
    "	1.0": Curl.http.VERSION_1_0,
    "	1.1": Curl.http.VERSION_1_1,
    "NONE": Curl.http.VERSION_NONE
}
const mapRskMatch = {
    "3": 450,
    "4": 470,
    "5": 490,
    "9": 570,
    "13": 650,
    "17": 730,
    "28": 820,
    "29": 835,
    "32": 865,
    "43": 1168,
    "51": 1453,
    "55": 3533,
    "63": 4573,
    "67": 4973,
    "77": 5228,
    "81": 6234,
    "92": 7274,
    "95": 7304,
    "97": 7319,
    "107": 7380,
    "115": 7385,
    "118": 7415,
    "119": 7435,
    "129": 7490,
    "130": 7510,
    "131": 7382,
    "133": 7384,
    "134": 7519,
    "135": 7654
};

const mapRskNoMatchMatchCPV = {
    "19": 770,
    "20": 780,
    "21": 785,
    "24": 800,
    "27": 815,
    "30": 845,
    "31": 855,
    "34": 875,
    "37": 890,
    "38": 897,
    "39": 898,
    "40": 1028,
    "41": 1033,
    "42": 1038,
    "44": 1298,
    "47": 1313,
    "49": 1323,
    "52": 1973,
    "53": 2493,
    "54": 3013,
    "57": 4053,
    "59": 4073,
    "61": 4093,
    "64": 4713,
    "70": 5093,
    "78": 5728,
    "84": 6744,
    "84": 6744,
    "93": 7264,
    "94": 7284,
    "96": 7299,
    "100": 7304,
    "104": 7320,
    "110": 7365,
    "116": 7375,
    "124": 7425,
    "132": 7512
};

const mapRskNoMatchNoMatchCPV2B = {
    "65": 4723,
    "66": 4733,
    "73": 5102,
    "75": 5108,
    "117": 7395,
    "127": 7440,
    "132": 7512
};

const mapRskNoMatchNoMatchCPV7B = {
    "79": 5731,
    "80": 5734,
    "86": 6754,
    "90": 6774
};

function rskBlockHeightsWithBtcBlock() {
    return {
        ...mapRskMatch,
        ...mapRskNoMatchMatchCPV,
        ...mapRskNoMatchNoMatchCPV2B,
        ...mapRskNoMatchNoMatchCPV7B
    }
}

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

var addLeadingZeros = (totalLength, s) => {
    let lenS = s.toString(16).length;
    for (lenS; lenS < totalLength; lenS++) {
        s = "0" + s.toString(16);
    }
    return s;
}

function scrumbleHash(hash) {
    let toReverse = hash;
    const hasPrefix = hash.indexOf("0x") !== -1;
    if (hasPrefix) {
        toReverse = hash.substring(2);
    }
    let toReverseArray = toReverse.split("");
    toReverseArray = toReverseArray.reverse();
    toReverse = toReverseArray.join("");
    if (hasPrefix) {
        return "0x" + toReverse;
    } else {
        return toReverse;
    }
}

///////////////////////////////////////////
//////// BTC API MOCKER Operations ////////
///////////////////////////////////////////
async function MockBtcApiChangeRoute(route) {
    let response = await fetch(`${BtcApiURL}route/${route}`);
    return response;
}

async function getBtcApiBlockNumber(number) {
    let response = await fetch(`${BtcApiURL}block/getBlock/${number}`);
    let result = await response.json();
    let btcInfo = {
        btcInfo: {
            height: result.block.header.height,
            hash: result.block.header.hash
        }
    };
    return btcInfo;
}

async function getNextBlockInMockBTCApi() {
    await sleep(apiPoolingTime + loadingTime);
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

//////////////////////////////////////
//////// Armadillo Operations ////////
//////////////////////////////////////
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

function getForkDetectionData(rskTag) {
    return {
        prefixHash: rskTag.substring(2, 42),
        CPV: rskTag.substring(42, 56),
        NU: parseInt("0x" + rskTag.substring(56, 58)),
        BN: parseInt("0x" + rskTag.substring(58))
    };
}

async function fakeMainchainBlock(rskBlockNumber) {
    let blockInfoOriginal = await mongo_utils.findOneMainchainBlock(rskBlockNumber, true);
    let blockInfo = JSON.parse(JSON.stringify(blockInfoOriginal));
    let prefixHash = scrumbleHash(blockInfo.rskInfo.forkDetectionData.prefixHash);
    let rskHash = scrumbleHash(blockInfo.rskInfo.hash);
    blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash;
    blockInfo.rskInfo.hash = rskHash;
    await mongo_utils.updateOneMainchainBlock(rskBlockNumber, true, blockInfo);
    return blockInfoOriginal;
}

async function swapMainchainBlockWithSibling(rskBlockNumber) {
    let blockInfoMainchain = await mongo_utils.findOneMainchainBlock(rskBlockNumber, true);
    let blockInfoSibling = await getSiblingFromRsk(rskBlockNumber);
    await mongo_utils.updateOneMainchainBlock(rskBlockNumber, true, blockInfoSibling);
    await mongo_utils.updateOneMainchainBlock(rskBlockNumber, false, blockInfoMainchain);
    return blockInfoMainchain;
}

async function MoveXBlocks(
    btcApiRoute, initialHeight, blocksToMove,
    apiPoolingTime, loadingTime) {
    let c = 1;
    await MockBtcApiChangeRoute(btcApiRoute);
    await setHeightInMockBTCApi(initialHeight);
    await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
    await setBlockAsLastChecked(initialHeight - 1);
    await sleep(apiPoolingTime + loadingTime);
    const blocksToAdvance = blocksToMove;
    for (let i = 0; i < blocksToAdvance; i++) {
        await getNextBlockInMockBTCApi(apiPoolingTime);
    }
    await sleep(loadingTime);
}

async function getBlockchainsAfterMovingXBlocks(
    btcApiRoute, initialHeight, blocksToMove,
    amountOfBlockchains, apiPoolingTime, loadingTime) {
    await MoveXBlocks(btcApiRoute, initialHeight, blocksToMove, apiPoolingTime, loadingTime);
    return blockchainsResponse = await getBlockchains(amountOfBlockchains);
}

async function getDBForksAfterMovingXBlocks(btcApiRoute, initialHeight, blocksToMove,
    apiPoolingTime, loadingTime) {
    await MoveXBlocks(btcApiRoute, initialHeight, blocksToMove, apiPoolingTime, loadingTime);
    return await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloForks);
}


async function setBlockAsLastChecked(blockNumber) {
    try {
        const btcBlock = await getBtcApiBlockNumber(blockNumber);
        await mongo_utils.updateLastCheckedBtcBlock(btcBlock);
    }
    catch (e) {
        return;
    }
}

////////////////////////////////
//////// RSK Operations ////////
////////////////////////////////
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

async function getRskBlockByNumber(blockNumber, context) {
    return rskdPromiseRequest("eth_getBlockByNumber", [blockNumber, false], context);
}

async function getRskBlockByHash(blockNumber, context) {
    let response = await rskdPromiseRequest("eth_getBlockByHash", [blockNumber, false], context);
    let responseJson = JSON.parse(response);
    return responseJson.result;
}

async function getRskBlocksByNumber(blockNumber, context) {
    let response = await rskdPromiseRequest("eth_getBlocksByNumber", [blockNumber], context);
    let responseJson = JSON.parse(response);
    return responseJson.result;
}

function getRskBlockHashOfSibling(blockArray) {
    for (let block in blockArray) {
        if (blockArray[block].inMainChain === false) {
            return blockArray[block].hash;
        }
    }
}

async function getSiblingFromRsk(rskBlockNumber) {
    let blocksAtHeight = await getRskBlocksByNumber(rskBlockNumber, context)
    let siblingHash = getRskBlockHashOfSibling(blocksAtHeight);
    let block = await getRskBlockByHash(siblingHash, context);
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
async function setRskTagInBtcMockData(btcBlocksJSON, btcBlockNumber, rskHeight, context) {
    const rskResponse = JSON.parse(await rskdPromiseRequest("eth_getBlockByNumber", ["0x" + rskHeight.toString(16), true], context));
    const rskTag = rskResponse.result.hashForMergedMining;
    btcBlocksJSON.raw[btcBlockNumber].coinbase.transaction.outputs[0].rskTag = rskTag;
    return btcBlocksJSON;
}
///////////////////////////////////////
//////// Validation Operations ////////
///////////////////////////////////////

function validateMergeMinedBlockResponse(response) {
    expect(response).to.have.property('id');
    expect(response).to.have.property('result');
    expect(response.result).to.have.property('blockImportedResult');
    expect(response.result).to.have.property('blockHash');
    expect(response.result).to.have.property('blockIncludedHeight');
}

async function validateRskBlockNodeVsArmadilloMonitor(armadilloBlock, mainchainInFork, inForkedBlock) {
    if (!inForkedBlock && (mainchainInFork === undefined || mainchainInFork)) {
        let height = "0x" + armadilloBlock.rskInfo.height.toString(16);
        let rskBlock = JSON.parse(await getRskBlockByNumber(height, context));
        let mergeMiningHash = rskBlock.result.hashForMergedMining;
        expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
        expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
        let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
        if (armadilloBlock.rskInfo.height === 1) {
            expect(armadilloBlock.rskInfo.forkDetectionData).to.be.null;
        } else {
            expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(prefixHashFromRskBlock);
            let CPVFromRskBlock = mergeMiningHash.substring(42, 56);
            expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.equal(CPVFromRskBlock);
            let nbrUnclesFromRskBlock = parseInt("0x" + mergeMiningHash.substring(56, 58));
            expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
            let heightFromHashForMergeMiningRskBlock = parseInt("0x" + mergeMiningHash.substring(58));
            expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
        }

    } else {
        expect(armadilloBlock.rskInfo.hash).to.be.equal("");
        expect(armadilloBlock.rskInfo.prevHash).to.be.equal("");
        expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(armadilloBlock.rskInfo.height);
    }
}

async function validateBtcBlockNodeVsArmadilloMonitor(armadilloBlock, btcRskMap, mainchainInFork, controlBtcInfo) {
    if (!mainchainInFork && controlBtcInfo) {
        const shouldHaveBtcInfo = Object.values(btcRskMap).includes(armadilloBlock.rskInfo.height);
        if (!shouldHaveBtcInfo) {
            expect(armadilloBlock.btcInfo).to.be.null;
        }
        else {
            expect(armadilloBlock.btcInfo).not.to.be.null;
            let btcBlockInfo = await getBlockByHashInMockBTCApi(armadilloBlock.btcInfo.hash);
            let btcHash = btcBlockInfo.coinbase.transactionBlockInfo.hash;
            let btcHeight = btcBlockInfo.coinbase.transactionBlockInfo.height;
            expect(armadilloBlock.btcInfo.height).to.be.equal(btcHeight);
            expect(armadilloBlock.btcInfo.hash).to.be.equal(btcHash);

        }
    }
}

async function validateRskBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock) {
    let height = "0x" + armadilloBlock.rskInfo.height.toString(16);
    let rskBlock = JSON.parse(await getRskBlockByNumber(height, context));
    expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
    expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
    if (armadilloBlock.rskInfo.height === 1) {
        expect(armadilloBlock.rskInfo.forkDetectionData).to.be.null;
    } else {
        let mergeMiningHash = rskBlock.result.hashForMergedMining;
        let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
        expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(prefixHashFromRskBlock);
        let CPVFromRskBlock = mergeMiningHash.substring(42, 56);
        expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.equal(CPVFromRskBlock);
        let nbrUnclesFromRskBlock = parseInt("0x" + mergeMiningHash.substring(56, 58));
        expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
        let heightFromHashForMergeMiningRskBlock = parseInt("0x" + mergeMiningHash.substring(58));
        expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
    }
}

function validateForkItemRskBlockMongoDB(forkItem) {
    expect(forkItem.rskInfo.hash).to.be.equal("");
    expect(forkItem.rskInfo.prevHash).to.be.equal("");
    if (forkItem.rskInfo.height >= 448) {
        expect(forkItem.rskInfo.forkDetectionData).to.be.an("object").that.is.not.empty;
        expect(forkItem.rskInfo.forkDetectionData.prefixHash).to.be.not.null.and.not.to.equal("");
        expect(forkItem.rskInfo.forkDetectionData.prefixHash.length).to.be.equal(40);
        expect(forkItem.rskInfo.forkDetectionData.CPV).to.be.not.null.and.not.to.equal("");
        expect(forkItem.rskInfo.forkDetectionData.CPV.length).to.be.equal(14);
        expect(forkItem.rskInfo.forkDetectionData.NU).to.be.not.null;
        expect(forkItem.rskInfo.forkDetectionData.NU).to.be.a("number");
        expect(forkItem.rskInfo.forkDetectionData.BN).to.be.equal(forkItem.rskInfo.height);
    }
}
async function validateRskMainchainBlocksInForkMongoDB(fork) {
    expect(fork).not.to.be.null;
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({ rskInfo: fork.mainchainRangeForkCouldHaveStarted.endBlock });
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({ rskInfo: fork.mainchainRangeForkCouldHaveStarted.startBlock });
}

async function validateForkRskBlockMongoDB(fork, expectedAmountOfForkItems) {
    await validateRskMainchainBlocksInForkMongoDB(fork);
    expect(fork.items.length).to.be.equal(expectedAmountOfForkItems);
    for (forkItemPos in fork.items) {
        await validateForkItemRskBlockMongoDB(fork.items[forkItemPos]);
    }
}

async function validateForksRskBlockMongoDB(forks, forkItemsExpected) {
    expect(forks.length).to.be.equal(forkItemsExpected.length);
    for (forkPos in forks) {
        await validateForkRskBlockMongoDB(forks[forkPos], forkItemsExpected[forkPos]);
    }
}

async function validateMainchainRskMongoDB(mainchain, expectedLength) {

    expect(mainchain).to.be.an('array').that.is.not.empty;
    expect(mainchain.length).to.be.equal(expectedLength);
    for (let block in mainchain) {
        await validateRskBlockNodeVsArmadilloMonitorMongoDB(mainchain[block]);
        await validateBtcBlockNodeVsArmadilloMonitorMongoDB(mainchain[block], rskBlockHeightsWithBtcBlock());
    }
}

async function validateBtcBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock, btcRskMap, mainchainInFork) {
    if (!mainchainInFork) {
        let shouldHaveBtcInfo = Object.values(btcRskMap).includes(armadilloBlock.rskInfo.height);
        if (!shouldHaveBtcInfo) {
            expect(armadilloBlock.btcInfo).to.be.null;
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
}

async function validateMainchain(nbrOfMainchainBlocksToFetch, lengthOfExpectedMainchain, reOrgBlocks) {
    const mainchainResponse = await getBlockchains(nbrOfMainchainBlocksToFetch);
    const blocks = mainchainResponse.data.mainchain;
    expect(blocks.length).to.be.equal(lengthOfExpectedMainchain);
    let countOfReOrgBlocks = 0
    for (let block in blocks) {
        const controlBtcInfo = block === 0 || block === (blocks.length - 1);
        if (reOrgBlocks && (Object.keys(reOrgBlocks).includes(blocks[block].rskInfo.height.toString()))) {
            countOfReOrgBlocks++;
            for (let reOrgBlockPos in Object.keys(reOrgBlocks)) {
                let reorgCompareBlock = reOrgBlocks[Object.keys(reOrgBlocks)[reOrgBlockPos]];
                if (reorgCompareBlock.rskInfo.height === blocks[block].rskInfo.height) {
                    expect(reorgCompareBlock.rskInfo.hash).to.be.equal(blocks[block].rskInfo.hash);
                    expect(reorgCompareBlock.rskInfo.forkDetectionData.prefixHash)
                        .to.be.equal(blocks[block].rskInfo.forkDetectionData.prefixHash);
                }
            }
        }
        await validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
        await validateBtcBlockNodeVsArmadilloMonitor(blocks[block], rskBlockHeightsWithBtcBlock(), controlBtcInfo);
    }
    if (reOrgBlocks) {
        expect(Object.keys(reOrgBlocks).length).to.be.equal(countOfReOrgBlocks);
    }
}

async function validateForksCreated(blockchainsResponse, lastForksResponse, _numberOfForksExpected, rskTagsMap, expectedMainchainBlocks, lengthOfForks) {
    const blockchainForks = blockchainsResponse.data.forks;
    expect(lengthOfForks).not.to.be.null;
    const numberOfForksExpected = lengthOfForks.length;
    expect(blockchainsResponse.data).to.be.an('object').that.is.not.empty;
    // const lastForks = lastForksResponse.data;
    expect(blockchainForks).to.be.an('array').that.is.not.empty;
    expect(blockchainForks.length).to.be.equal(numberOfForksExpected);
    // expect(lastForks).to.be.an('array').that.is.not.empty;
    // expect(lastForks.length).to.be.equal(numberOfForksExpected);
    for (forkPos in blockchainForks) {
        const fork = blockchainForks[forkPos];
        expect(fork.length).to.be.equal(lengthOfForks[forkPos] + 2);
        for (pos in fork) {
            expect(fork[pos]).not.to.be.null;//
            fork[pos].src = "blockchains";
            fork[pos].pos = pos;
            let mainchainInFork = (pos >= (fork.length - 2));
            await validateBtcBlockNodeVsArmadilloMonitor(fork[pos], rskTagsMap, mainchainInFork);
            await validateRskBlockNodeVsArmadilloMonitor(fork[pos], mainchainInFork, !mainchainInFork);
        }
    }
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
    getBlockByHashInMockBTCApi,
    getForksFromHeight,
    getBlockchains,
    getBlockchainsAfterMovingXBlocks,
    getDBForksAfterMovingXBlocks,
    rskBlockHeightsWithBtcBlock,
    setBlockAsLastChecked,
    apiPoolingTime,
    timeoutTests,
    loadingTime,
    context,
    fakeMainchainBlock,
    swapMainchainBlockWithSibling,
    validateForksCreated,
    validateMainchain,
    validateRskBlockNodeVsArmadilloMonitor,
    validateBtcBlockNodeVsArmadilloMonitor,
    validateRskBlockNodeVsArmadilloMonitorMongoDB,
    validateBtcBlockNodeVsArmadilloMonitorMongoDB,
    validateForksRskBlockMongoDB,
    validateMainchainRskMongoDB
}