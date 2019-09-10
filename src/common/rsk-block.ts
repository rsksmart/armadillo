import { ForkDetectionData } from "./fork-detection-data";

export class RskBlock {
    public height: number;
    public forkDetectionData: ForkDetectionData;
    public hash: string;
    public prevHash: string;

    constructor(_height: number, _hash: string, _prevHash: string, _forkDetectionData: ForkDetectionData) {
        this.height = _height;
        this.hash = _hash;
        this.forkDetectionData = _forkDetectionData;
        this.prevHash = _prevHash;
    }

    public static fromObject(block: any): RskBlock {
        return new RskBlock(block.number, block.hash, block.prevHash, new ForkDetectionData(block.hashForMergedMining));
    }
}