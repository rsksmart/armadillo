import { expect } from 'chai';
import { filterObject, mongoResponseToBlockchainsFromArmadilloApi } from './utils';
import { getBlockByHashInMockBTCApi } from './btc-api-mocker';
import { rskBlockHeightsWithBtcBlock } from './configs';
import { deleteDB, armadilloDB, armadilloForks, armadilloMainchain, insertToDbFromFile } from './mongo-utils';
import { getBlockchains } from './armadillo-operations';
import { getRskBlockByNumber } from './rsk-operations';
import { BlockchainController } from '../../../src/api/controllers/blockchain-controller';
import { getStartHeightMainchainForCPVDiff, getEndHeightMainchainForCPVDiff } from './cpv-helper';

export function validateMergeMinedBlockResponse(response) {
    expect(response).to.have.property('id');
    expect(response).to.have.property('result');
    expect(response.result).to.have.property('blockImportedResult');
    expect(response.result).to.have.property('blockHash');
    expect(response.result).to.have.property('blockIncludedHeight');
}
export async function validateRskBlockNodeVsArmadilloMonitor(
    armadilloBlock,
    mainchainInFork = false,
    inForkedBlock = false,
    firstForkItemHeight = 0,
    cpvDiff = 0,
    bestBlockHeight = 0,
    startOrEndBlockMainchain = ''
) {
    if (!inForkedBlock && (mainchainInFork === undefined || mainchainInFork)) {
        let height = '0x' + armadilloBlock.rskInfo.height.toString(16);
        let rskBlock = JSON.parse((await getRskBlockByNumber(height, context)).toString());
        let mergeMiningHash = rskBlock.result.hashForMergedMining;
        expect(armadilloBlock.rskInfo.hash).to.be.equal(rskBlock.result.hash);
        expect(armadilloBlock.rskInfo.prevHash).to.be.equal(rskBlock.result.parentHash);
        let prefixHashFromRskBlock = mergeMiningHash.substring(2, 42);
        const mainchainStartExpected = getStartHeightMainchainForCPVDiff(firstForkItemHeight, cpvDiff);
        const mainchainEndExpected = getEndHeightMainchainForCPVDiff(firstForkItemHeight, cpvDiff, bestBlockHeight);
        if (startOrEndBlockMainchain === 'start') {
            expect(armadilloBlock.rskInfo.height).to.be.equal(
                mainchainStartExpected,
                `height of start armadillo block ${armadilloBlock.rskInfo.height} is different of expected ${mainchainStartExpected}`
            );
        }
        if (startOrEndBlockMainchain === 'end') {
            expect(armadilloBlock.rskInfo.height).to.be.equal(
                mainchainEndExpected,
                `height of end armadillo block ${armadilloBlock.rskInfo.height} is different of expected ${mainchainEndExpected}`
            );
        }
        if (armadilloBlock.rskInfo.height === 1) {
            expect(armadilloBlock.rskInfo.forkDetectionData).to.be.null;
        } else {
            expect(armadilloBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(prefixHashFromRskBlock);
            let CPVFromRskBlock = mergeMiningHash.substring(42, 56);
            expect(armadilloBlock.rskInfo.forkDetectionData.CPV).to.be.equal(CPVFromRskBlock);
            let nbrUnclesFromRskBlock = parseInt('0x' + mergeMiningHash.substring(56, 58));
            expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
            let heightFromHashForMergeMiningRskBlock = parseInt('0x' + mergeMiningHash.substring(58));
            expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
        }
    } else {
        expect(armadilloBlock.rskForkInfo.forkDetectionData.prefixHash).to.be.not.null.and.not.to.equal('');
        expect(armadilloBlock.rskForkInfo.forkDetectionData.CPV).to.be.not.null.and.not.to.equal('');
        expect(armadilloBlock.rskForkInfo.forkDetectionData.NU).to.be.not.null.and.not.to.equal('');
        expect(armadilloBlock.rskForkInfo.forkDetectionData.BN).to.be.not.null.and.not.to.equal('');
    }
}

export async function validateBtcBlockNodeVsArmadilloMonitor(armadilloBlock, btcRskMap, mainchainInFork, controlBtcInfo = false) {
    if (!mainchainInFork && controlBtcInfo) {
        const shouldHaveBtcInfo = Object.values(btcRskMap).includes(armadilloBlock.rskInfo.height);
        if (!shouldHaveBtcInfo) {
            expect(armadilloBlock.btcInfo).to.be.null;
        } else {
            expect(armadilloBlock.btcInfo).not.to.be.null;
            let btcBlockInfo = await this.getBlockByHashInMockBTCApi(armadilloBlock.btcInfo.hash);
            let btcHash = btcBlockInfo.coinbase.transactionBlockInfo.hash;
            let btcHeight = btcBlockInfo.coinbase.transactionBlockInfo.height;
            expect(armadilloBlock.btcInfo.height).to.be.equal(btcHeight);
            expect(armadilloBlock.btcInfo.hash).to.be.equal(btcHash);
        }
    }
}

export async function validateRskBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock) {
    let height = '0x' + armadilloBlock.rskInfo.height.toString(16);
    let rskBlock = JSON.parse(await this.getRskBlockByNumber(height, context));
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
        let nbrUnclesFromRskBlock = parseInt('0x' + mergeMiningHash.substring(56, 58));
        expect(armadilloBlock.rskInfo.forkDetectionData.NU).to.be.equal(nbrUnclesFromRskBlock);
        let heightFromHashForMergeMiningRskBlock = parseInt('0x' + mergeMiningHash.substring(58));
        expect(armadilloBlock.rskInfo.forkDetectionData.BN).to.be.equal(heightFromHashForMergeMiningRskBlock);
    }
}

