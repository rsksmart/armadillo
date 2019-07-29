import { RskApiConfig } from "../config/rsk-api-config";
import { BlockRSK } from "../common/block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";

export interface RskApi {
    getBlocksByNumber(height: number) : Promise<BlockRSK[]>;
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

    getBlocksByNumber(height: number): Promise<BlockRSK[]> {
        return this.nod3.rsk.getBlocksByNumber(height);
    }
}

export class DummyRskApiService implements RskApi {
    private config: RskApiConfig;

    constructor(config: RskApiConfig) {
        this.config = config;
    }

    public getBlocksByNumber(height: number): Promise<BlockRSK[]> {
        let listBLocks: BlockRSK[] = [];

        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag1")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag2")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag3")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag4")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag5")));

        return Promise.resolve(listBLocks);
    }
}
