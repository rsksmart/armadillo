import { RskBlockInfo, RskForkItemInfo } from "../common/rsk-block";
import { BtcBlock } from "../common/btc-block";
import { ForkDetectionData } from "../common/fork-detection-data";
import { Fork, ForkItem, Item } from "../common/forks";
import { BtcWatcher, BTCEvents } from "./btc-watcher";
import { getLogger, Logger } from "log4js";
import { MainchainService } from "./mainchain-service";
import { ForkService } from "./fork-service";
import { RskApiService } from "./rsk-api-service";
import { Printify } from "../util/printify";

export class ForkDetector {
    private logger: Logger;
    private forkService: ForkService;
    private rskApiService: RskApiService;
    private btcWatcher: BtcWatcher;
    private maxBlocksBackwardsToSearch: number = 448;
    private mainchainService: MainchainService;
    //This is the 
    private blockForkWhenArmadilloStated: number = 1591000;

    //TODO: move this into config file
    private minimunOverlapCPV: number = 3;

    constructor(forkService: ForkService, mainchainService: MainchainService, btcWatcher: BtcWatcher, rskApiService: RskApiService) {
        this.forkService = forkService;
        this.btcWatcher = btcWatcher;
        this.rskApiService = rskApiService;
        this.mainchainService = mainchainService
        this.logger = getLogger('fork-detector');

        this.btcWatcher.on(BTCEvents.NEW_BLOCK, (block: BtcBlock) => this.onNewBlock(block))
    }

    public stop() {
        this.logger.info('Stopping fork detector')
        this.btcWatcher.stop();
    }

    public start() {
        this.logger.info('Starting fork detector');
        this.btcWatcher.start();
    }

    // Main function, it's called every times a BTC block arrives
    public async onNewBlock(newBtcBlock: BtcBlock) {
        this.logger.info("<< -------------- NEW BTC BLOCK ------------------ >>");

        if (!newBtcBlock.hasRskTag()) {
            this.logger.info('NO RSKTAG present - Skipping BTC block', Printify.getPrintifyInfo(newBtcBlock));
            return await this.blockSuccessfullyProcessed(newBtcBlock);
        }

        this.logger.info('RSKTAG present', Printify.getPrintifyInfo(newBtcBlock));

        //TODO Check if tag has rsk height pointing to a heihgt that Armadillo mainchain can manage 
        // if (newBtcBlock.rskTag.BN < this.blockForkWhenArmadilloStated) {
        //     this.logger.info("BTC block has a tag with invalid height");
        //     return await this.blockSuccessfullyProcessed(newBtcBlock);
        // }

        //TODO Check if tag has rsk height pointing to a heihgt that Armadillo mainchain started
        // if () {
        //     this.logger.info("BTC block has a tag pointing to a rsk height that is not contenplaiting in armadillo mainchain");
        //     return await this.blockSuccessfullyProcessed(newBtcBlock);
        // }

        let rskBlocksAtNewRskTagHeight: RskBlockInfo[] = await this.rskApiService.getBlocksByNumber(newBtcBlock.rskTag.BN);
        let rskBlockMatchInHeight: RskBlockInfo = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, newBtcBlock.rskTag);

        if (rskBlockMatchInHeight) {
            // New tag is in mainchain
            let ok = await this.tryToAddInMainchain(newBtcBlock, rskBlocksAtNewRskTagHeight);

            if (!ok) {
                return;
            }
        } else {
            
            await this.addOrCreateFork(newBtcBlock);
        }

