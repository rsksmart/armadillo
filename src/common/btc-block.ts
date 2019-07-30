import { ForkDetectionData } from "./fork-detection-data";

export class BtcBlock {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;
    constructor(_height: number, _hash: string, _rskTag: string) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = new ForkDetectionData(_rskTag);
    }
}
