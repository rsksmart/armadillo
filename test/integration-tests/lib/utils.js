const BtcApiURL = "http://localhost:5000/";
const ArmadilloApiURL = "http://localhost:6000/";
const Curl = require('node-libcurl').Curl;
const randomHex = require('randomhex');
const expect = require('chai').expect;
const btclib = require('bitcoinjs-lib');
const fs = require('fs')
const CURL_DEFAULT_HTTP_VERSION = "	1.1";
const submitMethodCases = require('./submit-method-cases').submitMethodCases;
const fetch = require("node-fetch");
const mongo_utils = require("./mongo-utils");
const timeoutTests = 5 * 60 * 1000;//5 minutes
const apiPoolingTime = 80;
const loadingTime = 800;
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
//This arrays must match the same from btc-api-mocker
//TODO: source both projects from the same dataset
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
    "129": 7484,
    "131": 7372,
    "133": 7374,
    "135": 7483,
    "137": 6470,
    "140": 6530
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
    "93": 7264,
    "94": 7284,
    "96": 7299,
    "100": 7304,
    "104": 7320,
    "110": 7365,
    "116": 7375,
    "124": 7425
};

const mapRskNoMatchNoMatchCPV2B = {
    "65": 4723,
    "66": 4733,
    "73": 5102,
    "75": 5108,
    "117": 7395,
    "127": 7440
};

const mapRskNoMatchNoMatchCPV7B = {
    "79": 5731,
    "80": 5734,
    "86": 6754,
    "90": 6774
};

const futureBlocks = {
    "130": 7510,
    "134": 7674,
    "136": 8014
}

function rskBlockHeightsWithBtcBlock() {
    return {
        ...mapRskMatch,
        ...mapRskNoMatchMatchCPV,
        ...mapRskNoMatchNoMatchCPV2B,
        ...mapRskNoMatchNoMatchCPV7B,
        ...futureBlocks
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

function filterObject(object, start, end) {
    let returnObject = {};
    let keys = Object.keys(object);
    for (k in keys) {
        let key = parseInt(keys[k]);
        if (key >= start && key <= end) {
            returnObject[key] = object[key];
        }
    }
    return returnObject;
}

function reverseForkItems(forks) {
    for (fork in forks){
        forks[fork].items = forks[fork].items.reverse();
    }
    return forks;
}

async function mongoResponseToBlockchainsFromArmadilloApi(forksFromDbPath, mainchainFromDbPath) {
    let forks = [];
    let mainchain = [];
    try {
        forks = JSON.parse(await fs.readFileSync(forksFromDbPath));
        forks = reverseForkItems(forks);
    } catch (e) {
        console.log("Couldn't get file " + forksFromDbPath);
    }
    try {
        mainchain = JSON.parse(await fs.readFileSync(mainchainFromDbPath));
    } catch (e) {
        console.log("Couldn't get file " + mainchainFromDbPath);
    }
    return {
        "message": "Get mainchain and forks in the last N blocks",
        "success": true,
        "data": {
            "forks": forks,
            "mainchain": mainchain.reverse()
        }
    }
}

async function insertToDbFromFile(fileName, collection) {
    const insertDataText = fs.readFileSync(fileName);
    const insertDataJSON = JSON.parse(insertDataText);
    if (insertDataJSON.length !== 0) {
        await mongo_utils.insertDocuments(mongo_utils.ArmadilloDB, collection, insertDataJSON);
    }
}

/** Auxiliary function to save mongo output for certain end to end tests
 * @needToSaveOutputData boolean to determine if output data should be saved or not
 */
async function saveOutputData(needToSaveOutputData, forksFile, mainchainFile) {
    if (needToSaveOutputData) {
        await mongo_utils.saveCollectionToFile(mongo_utils.ArmadilloForks, forksFile);
        await mongo_utils.saveCollectionToFile(mongo_utils.ArmadilloMainchain, mainchainFile);
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
        await getNextBlockInMockBTCApi(apiPoolingTime + loadingTime);
    }
    await sleep(loadingTime * (4 + blocksToAdvance));
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

function getCPVStartHeightMainchain(forkItemHeight, cpvDiff) {
    if (cpvDiff === 7) {
        return 1;
    }
    return forkItemHeight - 1 - ((forkItemHeight - 1) % 64) - cpvDiff * 64;
}

function getCPVEndHeightMainchain(forkItemHeight, cpvDiff, bestBlockHeight) {
    if (cpvDiff <= 0) {
        if (forkItemHeight <= bestBlockHeight) {
            return forkItemHeight;

        } else {
            return bestBlockHeight;
        }
    } else {
        let endCandidate = forkItemHeight - ((forkItemHeight - 1) % 64) - (cpvDiff - 1) * 64 - 1
        if (endCandidate > bestBlockHeight) {
            return bestBlockHeight;
        }
        else {
            return endCandidate;
        }
    }
}

async function validateRskBlockNodeVsArmadilloMonitor(armadilloBlock, mainchainInFork, inForkedBlock, firstForkItemHeight, cpvDiff, bestBlockHeight, startOrEndBlockMainchain) {
    if (!inForkedBlock && (mainchainInFork === undefined || mainchainInFork)) {
        let height = "0x" + armadilloBlock.rskInfo.height.toString(16);
        let rskBlock = JSON.parse(await getRskBlockByNumber(height, context));
        let mergeMiningHash = rskBlock.result.hashForMergedMining;
        expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
        expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
        let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
        const mainchainStartExpected = getCPVStartHeightMainchain(firstForkItemHeight, cpvDiff);
        const mainchainEndExpected = getCPVEndHeightMainchain(firstForkItemHeight, cpvDiff, bestBlockHeight);
        if (startOrEndBlockMainchain === "start") {
            expect(armadilloBlock.rskInfo.height).to.be.equal(mainchainStartExpected, `height of start armadillo block ${armadilloBlock.rskInfo.height} is different of expected ${mainchainStartExpected}`);
        }
        if (startOrEndBlockMainchain === "end") {
            expect(armadilloBlock.rskInfo.height).to.be.equal(mainchainEndExpected, `height of end armadillo block ${armadilloBlock.rskInfo.height} is different of expected ${mainchainEndExpected}`);
        }
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
        expect(armadilloBlock.rskForkInfo.forkDetectionData.prefixHash).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskForkInfo.forkDetectionData.CPV).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskForkInfo.forkDetectionData.NU).to.be.not.null.and.not.to.equal("");
        expect(armadilloBlock.rskForkInfo.forkDetectionData.BN).to.be.not.null.and.not.to.equal("");
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
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.endBlock });
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.startBlock });
}

