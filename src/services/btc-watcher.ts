import { BtcBlock } from "../common/btc-block";
import { EventEmitter } from "events";
import { HttpBtcApi } from "./btc-api";
import { Logger, getLogger } from "log4js";
import { BtcService } from "./btc-service";

export enum BTCEvents {
    NEW_BLOCK = 'newBlock'
}

async function sleep(ms): Promise<void> {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    });
}

export class BtcWatcher extends EventEmitter {
    private logger: Logger;
    private btcApi: HttpBtcApi;
    private running: boolean;
    private btcService: BtcService;
    private lastBLockDetected: BtcBlock;
    private checkpoint: BtcBlock;
    private prevBlockProcessed: boolean;
    constructor(btcApi: HttpBtcApi, btcService: BtcService, heightBtcCheckpoint?: number) {
        super();

        this.btcApi = btcApi;
        this.logger = getLogger('btc-watcher');
        this.running = false;
        this.btcService = btcService;
        this.prevBlockProcessed = true;

        if (heightBtcCheckpoint != null && heightBtcCheckpoint > 1) {
            this.checkpoint = new BtcBlock(heightBtcCheckpoint, "", "");
            this.logger.info("CHECKPOINT Watcher: starting to sincronize at BTC heignt", heightBtcCheckpoint);
        }
    }

    public async start(): Promise<void> {
        this.logger.info('Starting btc watcher to sincronize...');
        this.running = true;
        let lastBLockDetected: BtcBlock;
        let bestBtcBlock: BtcBlock =  await this.btcApi.getBestBlock();
        this.lastBLockDetected = await this.btcService.getLastBlockDetected();

        if (this.checkpoint) {
            if (!this.lastBLockDetected || (this.checkpoint.btcInfo.height > 0 && this.lastBLockDetected.btcInfo.height < this.checkpoint.btcInfo.height)) {
                this.lastBLockDetected = this.checkpoint
                this.logger.info("Using CHEKPOINT: Starting to sincronize at BTC heignt", this.lastBLockDetected.btcInfo.height);
            } else {
                this.logger.info("Discarting CHEKPOINT: Starting to sincronize at BTC heignt", this.lastBLockDetected.btcInfo.height);
            }
        }

        if (!this.lastBLockDetected) {
            this.logger.warn('There is not block detected in DB, starting to detect from best block at height:', bestBtcBlock.btcInfo.height, "with hash:", bestBtcBlock.btcInfo.hash);
            await this.btcService.save(bestBtcBlock);
            this.lastBLockDetected = bestBtcBlock;
        }

        while (this.running) {
            this.lastBLockDetected = await this.btcService.getLastBlockDetected();
            
            if (this.prevBlockProcessed) {
                bestBtcBlock = await this.btcApi.getBestBlock();

                this.logger.info("Last BTC block detected is at height", this.lastBLockDetected.btcInfo.height);
                this.logger.info("Best BTC block is at height", bestBtcBlock.btcInfo.height);

                if (this.lastBLockDetected.btcInfo.height < bestBtcBlock.btcInfo.height) {
                    let blockMissing = this.lastBLockDetected.btcInfo.height + 1;
                    let blockAtHeightN: BtcBlock = await this.btcApi.getBlock(blockMissing);

                    await this.saveBlock(blockAtHeightN);
                }
            }

            await sleep(700);
        }
    }

    public async stop(): Promise<void> {
        this.logger.info('Stopping btc watcher');
        this.running = false;
    }

    private async saveBlock(block: BtcBlock) {
        this.logger.info("New BTC block - hash:", block.btcInfo.hash, " height:", block.btcInfo.height)
        this.lastBLockDetected = block;
        this.emit(BTCEvents.NEW_BLOCK, block);
        this.prevBlockProcessed = false;
    }

    public async blockSuccessfullyProcessed(block: BtcBlock) {
        this.logger.info("Saving BTC block as last detected in DB, at height", block.btcInfo.height);
        await this.btcService.save(block);
        this.prevBlockProcessed = true;
    }
}