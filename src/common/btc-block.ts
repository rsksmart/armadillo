import { ForkDetectionData } from "./fork-detection-data";

export class BtcBlock {
    public btcInfo: BtcHeaderInfo;
    public rskTag: ForkDetectionData;

    constructor(_height: number, _hash: string, _rskTag: string) {
        this.btcInfo = new BtcHeaderInfo(_height, _hash);
        
        if (_rskTag && _rskTag.length > 0) {
            this.rskTag = new ForkDetectionData(_rskTag);
        }
    }
}

export class BtcHeaderInfo {
    public height?: number;
    public hash?: string;

    constructor(_height?: number, _hash?: string) {
        this.height = _height;
        this.hash = _hash;
    }

    public static fromObject(btcInfo: any): BtcHeaderInfo {
        return new BtcHeaderInfo(btcInfo.height, btcInfo.hash);
    }
}

