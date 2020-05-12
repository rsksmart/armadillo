import { BtcApiConfig } from '../config/btc-api-config';
import { get } from '../util/http';
import { BtcBlock } from '../common/btc-block';
import { retry3Times } from '../util/helper';
 
interface PlainBtcHeader {
    height: number;
    hash: string;
    previousHash: string;
}

export class HttpBtcApi {
    private config: BtcApiConfig;

    constructor(btcApiConfig: BtcApiConfig) {
        this.config = btcApiConfig;
    }

    public async getBestBlock(): Promise<BtcBlock> {
        const bestHeader: PlainBtcHeader = await this.getBestBlockHeader();
        const coinbase: any = await this.getCoinbase(bestHeader.hash);
        const rskTag = this.extractTagFromCoinbase(coinbase);

        return new BtcBlock(bestHeader.height, bestHeader.hash, rskTag, coinbase.guessedMiner);
    }

    public async getBlock(n: number): Promise<BtcBlock> {
        const blockAtHeightN: PlainBtcHeader = await this.getBlockHeader(n);
        const coinbase: any = await this.getCoinbase(blockAtHeightN.hash);
        const rskTag = this.extractTagFromCoinbase(coinbase);

        return new BtcBlock(blockAtHeightN.height, blockAtHeightN.hash, rskTag, coinbase.guessedMiner);
    }

    private baseUrl() : string {
        return `http://${this.config.HOST}:${this.config.PORT}`;
    }

    private async getBestBlockHeader() : Promise<PlainBtcHeader> {
        const response: any = await retry3Times(get, [this.baseUrl() + '/block/getBestBlock']);

        return response.block.header;
    }

    private async getBlockHeader(n: number) : Promise<PlainBtcHeader> {
        const response: any = await retry3Times(get, [this.baseUrl() + '/block/getBlock/' + n]);

        return response.block.header;
    }

    private async getCoinbase(hash: string) : Promise<any> {
        const response: any = await retry3Times(get, [this.baseUrl() + '/block/getCoinbase/' + hash]);

        return response.coinbase;
    }

    private extractTagFromCoinbase(coinbase: any) : string {
        const outputs: any[] = coinbase.transaction.outputs;
        const output: any = outputs.find(o => o.rskTag);
        return output ? output.rskTag : null;
    }
}