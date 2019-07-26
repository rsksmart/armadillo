export class ForkDetectionData {
    static getObject(tag: string): ForkDetectionData {
        return new ForkDetectionData(tag);
    }

    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(rskTag: string) {
        this.prefixHash = rskTag.slice();
        this.CPV = rskTag.slice();
        this.NU = parseInt(rskTag.slice());
        this.BN = parseInt(rskTag.slice());
    }
}