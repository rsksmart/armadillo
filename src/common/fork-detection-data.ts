import { BtcHeaderInfo } from "./btc-block";

export class ForkDetectionData {
    static getObject(tag: string): ForkDetectionData {
        return new ForkDetectionData(tag);
    }

    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;
   

    constructor(rskTag: string, ) {
        this.prefixHash = rskTag.substring(0, 20);
        this.CPV = rskTag.substring(20,27);
        this.NU = parseInt(rskTag.substring(27,28));
        this.BN = parseInt(rskTag.substring(28,32));
    }
}

export class BranchItem {
    public btcInfo: BtcHeaderInfo;
    public forkDetectionData: ForkDetectionData

    constructor(btcInfo: BtcHeaderInfo, forkDetectionData: ForkDetectionData){
        btcInfo  = btcInfo;
        forkDetectionData = forkDetectionData;
    }
}