import { ForkDetectionData } from "./fork-detection-data";

export class RskBlock {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;

    constructor(_height: number, _hash: string, _rskTag: ForkDetectionData) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = _rskTag;
    }

    public static fromObject(block: any): RskBlock {
        return new RskBlock(block.number, block.hash, new ForkDetectionData(block.hashForMergedMining));
    }
}