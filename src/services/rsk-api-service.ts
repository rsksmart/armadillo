import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlock } from "../common/rsk-block";
import Nod3 from 'nod3';

export interface RskApi {
    getBlocksByNumber(height: number) : Promise<RskBlock[]>;
}

export class RskApiService implements RskApi {
    private config: RskApiConfig;
    private nod3: any;

    constructor(config: RskApiConfig){
        this.config = config;

        const url = `http://${this.config.host}:${this.config.port}`

        this.nod3 = new Nod3(
            new Nod3.providers.HttpProvider(url)
        );
    }

    public async getBlocksByNumber(height: number): Promise<RskBlock[]> {

        var blocksInfo : any[] = await this.nod3.rsk.getBlocksByNumber(height);
        var blocks : RskBlock[] = [];

        for (const blockInfo of blocksInfo) {
            var block = await this.nod3.eth.getBlock(blockInfo.hash);
            blocks.push(RskBlock.fromObject(block));
        }

        return blocks;
    }
}
