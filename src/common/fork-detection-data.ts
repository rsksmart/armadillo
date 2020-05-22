import { checkTag, toHex } from "../util/helper";

export class ForkDetectionData {
    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(forkDetectionData: string | any) {
        if (typeof forkDetectionData != "string") {
            //Is an object
            this.prefixHash = forkDetectionData.prefixHash;
            this.CPV = forkDetectionData.CPV;
            this.NU = forkDetectionData.NU;
            this.BN = forkDetectionData.BN;
            return;
        }

        let tag = checkTag(forkDetectionData);

        if (tag != null) {
            tag = tag.substring(2);
            this.prefixHash = tag.substring(0, 40);
            this.CPV = tag.substring(40, 54);
            this.NU = parseInt(tag.substring(54, 56), 16);
            this.BN = parseInt(tag.substring(56, 64), 16);
        } else {
            return null;
        }
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

    public toString(): string {
        return '0x' + this.prefixHash + this.CPV + toHex(this.NU, 1) + toHex(this.BN, 4);
    }

    public equals(other: ForkDetectionData): boolean {
        return this.prefixHash === other.prefixHash &&
            this.CPV === other.CPV &&
            this.NU === other.NU &&
            this.BN === other.BN;
    }

    public getNumberOfOverlapInCPV(cpvToCheck: string): number {
        const CPVLENGTH = 7;
        let cpvSplit = this.hexToBytes(this.CPV);
        let cpvToCheckSplit = this.hexToBytes(cpvToCheck);

        for (var j = 0; j < cpvToCheckSplit.length; j++) {
            if (cpvSplit[0] == cpvToCheckSplit[j]) {
                if (cpvSplit.slice(0, CPVLENGTH - j).toString() == cpvToCheckSplit.slice(j, CPVLENGTH).toString()) {
                    return CPVLENGTH - j;
                };
            }
        }

        return 0;
    }

    public getNumberOfBytesThatCPVMatch(forkDetectionDataToCompare: ForkDetectionData): number {
        let height = Math.floor((this.BN - 1) / 64);
        let heightToCompare = Math.floor((forkDetectionDataToCompare.BN - 1) / 64);
        let difference = Math.abs(height - heightToCompare);

        if (difference > 7) {
            return 0;
        }

        let cpv;
        let cpvToCheckSpplited;

        if (height < heightToCompare) {
            cpv = this.CPV.slice(0, this.CPV.length - 2 * difference);
            cpvToCheckSpplited = forkDetectionDataToCompare.CPV.slice(2 * difference);
        } else {
            cpv = forkDetectionDataToCompare.CPV.slice(0, this.CPV.length - 2 * difference);
            cpvToCheckSpplited = this.CPV.slice(2 * difference);
        }

        for (let i = 0; i < cpv.length; i = i + 2) {
            var cpvSliced = cpv.slice(i);
            if (cpvSliced === cpvToCheckSpplited.slice(i)) {
                return cpvSliced.length / 2;
            }
        }

        return 0;
    }
}