import { BtcApiConfig } from '../config/btc-api-config';
import { get } from '../util/http';

export interface BtcApi {
    getBestBlock() : Promise<PlainBtcBlock>;
}

export interface PlainBtcHeader {
    height: number;
    hash: string;
    previousHash: string;
}

export interface PlainBtcBlock {
    header: PlainBtcHeader;
    rskTag: string;
}

export class HttpBtcApi implements BtcApi {
    private config: BtcApiConfig;

    constructor(btcApiConfig: BtcApiConfig) {
        this.config = btcApiConfig;
    }

    public async getBestBlock(): Promise<PlainBtcBlock> {
        const bestHeader: PlainBtcHeader = await this.getBestBlockHeader();
        const coinbase: any = await this.getCoinbase(bestHeader.hash);

        const rskTag = this.extractTagFromCoinbase(coinbase);

        const block: PlainBtcBlock = {
            header: {
                height: bestHeader.height,
                hash: bestHeader.hash,
                previousHash: bestHeader.previousHash
            },
            rskTag: rskTag
        }

        return block;
    }

    private baseUrl() : string {
        return `http://${this.config.HOST}:${this.config.PORT}`;
    }

    private async getBestBlockHeader() : Promise<PlainBtcHeader> {
        const response: any = await get(this.baseUrl() + '/block/getBestBlock');

        return response.block.header;
    }

    private async getCoinbase(hash: string) : Promise<any> {
        const response: any = await get(this.baseUrl() + '/block/getCoinbase/' + hash);

        return response.coinbase;
    }

    private extractTagFromCoinbase(coinbase: any) : string {
        const outputs: any[] = coinbase.transaction.outputs;
        const output: any = outputs.find(o => o.rsktag);

        return output ? output.rsktag : null;
    }
}