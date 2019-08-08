import { checkTag, toHex } from "../util/helper";

export class ForkDetectionData {
    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(forkDetectionData: string | any) {
        // TODO: throw error if length is not 32 bytes
        if (typeof forkDetectionData != "string") {
            //is an object
            this.prefixHash = forkDetectionData.prefixHash;
            this.CPV = forkDetectionData.CPV;
            this.NU = forkDetectionData.NU;
            this.BN = forkDetectionData.BN;
            return;
        }

        let tag = checkTag(forkDetectionData);
        if (tag != null) {
            tag = tag.substring(2);
        }

        this.prefixHash = tag.substring(0, 40);
        this.CPV = tag.substring(40, 54);
        this.NU = parseInt(tag.substring(54, 56), 16);
        this.BN = parseInt(tag.substring(56, 64), 16);
    }

    private hexToBytes(hex) {
        var bytes = [];

        for (var c = 0; c < hex.length; c += 2)
            bytes.push(hex.substr(c, 2));

        return bytes;
    }

    public overlapCPV(cpvToCheck: string, countCPVtoMatch: number) {
        return this.getNumberOfOverlapInCPV(cpvToCheck) >= countCPVtoMatch;
    }

    public toString() : string {
        return '0x' + this.prefixHash + this.CPV + toHex(this.NU, 1) + toHex(this.BN, 4);
    }

    public equals(other: ForkDetectionData) : boolean {
        return this.prefixHash === other.prefixHash &&
            this.CPV === other.CPV &&
            this.NU === other.NU &&
            this.BN === other.BN;
    }

    private getNumberOfOverlapInCPV(cpvToCheck: string): number {
        let cpvSplit = this.hexToBytes(this.CPV);
        let cpvToCheckSplit = this.hexToBytes(cpvToCheck);
        var numberOfMatch = 0;

        for (var i = 0; i < cpvSplit.length && numberOfMatch == 0; i++) {
            for (var j = 0; j < cpvToCheckSplit.length; j++) {
                if (cpvSplit[i] == cpvToCheckSplit[j]) {
                    if (cpvSplit.slice(i).toString() == cpvToCheckSplit.slice(j, cpvToCheckSplit.length - i).toString()) {
                        return cpvSplit.slice(i).length;
                    };
                } else {
                    break;
                }
            }
        }

        return 0;
    }
}