import { RskApiConfig } from "../config/rsk-api-config";
import { RskBlock } from "../common/rsk-block";
import Nod3 from 'nod3';
import { ForkDetectionData } from "../common/fork-detection-data";

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

    getBlocksByNumber(height: number): Promise<RskBlock[]> {
        return this.nod3.rsk.getBlocksByNumber(height);
    }
}

export class DummyRskApiService implements RskApi {
    private config: RskApiConfig;

    constructor(config: RskApiConfig) {
        this.config = config;
    }

    public getBlocksByNumber(height: number): Promise<RskBlock[]> {
        let listBLocks: RskBlock[] = [];

        listBLocks.push(new RskBlock(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag1")));
        listBLocks.push(new RskBlock(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag2")));
        listBLocks.push(new RskBlock(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag3")));
        listBLocks.push(new RskBlock(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag4")));
        listBLocks.push(new RskBlock(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag5")));

        return Promise.resolve(listBLocks);
    }
}
