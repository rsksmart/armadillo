import { expect } from 'chai'
import { readFileSync } from 'fs'
import { BlockchainHistory } from '../../src/api/common/models'
import { BtcBlock } from '../../src/common/btc-block'
import { Fork, ForkItem, Item, RangeForkInMainchain } from '../../src/common/forks'
import { RskBlockInfo, RskForkItemInfo } from '../../src/common/rsk-block'
import { BtcApiConfig } from '../../src/config/btc-api-config'
import { RskApiConfig } from '../../src/config/rsk-api-config'
import { HttpBtcApi } from '../../src/services/btc-api'
import { ForkService } from '../../src/services/fork-service'
import { MainchainService } from '../../src/services/mainchain-service'
import { RskApiService } from '../../src/services/rsk-api-service'
import { MongoStore } from '../../src/storage/mongo-store'
import { getBlockchains, getBlockchainsAfterMovingXBlocks, moveXBlocks, setUpInitialHeight } from './lib/armadillo-operations'
import { setHeightInMockBTCApi } from './lib/btc-api-mocker'
import { bestRskBlock, dataInputPath, DEFAULT_CONFIG_PATH } from './lib/configs'
import { getEndHeightMainchainForCPVDiff, getStartHeightMainchainForCPVDiff } from './lib/cpv-helper'

const firstBtcBlock: number = 8704

const heightOfNoRskTags: number = firstBtcBlock + 0
const heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff: number =
    firstBtcBlock + 129
const heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff: number =
    firstBtcBlock + 133
const heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff: number =
    firstBtcBlock + 135

