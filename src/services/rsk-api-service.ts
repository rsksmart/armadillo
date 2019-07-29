import { RskApiConfig } from "../config/rsk-api-config";
import { BlockRSK } from "../common/block";
import { ForkDetectionData } from "../common/fork-detection-data";

export class RskApiService {
   
    constructor(config: RskApiConfig){

    }

    connect() {
    }

    disconnect() {
    }

    public getBlocksByHeight(blockNumber: number) {
        let listBLocks: BlockRSK[] = [];

        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag1")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag2")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag3")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag4")));
        listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag5")));

        return listBLocks;
    }
}