async function validateForkRskBlockMongoDB(fork, expectedAmountOfForkItems) {
    await validateRskMainchainBlocksInForkMongoDB(fork);
    expect(fork.items.length).to.be.equal(expectedAmountOfForkItems);
    fork.items = fork.items.sort((a,b) => b.btcInfo.height - a.btcInfo.height);
    //WIP Still debugging v
// console.log(`last btc height of fork in fork items is ${fork.items[0].btcInfo.height} vs variable outside the array of ${btcHeightLastTagFound}`)
    // console.log(`last rsk height of fork in fork items is ${fork.items[0].rskForkInfo.height} vs variable outside the array of ${rskHeightLastTagFound}`);
    expect(fork.items[0].btcInfo.height).to.be.equal(btcHeightLastTagFound, 
        `last btc height of fork in fork items is ${fork.items[0].btcInfo.height} vs variable outside the array of ${btcHeightLastTagFound}`);
    expect(fork.items[0].rskForkInfo.height).to.be.equal(rskHeightLastTagFound,
        `last rsk height of fork in fork items is ${fork.items[0].rskForkInfo.height} vs variable outside the array of ${rskHeightLastTagFound}`);
    for (forkItemPos in fork.items) {
        await validateForkItemRskBlockMongoDB(fork.items[forkItemPos]);
    }
}

async function validateForksRskBlockMongoDB(forks, forkItemsExpected) {
    expect(forks.length).to.be.equal(forkItemsExpected.length);
    for (forkPos in forks.items) {
        await validateForkRskBlockMongoDB(forks.items[forkPos], forkItemsExpected[forkPos]);
    }
}