export function validateForkItemRskBlockMongoDB(forkItem) {
    expect(forkItem.rskInfo.hash).to.be.equal('');
    expect(forkItem.rskInfo.prevHash).to.be.equal('');
    if (forkItem.rskInfo.height >= 448) {
        expect(forkItem.rskInfo.forkDetectionData).to.be.an('object').that.is.not.empty;
        expect(forkItem.rskInfo.forkDetectionData.prefixHash).to.be.not.null.and.not.to.equal('');
        expect(forkItem.rskInfo.forkDetectionData.prefixHash.length).to.be.equal(40);
        expect(forkItem.rskInfo.forkDetectionData.CPV).to.be.not.null.and.not.to.equal('');
        expect(forkItem.rskInfo.forkDetectionData.CPV.length).to.be.equal(14);
        expect(forkItem.rskInfo.forkDetectionData.NU).to.be.not.null;
        expect(forkItem.rskInfo.forkDetectionData.NU).to.be.a('number');
        expect(forkItem.rskInfo.forkDetectionData.BN).to.be.equal(forkItem.rskInfo.height);
    }
}
export async function validateRskMainchainBlocksInForkMongoDB(fork) {
    expect(fork).not.to.be.null;
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({
        rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.endBlock,
    });
    await validateRskBlockNodeVsArmadilloMonitorMongoDB({
        rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.startBlock,
    });
}

export async function validateForkRskBlockMongoDB(fork, expectedAmountOfForkItems) {
    await validateRskMainchainBlocksInForkMongoDB(fork);
    expect(fork.items.length).to.be.equal(expectedAmountOfForkItems);
    for (let forkItemPos in fork.items) {
        await validateForkItemRskBlockMongoDB(fork.items[forkItemPos]);
    }
}

export async function validateForksRskBlockMongoDB(forks, forkItemsExpected) {
    expect(forks.length).to.be.equal(forkItemsExpected.length);
    for (let forkPos in forks) {
        await validateForkRskBlockMongoDB(forks[forkPos], forkItemsExpected[forkPos]);
    }
}

export async function validateMainchainRskMongoDB(mainchain, expectedLength, btcStart = null, btcEnd = null) {
    expect(mainchain).to.be.an('array').that.is.not.empty;
    expect(mainchain.length).to.be.equal(expectedLength);
    let rskBlockHeightsWithBtc: any = rskBlockHeightsWithBtcBlock();
    if (btcStart && btcEnd) {
        rskBlockHeightsWithBtc = filterObject(rskBlockHeightsWithBtc, btcStart, btcEnd);
    }

    for (let block in mainchain) {
        await this.validateRskBlockNodeVsArmadilloMonitorMongoDB(mainchain[block]);
        await this.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mainchain[block], rskBlockHeightsWithBtc);
    }
}

