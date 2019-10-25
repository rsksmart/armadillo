import { ForkDetectionData } from "./fork-detection-data";

export class RskBlock {
    public height: number;
    public forkDetectionData: ForkDetectionData;
    public hash: string;
    public prevHash: string;
    public mainchain: boolean;

    constructor(_height: number, _hash: string, _prevHash: string, mainchain: boolean, _forkDetectionData: ForkDetectionData) {
        this.height = _height;
        this.hash = _hash;
        this.forkDetectionData = _forkDetectionData;
        this.prevHash = _prevHash;
        this.mainchain = mainchain;
    }

    public static fromObject(block: any): RskBlock {
        return new RskBlock(block.number, block.hash, block.parentHash, block.mainchain, new ForkDetectionData(block.hashForMergedMining));
    }
}