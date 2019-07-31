import { BtcMonitorConfig } from "../config/btc-monitor-config";
import { BtcBlock } from "../common/btc-block";
import { EventEmitter } from "events";
import { HttpBtcApi, BtcApi } from "./btc-api";

export enum BTCEvents {
    NEW_BLOCK = 'newBlock'
}

//This service emit a new block
export class BtcWatcher extends EventEmitter {

    private blocks: BtcBlock[];
    private config: BtcMonitorConfig;
    private btcApi: BtcApi;

    constructor(config: BtcMonitorConfig) {
        super();

        this.config = config;
        this.blocks = []
        this.btcApi = new HttpBtcApi();
    }

    private saveBest(block: BtcBlock) {
        this.blocks.push(block);

        this.emit(BTCEvents.NEW_BLOCK, block);
    }

    public async run() {
        while (true) {
            console.log('Fetching')
            const block: BtcBlock = await this.btcApi.getBestBlock();
            console.log('Fetched', block)
            this.saveBest(block);
        }
    }

    public stop() {
    }
}