        return await this.blockSuccessfullyProcessed(newBtcBlock);
    }

    // The idea of this method is build an armadillo mainchain (like rsk mainchain) adding btc information if applicable.
    private async tryToAddInMainchain(newBtcBlock: BtcBlock, rskBlocksAtRskTagHeight: RskBlockInfo[]): Promise<boolean> {
        this.logger.info("Mainchain: Saving a new btc block in mainchain", Printify.getPrintifyInfo(newBtcBlock));

        let rskBestBlockInMainchain: Item = await this.mainchainService.getBestBlock();
        let rskBlockInMainchain: RskBlockInfo = this.getBestBlock(rskBlocksAtRskTagHeight);

        // There is no Armadillo Mainnet yet, let's create it!.
        if (!rskBestBlockInMainchain) {
            //TODO: there is a bug here. At this point we don't know if this tag is pointing to a uncle or a mainchain block
            let newItemInMainnet: Item = new Item(newBtcBlock.btcInfo, rskBlockInMainchain);
            await this.mainchainService.save([newItemInMainnet]);
            this.logger.info("Armadillo Mainchain: Created the first item in mainchain");
            return true;
        }

        // Verify armadillo top of Mainchain is still being the best block, just to be sure there was't any reorganization.
        // In case there are update armadillo mainchain:
        if (!await this.blockStillBeingMainchain(rskBestBlockInMainchain.rskInfo)) {
            this.logger.info("There was a reorganization for rsk block", Printify.getPrintifyInfoForkItem(rskBestBlockInMainchain))
            await this.rebuildMainchainFromBlock(rskBestBlockInMainchain);

            // There was a reorganization, mainchain has changed!
            rskBestBlockInMainchain = await this.mainchainService.getBestBlock();
        }

        // First of all, we have to check if rsktag is in armadillo mainchain or not, and if it comes repeated.
        // If tag is in mainchain, it is very probable that a miner is stuck in the same rsk block.
        if (this.tagIsPointingToABackwardHeight(newBtcBlock, rskBestBlockInMainchain)) {
            this.logger.info("Mainchain: A BTC block was found with a tag pointing at a backward height to the mainchain", Printify.getPrintifyInfo(newBtcBlock));

            // Check if this tag is in mainchain or uncle at certain height.
            var blockThatMatchInMainnet: Item = await this.mainchainService.getBlockByForkDataDetection(newBtcBlock.rskTag);
           
            if (blockThatMatchInMainnet) {
                this.logger.info("Mainchain: rsk tag is pointing to an existing armadillo mainchain height. A miner could be stuck");

                if (!blockThatMatchInMainnet.btcInfo) {
                    blockThatMatchInMainnet.btcInfo = newBtcBlock.btcInfo
                    await this.mainchainService.updateBtcInfoItem(blockThatMatchInMainnet);
                } else {
                    this.logger.info("Mainchain: rsk tag is pointing to an existing armadillo mainchain height. BTC data is already at that height");
                }
            } else {
                this.logger.info("Mainchain: New rsk tag is pointing to an old armadillo mainchain height, and is a uncle");

                // New btc block could be an uncle
                var blockThatMatch: RskBlockInfo = this.getBlockMatchWithRskTag(rskBlocksAtRskTagHeight, newBtcBlock.rskTag);

                var item: Item = new Item(newBtcBlock.btcInfo, blockThatMatch);
                await this.mainchainService.save([item]);
            }

            return true;
        }

        // Rebuilding the chain between last tag find up to the new tag height, to have the complete mainchain
        let prevRskHashToMatch: string = rskBestBlockInMainchain.rskInfo.hash;
        let itemsToSaveInMainchain: Item[] = [];
        let searchFromHeight = rskBestBlockInMainchain.rskInfo.height + 1;
        let searchToHeight = rskBlockInMainchain.height;

        this.logger.info("Getting all RSK blocks from height", searchFromHeight, "to height", searchToHeight)

        for (let i = searchFromHeight; i < searchToHeight; i++) {
            let block: RskBlockInfo = await this.rskApiService.getBlock(i);
            if (block.prevHash != prevRskHashToMatch) {
                this.logger.fatal("Mainchain: building mainchain can not find a block in RSK at height:", i, "with prev hash:", prevRskHashToMatch)
                return false;
            } else {
                this.logger.info("Mainchain: adding RSK block into mainchain at height:", i, "with hash:", block.hash, "prevHash:", block.prevHash)
            }

            prevRskHashToMatch = block.hash;
            itemsToSaveInMainchain.push(new Item(null, block));
        }

        let rskBlockMatchInHeight: RskBlockInfo = this.getBlockMatchWithRskTag(rskBlocksAtRskTagHeight, newBtcBlock.rskTag);

        if (rskBlockMatchInHeight.hash != rskBlockInMainchain.hash) {
            // Because rsk tag in current BTC block is pointing to an rsk uncle block, we save:
            // 1) best rsk block to keep the armadillo mainchain well formed.
            // 2) rsk uncle block which is being targeted by the new BTC block.
            this.logger.info("Mainchain: Saving an uncle in armadillo mainchain", Printify.getPrintifyInfo(newBtcBlock));
            itemsToSaveInMainchain.push(new Item(null, rskBlockInMainchain));
            itemsToSaveInMainchain.push(new Item(newBtcBlock.btcInfo, rskBlockMatchInHeight));
        } else {
            // Rsktag is in mainchain
            itemsToSaveInMainchain.push(new Item(newBtcBlock.btcInfo, rskBlockInMainchain));
        }

        this.logger.info("Mainchain: Saving new items in mainchain with rsk heights:", itemsToSaveInMainchain.map(x => x.rskInfo.forkDetectionData.BN.toString()));
        await this.mainchainService.save(itemsToSaveInMainchain);

        return true;
    }

    private getBlockMatchWithRskTag(blocks: RskBlockInfo[], rskTag: ForkDetectionData): RskBlockInfo {
        return blocks.find(b => b.forkDetectionData.equals(rskTag));
    }

    private getBestBlock(blocks: RskBlockInfo[]): RskBlockInfo {
        return blocks.find(b => b.mainchain);
    }

    private async getForksThatOverlap(rskTag: ForkDetectionData): Promise<Fork[]> {
        let forksThatOverlap: Fork[] = []
        let lastTopsDetected: Fork[] = await this.getPossibleForks(rskTag.BN);

        for (const fork of lastTopsDetected) {
            if (fork.getLastDetected().rskForkInfo.forkDetectionData.overlapCPV(rskTag.CPV, this.minimunOverlapCPV)) {
                forksThatOverlap.push(fork);
            }
        }

        return forksThatOverlap;
    }

    private getHeightforPossibleForks(numberBlock: number): number {
        if (numberBlock > this.maxBlocksBackwardsToSearch) {
            return numberBlock - this.maxBlocksBackwardsToSearch;
        } else {
            return 0;
        }
    }

    private async getPossibleForks(blockNumber: number): Promise<Fork[]> {
        //No necesitamos los forks si no los ultimos "nodos" que se agregaron de cada forks
        let minimunHeightToSearch = this.getHeightforPossibleForks(blockNumber);

        //connect to the database to get possible forks, 
        //No deberiamos traer todo, solo hasta un maximo hacia atras
        return this.forkService.getForksDetected(minimunHeightToSearch);
    }

    private tagIsInAFork(forks:Fork[], item: ForkItem): boolean {
        return forks[0].getForkItems().some(x => x.rskForkInfo.forkDetectionData.equals(item.rskForkInfo.forkDetectionData));
    }

    private newItemCanBeAddedInFork(forks: Fork[], item: ForkItem) {
        return forks[0].getLastDetected().rskForkInfo.forkDetectionData.BN < item.rskForkInfo.forkDetectionData.BN;
    }

    private async addOrCreateFork(btcBlock: BtcBlock) {
        let rskBestBlock: RskBlockInfo = await this.rskApiService.getBestBlock();
        let rskBlocksSameHeight;

        //Rsktag is comming pointing in a future rsk height, for armadillo monitor this is a fork
        //TODO: check when a future case is a posible case or a miner is messing up.
        if (btcBlock.rskTag.BN > rskBestBlock.height) {
            this.logger.info("Newtwork could be behind some blocks");
            this.logger.info("FORK: found a block in the future");
            rskBlocksSameHeight = rskBestBlock;
        } else {
            rskBlocksSameHeight = await this.rskApiService.getBlock(btcBlock.rskTag.BN);

            //We shouldn't remove this if, should not come a null checking this heigh
            if(!rskBlocksSameHeight){
                return await this.btcWatcher.blockProcessingFailed(btcBlock);
            }
        }
        
        var rskForkItem : RskForkItemInfo = RskForkItemInfo.fromForkDetectionData(btcBlock.rskTag,rskBestBlock.height);
        //Possible mainchain block from where it started to fork
        let item: ForkItem = new ForkItem(btcBlock.btcInfo, rskForkItem);

        let forks: Fork[] = await this.getForksThatOverlap(rskForkItem.forkDetectionData);

        if (forks.length > 1) {
            this.logger.info("FORK: More forks that we expect, found:", forks.length, "", "with CPV:", rskForkItem.forkDetectionData.CPV);
        }

        //If rskTag is repeted
        if (forks.length > 0 && this.tagIsInAFork(forks, item)) {
            this.logger.info("FORK: Tag repeated")
            return;
        }

        // TODO: For now, we get the first fork, there is a minimun change to get more than 1 item that match, but what happens if we find more?
        if (forks.length > 0 && this.newItemCanBeAddedInFork(forks, item)) {

            this.logger.info('FORK: RSKTAG', rskForkItem.forkDetectionData.toString(), 'was found in BTC block with hash:', btcBlock.btcInfo.hash,
                'this new item was added in a existing fork');

            await this.forkService.addForkItem(forks[0].getFirstDetected().rskForkInfo.forkDetectionData.prefixHash, item);
        } else {
            let mainchainRangeForkCouldHaveStarted = await this.rskApiService.getRangeForkWhenItCouldHaveStarted(rskForkItem.forkDetectionData, rskBlocksSameHeight);

            this.logger.info('FORK: Creating fork for RSKTAG', rskForkItem.forkDetectionData.toString(), 'found in block', btcBlock.btcInfo.hash);

            await this.forkService.save(new Fork(mainchainRangeForkCouldHaveStarted, [item]));
        }
    }

    private async blockSuccessfullyProcessed(newBtcBlock: BtcBlock): Promise<void> {
        return this.btcWatcher.blockSuccessfullyProcessed(newBtcBlock);
    }

    private async blockStillBeingMainchain(rskBlock: RskBlockInfo) {
        var bestblockAtHeight: RskBlockInfo = await this.rskApiService.getBlock(rskBlock.height);
        return bestblockAtHeight.hash == rskBlock.hash;
    }

    private tagIsPointingToABackwardHeight(newBtcBlock: BtcBlock, rskBestBlockInMainchain: Item) {
        return newBtcBlock.rskTag.BN <= rskBestBlockInMainchain.rskInfo.height;
    }

    // This function should be use if there are a reorganization. The intention of if is to rebuild 
    // the armadillo mainchain with the correct blocks. 
    public async rebuildMainchainFromBlock(itemIsNotMoreInMainchain: Item) {
        let rskBlocksAtNewRskTagHeight: RskBlockInfo[] = await this.rskApiService.getBlocksByNumber(itemIsNotMoreInMainchain.rskInfo.forkDetectionData.BN);
        let itemShouldBeAnUncleAtLeast: RskBlockInfo = this.getBlockMatchWithRskTag(rskBlocksAtNewRskTagHeight, itemIsNotMoreInMainchain.rskInfo.forkDetectionData);

        if (itemShouldBeAnUncleAtLeast == null) {
            this.logger.info("Mainchain Reorganization: mainchain with a btc tag previously found was discarted because it doesn't belong any more to the mainchain", Printify.getPrintifyInfoForkItem(itemIsNotMoreInMainchain))
        } else {
            // Up to here we know that the old tag is not longer in mainchain, but is an uncle.
            // let add it as an uncle in this height
            var newItem = new Item(null, itemShouldBeAnUncleAtLeast);
            this.logger.info("Mainchian Reorganization: Saving best block as an uncle", Printify.getPrintifyInfoForkItem(newItem));
            itemIsNotMoreInMainchain.rskInfo.mainchain = false;
            await this.mainchainService.save([newItem]);
        }

        var bestblockAtHeight: RskBlockInfo = await this.rskApiService.getBlock(itemIsNotMoreInMainchain.rskInfo.height);
        var forkItemToReplace = new Item(null, bestblockAtHeight);
        this.logger.info("Mainchian Reorganization: Removing block that was best block", Printify.getPrintifyInfoForkItem(itemIsNotMoreInMainchain), "for new block", Printify.getPrintifyInfoForkItem(forkItemToReplace))

        await this.mainchainService.changeBlockInMainchain(itemIsNotMoreInMainchain.rskInfo.height, forkItemToReplace);

        //Now let's check if the reorganization took more blocks backwards.
        var prevBLockInMainchain = await this.mainchainService.getBlock(itemIsNotMoreInMainchain.rskInfo.height - 1)

        if (prevBLockInMainchain && !await this.blockStillBeingMainchain(prevBLockInMainchain.rskInfo)) {
            await this.rebuildMainchainFromBlock(prevBLockInMainchain);
        }
    }
}
