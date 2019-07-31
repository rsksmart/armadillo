import http from 'http';
import { BtcBlock } from "../common/btc-block";

export interface BtcApi {
    getBestBlock() : Promise<BtcBlock>;
}

export class HttpBtcApi implements BtcApi {

    public async getBestBlock(): Promise<BtcBlock> {
        const bestHash: string = await this.getBestBlockHash();
        const coinbase: any = await this.getCoinbase(bestHash);

        const rsktag = this.extractTagFromCoinbase(coinbase);

        return new BtcBlock(coinbase.transactionBlockInfo.number,
                            coinbase.transactionBlockInfo.hash,
                            rsktag);
    }

    private async fetch(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                res.setEncoding('utf8');

                let body = ''
                res.on('data', (chunk) => {
                  body += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        resolve(result);
                    } catch (e) {
                        reject(e.message);
                    }
                });
            });
        })
    }

    private async getBestBlockHash() : Promise<string> {
        const response: any = await this.fetch('http://34.67.238.129:5000/block/getBestBlock');

        return response.block.header.hash
    }

    private async getCoinbase(hash: string) : Promise<any> {
        const response: any = await this.fetch('http://34.67.238.129:5000/block/getCoinbase/' + hash);

        return response.coinbase
    }

    private extractTagFromCoinbase(coinbase: any) : string {
        const outputs: any[] = coinbase.transaction.outputs;
        const index: number = outputs.find(o => o.rsktag);

        return index != -1 ? outputs[index] : null
    }
}