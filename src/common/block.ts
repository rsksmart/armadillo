import { ForkDetectionData } from "./fork-detection-data";

export class BlockBTC {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;

    constructor(_height: number, _hash: string, _rskTag: string) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = new ForkDetectionData(_rskTag);
    }
}

export class BlockRSK {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;
    public uncles?: BlockRSK[];

    constructor(_height: number, _hash: string, _rskTag: ForkDetectionData, uncles?: any) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = _rskTag;
        this.uncles = uncles; // check this
    }
}