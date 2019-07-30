import { ForkDetectionData } from "./fork-detection-data";

export class RskBlock {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;
    public uncles?: RskBlock[];

    constructor(_height: number, _hash: string, _rskTag: ForkDetectionData, uncles?: any) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = _rskTag;
        this.uncles = uncles; // check this
    }
}