export async function validateBtcBlockNodeVsArmadilloMonitorMongoDB(armadilloBlock, btcRskMap, mainchainInFork) {
    if (!mainchainInFork) {
        let shouldHaveBtcInfo = Object.values(btcRskMap).includes(armadilloBlock.rskInfo.height);

        if (!shouldHaveBtcInfo) {
            expect(armadilloBlock.btcInfo).to.be.null;
        } else {
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

export async function validateMainchain(nbrOfMainchainBlocksToFetch, lengthOfExpectedMainchain, reOrgBlocks = null) {
    const mainchainResponse = await getBlockchains(nbrOfMainchainBlocksToFetch);
    const blocks = mainchainResponse.data.mainchain;
    expect(blocks.length).to.be.equal(lengthOfExpectedMainchain);
    let countOfReOrgBlocks = 0;
    for (let block in blocks) {
        // const controlBtcInfo = block === 0 || block === (blocks.length - 1);
        if (reOrgBlocks && Object.keys(reOrgBlocks).includes(blocks[block].rskInfo.height.toString())) {
            countOfReOrgBlocks++;
            for (let reOrgBlockPos in Object.keys(reOrgBlocks)) {
                let reorgCompareBlock = reOrgBlocks[Object.keys(reOrgBlocks)[reOrgBlockPos]];
                if (reorgCompareBlock.rskInfo.height === blocks[block].rskInfo.height) {
                    expect(reorgCompareBlock.rskInfo.hash).to.be.equal(blocks[block].rskInfo.hash);
                    expect(reorgCompareBlock.rskInfo.forkDetectionData.prefixHash).to.be.equal(blocks[block].rskInfo.forkDetectionData.prefixHash);
                }
            }
        }
        await validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
        await validateBtcBlockNodeVsArmadilloMonitor(blocks[block], rskBlockHeightsWithBtcBlock(), this.controlBtcInfo);
    }

    if (reOrgBlocks) {
        expect(Object.keys(reOrgBlocks).length).to.be.equal(countOfReOrgBlocks);
    }
}

export async function validateForksCreated(blockchain, rskTagsMap, cpvDiff, forksArrayWithLengths, bestBlockHeight) {
    const forks: any[] = blockchain.data.forks;
    expect(forks.length).to.be.equal(forksArrayWithLengths.length);

    for (const forkPos of forks) {
        const fork = forks[forkPos];
        expect(fork.items.length).to.be.equal(forksArrayWithLengths[forkPos]);
        let cpvDiffForFork = cpvDiff;

        if (typeof cpvDiff === 'object') {
            cpvDiffForFork = cpvDiff[forkPos];
        }

        for (let pos in fork.items) {
            expect(fork.items[pos]).not.to.be.null; //
            fork.items[pos].src = 'blockchains';
            fork.items[pos].pos = pos;
            let mainchainInFork = false;
            let startOrEnd = '';

            await validateBtcBlockNodeVsArmadilloMonitor(fork.items[pos], rskTagsMap, false);
            await validateRskBlockNodeVsArmadilloMonitor(fork.items[pos], mainchainInFork, false, fork.firstDetected.BN, cpvDiffForFork, bestBlockHeight, startOrEnd);
        }

        await validateRskBlockNodeVsArmadilloMonitor(
            {
                rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.startBlock,
            },
            true,
            false,
            fork.firstDetected.BN,
            cpvDiffForFork,
            bestBlockHeight,
            'start'
        );
        await validateRskBlockNodeVsArmadilloMonitor(
            { rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.endBlock },
            true,
            false,
            fork.firstDetected.BN,
            cpvDiffForFork,
            bestBlockHeight,
            'end'
        );
    }
}

export async function validateFork(blockchain, rskTagsMap, cpvDiff, forksArrayWithLengths) {
    // const forks : any[] = blockchain.data.forks;
    // expect(forks.length).to.be.equal(forksArrayWithLengths.length);
    // for (const forkPos of forks) {
    //     const fork = forks[forkPos];
    //     expect(fork.items.length).to.be.equal(forksArrayWithLengths[forkPos]);
    //     let cpvDiffForFork = cpvDiff;
    //     if (typeof (cpvDiff) === "object") {
    //         cpvDiffForFork = cpvDiff[forkPos];
    //     }
    //     for (let pos in fork.items) {
    //         expect(fork.items[pos]).not.to.be.null;//
    //         fork.items[pos].src = "blockchains";
    //         fork.items[pos].pos = pos;
    //         let mainchainInFork = false;
    //         let startOrEnd = "";
    //         await validateBtcBlockNodeVsArmadilloMonitor(fork.items[pos], rskTagsMap, false);
    //         await validateRskBlockNodeVsArmadilloMonitor(fork.items[pos], mainchainInFork, false, fork.firstDetected.BN, cpvDiffForFork, bestBlockHeight, startOrEnd);
    //     }
    //     await validateRskBlockNodeVsArmadilloMonitor({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.startBlock }, true, false, fork.firstDetected.BN, cpvDiffForFork, bestBlockHeight, "start");
    //     await validateRskBlockNodeVsArmadilloMonitor({ rskInfo: fork.mainchainRangeWhereForkCouldHaveStarted.endBlock }, true, false, fork.firstDetected.BN, cpvDiffForFork, bestBlockHeight, "end");
    // }
}

export async function validateMongoOutput(mainchainFile, forksFile) {
    const expectedResponseBlockchains = await mongoResponseToBlockchainsFromArmadilloApi(forksFile, mainchainFile);
    await insertToDbFromFile(forksFile, armadilloForks);
    await insertToDbFromFile(mainchainFile, armadilloMainchain);
    const blockchainsResponse = await getBlockchains(1000);
    // Debugging messages still in use.
    // console.log("ACTUAL _____________");
    // console.log("FORK Length: " + blockchainsResponse.data.forks.length);
    // console.log("MAINCHAIN Length: " + blockchainsResponse.data.mainchain.length);
    // console.log("EXPECTED ___________");
    // console.log("FORK Length: " + expectedResponseBlockchains.data.forks.length);
    // console.log("MAINCHAIN Length: " + expectedResponseBlockchains.data.mainchain.length);
    expect(blockchainsResponse.data).to.be.eql(expectedResponseBlockchains.data);
}