let btcApiService: HttpBtcApi
let rskApiService: RskApiService
let mongoStoreForks: MongoStore
let mongoStoreMainchain: MongoStore
let forkService: ForkService
let mainchainService: MainchainService
describe('RSK Forks in the future tests', () => {
    before(async () => {
        // db = await connectDB(armadilloDB)
        var mainConfig = JSON.parse(
            readFileSync(DEFAULT_CONFIG_PATH).toString()
        )
        let mongoConfigForks = mainConfig.store
        mongoConfigForks.collectionName = mainConfig.store.collections.forks
        mongoStoreForks = new MongoStore(mongoConfigForks)
        forkService = new ForkService(mongoStoreForks)

        await forkService.connect()
        let mongoConfigMainchain = mainConfig.store
        mongoConfigMainchain.collectionName =
            mainConfig.store.collections.mainchain
        mongoStoreMainchain = new MongoStore(mongoConfigMainchain)
        mainchainService = new MainchainService(mongoStoreMainchain)
        await mainchainService.connect()
        btcApiService = new HttpBtcApi(
            BtcApiConfig.fromObject(mainConfig.btcApi)
        )
        rskApiService = new RskApiService(
            RskApiConfig.fromObject(mainConfig.rskApi)
        )
    })
    after(async () => {
        await mainchainService.disconnect()
        await forkService.disconnect()
        // await disconnectDB(db)
    })
    beforeEach(async () => {
        // await deleteDB(db) //Esto borra producción, hay que connectar el monitor y la api que ejecutan a la de test.
        await forkService.deleteAll()
        await mainchainService.deleteAll()
    })
    afterEach(async () => {
        await setHeightInMockBTCApi(heightOfNoRskTags)
    })

    describe('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, end to end', () => {
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff
            let btcWitnessBlockHeight: number = initialHeight + 1
            const blocksToMove: number = 1
            const cpvDiffExpected: number = 0
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        })
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 3 bytes CPV match', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff
            const btcWitnessBlockHeight = initialHeight + 1
            const blocksToMove = 1
            const cpvDiffExpected = 4
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        })
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff
            const btcWitnessBlockHeight = initialHeight + 1
            const blocksToMove = 1
            const cpvDiffExpected = 7
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            start.forkDetectionData = null
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        })
    })
    describe('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo input validation', () => {
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff
            let btcWitnessBlockHeight: number = initialHeight + 1
            const blocksToMove: number = 1
            const cpvDiffExpected: number = 0
            await setUpInitialHeight(initialHeight)
            await moveXBlocks(blocksToMove)
            let forks: Fork[] = await forkService.getAll()
            let mainchain: Item[] = await mainchainService.getAll()
            const time: string = forks[0].getForkItems()[0].time
            //Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                time
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )

            expect(forks).to.be.eql([forkExpected])
            expect(mainchain).to.be.eql([itemExpected])
        })
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo input validation', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff
            const btcWitnessBlockHeight = initialHeight + 1
            const blocksToMove = 1
            const cpvDiffExpected = 4
            await setUpInitialHeight(initialHeight)
            await moveXBlocks(blocksToMove)
            let forks: Fork[] = await forkService.getAll()
            let mainchain: Item[] = await mainchainService.getAll()
            const time: string = forks[0].getForkItems()[0].time
            //Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                time
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            expect(forks).to.be.eql([forkExpected])
            expect(mainchain).to.be.eql([itemExpected])
        })
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo input validation', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff
            const btcWitnessBlockHeight = initialHeight + 1
            const blocksToMove = 1
            const cpvDiffExpected = 7
            await setUpInitialHeight(initialHeight)
            await moveXBlocks(blocksToMove)
            let forks: Fork[] = await forkService.getAll()
            let mainchain: Item[] = await mainchainService.getAll()
            const time: string = forks[0].getForkItems()[0].time
            //Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            start.forkDetectionData = null
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                time
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            expect(forks).to.be.eql([forkExpected])
            expect(mainchain).to.be.eql([itemExpected])
        })
    })

    describe.only('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo output validation', () => {
        it.only('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff
            let btcWitnessBlockHeight: number = initialHeight + 1
            const blocksToMove: number = 1
            const cpvDiffExpected: number = 0
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                Date()
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )

            //Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(forkExpected)
            await mainchainService.save([itemExpected])
            let forkExpectedJson = JSON.parse(JSON.stringify(forkExpected)) //Copy of the object forkExpected
            forkExpectedJson.items[0]._id = undefined
            forkExpected = Fork.fromObject(forkExpectedJson)
            let itemExpectedJson = JSON.parse(JSON.stringify(itemExpected)) //Copy of the object forkExpected
            itemExpectedJson._id = undefined
            itemExpected = Item.fromObject(itemExpectedJson)
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            const numberOfBtcWitnessBlocksToAsk: number = 1000
            const blockchainFromAPI = await getBlockchains(
                numberOfBtcWitnessBlocksToAsk
            )
            console.log(blockchainFromAPI.data)
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                blockchainFromAPI.data
            )
            // writeFileSync("blockchainExpected.json", JSON.stringify(blockchainExpected,null,2));
            // writeFileSync("blockchain.json", JSON.stringify(blockchain,null,2));
            //After adding to database, object information gets the _id of the collection document in mongo, it need to be removed for comparision

            expect(blockchainExpected).to.be.eql(blockchain)
        })
        it.only('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff
            let btcWitnessBlockHeight: number = initialHeight + 1
            const blocksToMove: number = 1
            const cpvDiffExpected: number = 4
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                Date()
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            //Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(forkExpected)
            await mainchainService.save([itemExpected])
            //After adding to database, object information gets the _id of the collection document in mongo, it need to be removed for comparision
            let forkExpectedJson = JSON.parse(JSON.stringify(forkExpected)) //Copy of the object forkExpected
            forkExpectedJson.items[0]._id = undefined
            forkExpected = Fork.fromObject(forkExpectedJson)
            let itemExpectedJson = JSON.parse(JSON.stringify(itemExpected)) //Copy of the object forkExpected
            itemExpectedJson._id = undefined
            itemExpected = Item.fromObject(itemExpectedJson)

            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            const numberOfBtcWitnessBlocksToAsk: number = 1000
            const blockchainFromAPI = await getBlockchains(
                numberOfBtcWitnessBlocksToAsk
            )
            console.log(blockchainFromAPI.data)
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                blockchainFromAPI.data
            )
            expect(blockchainExpected).to.be.eql(blockchain)
        })
        it.only('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff
            let btcWitnessBlockHeight: number = initialHeight + 1
            const blocksToMove: number = 1
            const cpvDiffExpected: number = 7
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            start.forkDetectionData = null
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                Date()
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            //Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(forkExpected)
            await mainchainService.save([itemExpected])
            //After adding to database, object information gets the _id of the collection document in mongo, it need to be removed for comparision
            let forkExpectedJson = JSON.parse(JSON.stringify(forkExpected)) //Copy of the object forkExpected
            forkExpectedJson.items[0]._id = undefined
            forkExpected = Fork.fromObject(forkExpectedJson)
            let itemExpectedJson = JSON.parse(JSON.stringify(itemExpected)) //Copy of the object forkExpected
            itemExpectedJson._id = undefined
            itemExpected = Item.fromObject(itemExpectedJson)
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            const numberOfBtcWitnessBlocksToAsk: number = 1000
            const blockchainFromAPI = await getBlockchains(
                numberOfBtcWitnessBlocksToAsk
            )
            console.log(blockchainFromAPI.data)
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                blockchainFromAPI.data
            )
            expect(blockchainExpected).to.be.eql(blockchain)
        })
    })
})
