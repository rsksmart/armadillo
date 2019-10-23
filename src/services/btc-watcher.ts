import { BtcBlock } from "../common/btc-block";
import { EventEmitter } from "events";
import { HttpBtcApi } from "./btc-api";
import { Logger, getLogger } from "log4js";
import { BtcService } from "./btc-service";

export enum BTCEvents {
    NEW_BLOCK = 'newBlock'
}

async function sleep(ms) : Promise<void> {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    });
}

export class BtcWatcher extends EventEmitter {
    private logger: Logger;
    private btcApi: HttpBtcApi;
    private running: boolean;
    private btcService: BtcService;
    
    constructor(btcApi: HttpBtcApi, btcService: BtcService) {
        super();

        this.btcApi = btcApi;
        this.logger = getLogger('btc-watcher');
        this.running = false;
        this.btcService = btcService;
    }

    public async start() : Promise<void> {
        this.logger.info('Starting btc watcher');
        this.running = true;
        let lastBLockDetected : BtcBlock;
        let bestBtcBlock: BtcBlock;

        while (this.running) {
          
            lastBLockDetected = await this.btcService.getLastBlockDetected();
            bestBtcBlock = await this.btcApi.getBestBlock();
           
            this.logger.info("Starting to sincronize...");
            
            if(!lastBLockDetected){
                this.logger.warn('There is not block detected in DB, starting to detect from best block at height:', bestBtcBlock.btcInfo.height, "with hash:", bestBtcBlock.btcInfo.hash);
                await this.saveBlockAtHeight(bestBtcBlock);
                lastBLockDetected = bestBtcBlock;
            }

            this.logger.info("Last BTC block detected is at height", lastBLockDetected.btcInfo.height);
            this.logger.info("Best BTC block is at height", bestBtcBlock.btcInfo.height);

            
            if(lastBLockDetected.btcInfo.height < bestBtcBlock.btcInfo.height){
                let blockMissing = lastBLockDetected.btcInfo.height + 1;
                let blockAtHeightN : BtcBlock = await this.btcApi.getBlock(blockMissing);

                await this.saveBlockAtHeight(blockAtHeightN);
            }
            await sleep(5000);
        }
    }

    private async saveBlockAtHeight(block: BtcBlock) {
        await this.saveBlock(block);
    }

    public async stop() : Promise<void> {
        this.logger.info('Stopping btc watcher');
        this.running = false;
    }

    private async saveBlock(block: BtcBlock) {
        this.logger.info("New BTC block with hash:", block.btcInfo.hash, "and height:", block.btcInfo.height)
        await this.btcService.save(block);
        this.emit(BTCEvents.NEW_BLOCK, block);
    }
}
