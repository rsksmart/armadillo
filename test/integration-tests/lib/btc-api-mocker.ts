import fetch from 'node-fetch';
import { BtcHeaderInfo, BtcBlock } from '../../../src/common/btc-block';
import { sleep } from '../../../src/util/helper';
import { BtcService } from '../../../src/services/btc-service';

export class BtcApiMocker {
    public firstBlock: number;
    private btcApiURL: string;
    private btcService: BtcService;
    constructor(btcApiConfig: any, btcService: BtcService) {
        this.btcApiURL = `http://${btcApiConfig.host}:${btcApiConfig.port}/`;
        this.firstBlock = 0;
        this.btcService = btcService;
    }

    public async getFirstBlockNumber(): Promise<number> {
        const response = await fetch(`${this.btcApiURL}firstBlock`);
        const result = await response.json();
        this.firstBlock = parseInt(result, 10);
        return this.firstBlock;
    }

    public async getBtcApiLastBlock(): Promise<BtcHeaderInfo> {
        const response = await fetch(`${this.btcApiURL}block/getBestBlock`);
        const result = await response.json();
        const btcInfo = {
            height: result.block.header.height,
            hash: result.block.header.hash,
        };
        return BtcHeaderInfo.fromObject(btcInfo);
    }

    public async moveToNextBlock(): Promise<void> {
        await fetch(this.btcApiURL + 'nextBlock');
    }

    public async setHeightInMockBTCApi(height: number): Promise<void> {
        if (this.firstBlock === 0) {
            this.firstBlock = await this.getFirstBlockNumber();
        }
        height = this.firstBlock + height;
        // THIS SHOULD BE A POST
        await fetch(`${this.btcApiURL}height/${height}`);
    }

    public async moveXBlocks(blocksToMove: number): Promise<void> {
        for (let i = 0; i < blocksToMove; i++) {
            await this.moveToNextBlock();
            const bestBlock = await this.getBtcApiLastBlock();
            let btcLastCheckedBlock: BtcBlock = await this.btcService.getLastBlockDetected();
            while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                await sleep(100);
                btcLastCheckedBlock = await this.btcService.getLastBlockDetected();
            }
        }
    }
}
