import { BtcBlock } from "../common/btc-block";
import { EventEmitter } from "events";
import { PlainBtcBlock, HttpBtcApi } from "./btc-api";
import { Logger, getLogger } from "log4js";

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
    private blocks: BtcBlock[]; // TODO: move this to a blockchain abstraction
    private btcApi: HttpBtcApi;
    private running: boolean;

    constructor(btcApi: HttpBtcApi) {
        super();

        this.blocks = []
        this.btcApi = btcApi;
        this.logger = getLogger('btc-watcher');
        this.running = false;
    }

    public async start() : Promise<void> {
        this.logger.info('Starting btc watcher');

        this.running = true;

        while (this.running) {
            const plainBlock: PlainBtcBlock = await this.btcApi.getBestBlock();
            const lastBlock: BtcBlock = this.getLastBlock();

            if (!lastBlock || lastBlock.btcInfo.hash == plainBlock.header.previousHash) {
                const newBlock: BtcBlock = new BtcBlock(plainBlock.header.height,
                                                        plainBlock.header.hash,
                                                        plainBlock.header.previousHash,
                                                        plainBlock.rskTag)

                this.saveBest(newBlock);
            } else {
                // TODO: handle reorg
            }

            await sleep(5000);
        }
    }

    public async stop() : Promise<void> {
        this.logger.info('Stopping btc watcher');
        this.running = false;
    }

    private saveBest(block: BtcBlock) {
        this.logger.info('New BTC block with hash:', block.btcInfo.hash, "and Height:", block.btcInfo.height)

        this.blocks.push(block);

        this.emit(BTCEvents.NEW_BLOCK, block);
    }

    private getLastBlock() : BtcBlock {
        if (this.blocks.length === 0) {
            return null;
        }

        return this.blocks[this.blocks.length - 1]
    }
}
