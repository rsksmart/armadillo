import { checkTag } from "../util/helper";

export class ForkDetectionData {
    static getObject(tag: string): ForkDetectionData {
        return new ForkDetectionData(tag);
    }

    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(rskTag: string) {
        // TODO: throw error if length is not 32 bytes

        let tag = checkTag(rskTag);

        if(tag != null){
            tag = tag.substring(2);
        }

        this.prefixHash = tag.substring(0, 40);
        this.CPV = tag.substring(40,54);
        this.NU = parseInt(tag.substring(54,56), 16);
        this.BN = parseInt(tag.substring(56,64) , 16);
    }

    private hexToBytes(hex) {
        var bytes = [];

        for (var c = 0; c < hex.length; c += 2)
            bytes.push(hex.substr(c, 2));

        return bytes;
    }

    public overlapCPV(cpvToCheck: string, countCPVtoMatch: number){
        return this.getNumberOfOverlapInCPV(cpvToCheck) >= countCPVtoMatch;
    }
    
    private getNumberOfOverlapInCPV(cpvToCheck: string): number {
        let cpvSplit = this.hexToBytes(this.CPV);
        let cpvToCheckSplit = this.hexToBytes(cpvToCheck);
        var numberOfMatch = 0;

        for (var i = 0; i < cpvSplit.length && numberOfMatch == 0; i++) {
            for(var j = 0; j < cpvToCheckSplit.length; j ++){
                if (cpvSplit[i] == cpvToCheckSplit[j]) {
                    if(cpvSplit.slice(i).toString() == cpvToCheckSplit.slice(j, cpvToCheckSplit.length - i).toString()){
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