async function validateMainchainRskMongoDB(mainchain, expectedLength, btcStart, btcEnd) {

    expect(mainchain).to.be.an('array').that.is.not.empty;
    expect(mainchain.length).to.be.equal(expectedLength);
    let rskBlockHeightsWithBtc = rskBlockHeightsWithBtcBlock();
    if (btcStart && btcEnd) {
        rskBlockHeightsWithBtc = filterObject(rskBlockHeightsWithBtc, btcStart, btcEnd);
    }
    for (let block in mainchain) {
        await validateRskBlockNodeVsArmadilloMonitorMongoDB(mainchain[block]);
        await validateBtcBlockNodeVsArmadilloMonitorMongoDB(mainchain[block], rskBlockHeightsWithBtc);
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

async function validateForksCreated(blockchainsResponse, lastForksResponse, _numberOfForksExpected, rskTagsMap, expectedMainchainBlocks, lengthOfForks, cpvDiff, bestBlockHeight) {
    const blockchainForks = blockchainsResponse.data.forks;
    expect(lengthOfForks).not.to.be.null;
    const numberOfForksExpected = lengthOfForks.length;
    expect(blockchainsResponse.data).to.be.an('object').that.is.not.empty;
    expect(blockchainForks).to.be.an('array').that.is.not.empty;
    expect(blockchainForks.length).to.be.equal(numberOfForksExpected, `Expected ${numberOfForksExpected} vs Actual ${blockchainForks.length}`);
    for (forkPos in blockchainForks) {
        const fork = blockchainForks[forkPos];
        const firstForkItem = fork.firstDetected;
        const firstForkItemHeight = firstForkItem.BN;
        expect(fork.items.length).to.be.equal(lengthOfForks[forkPos]);
        let cpvDiffForFork = cpvDiff;
        if (typeof (cpvDiff) === "object") {
            cpvDiffForFork = cpvDiff[forkPos];
        }
        for (pos in fork.items) {
            expect(fork.items[pos]).not.to.be.null;//
            fork.items[pos].src = "blockchains";
            fork.items[pos].pos = pos;
            let mainchainInFork = false;
            let startOrEnd = "";

            await validateBtcBlockNodeVsArmadilloMonitor(fork.items[pos], rskTagsMap, false);
            await validateRskBlockNodeVsArmadilloMonitor(fork.items[pos], mainchainInFork, false, firstForkItemHeight, cpvDiffForFork, bestBlockHeight, startOrEnd);
        }
        await validateRskBlockNodeVsArmadilloMonitor({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.startBlock }, true, false, firstForkItemHeight, cpvDiffForFork, bestBlockHeight, "start");
        await validateRskBlockNodeVsArmadilloMonitor({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.endBlock }, true, false, firstForkItemHeight, cpvDiffForFork, bestBlockHeight, "end");
    }
}

async function removeTimeFieldFromForksResponse(blockchainsResponse) {
    let blockchainsResponseModified = JSON.parse(JSON.stringify(blockchainsResponse));
    for (fork in blockchainsResponseModified.data.forks) {
        for (forkItem in blockchainsResponseModified.data.forks[fork].items) {
            if (blockchainsResponseModified.data.forks[fork].items[forkItem].hasOwnProperty("time")) {
                blockchainsResponseModified.data.forks[fork].items[forkItem].time = "";
            }
        }
    }
    return blockchainsResponseModified;
}

async function validateMongoOutput(mainchainFile, forksFile) {
    await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
    await insertToDbFromFile(forksFile, mongo_utils.ArmadilloForks);
    await insertToDbFromFile(mainchainFile, mongo_utils.ArmadilloMainchain);
    const expectedResponseBlockchains = await mongoResponseToBlockchainsFromArmadilloApi(forksFile, mainchainFile);
    expect(expectedResponseBlockchains.data.mainchain).not.to.be.null;
    expect(expectedResponseBlockchains.data.forks).not.to.be.null;

    const expectedResponseBlockchainsWoTimeField = await removeTimeFieldFromForksResponse(expectedResponseBlockchains);
    const blockchainsResponse = await getBlockchains(10000);
    const blockchainsResponseWoTimeField = await removeTimeFieldFromForksResponse(blockchainsResponse);
    //For debug only: Start **********
    const debug = false;
    if (debug) {
        expectedResponseFileName = "debug_expectedResponse.json";
        actualResponseFileName = "debug_actualResponse.json";
        fs.writeFileSync(expectedResponseFileName,JSON.stringify(expectedResponseBlockchainsWoTimeField,null,2));
        fs.writeFileSync(actualResponseFileName, JSON.stringify(blockchainsResponseWoTimeField,null,2));
    }
    //For debug only: Finish *********
   expect(blockchainsResponseWoTimeField.data).to.be.eql(expectedResponseBlockchainsWoTimeField.data);

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
    validateMainchainRskMongoDB,
    mongoResponseToBlockchainsFromArmadilloApi,
    insertToDbFromFile,
    validateMongoOutput,
    saveOutputData
}