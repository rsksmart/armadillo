import { ForkInformation } from "./fork-information-builder";

export class DefconLevel {
    private level: number;
    private name: string;
    private distanceThreshold: number;
    private hashrateThreshold: number;

    constructor(level: number, name: string, distanceThreshold: number, hashrateThreshold: number) {
        this.level = level;
        this.name = name || '';
        this.distanceThreshold = distanceThreshold;
        this.hashrateThreshold = hashrateThreshold;
    }

    public activeFor(forkInfo: ForkInformation) : boolean {
        return forkInfo.forkLengthRskBlocks >= this.distanceThreshold && 
            forkInfo.btcForkBlockPercentageOverMergeMiningBlocks >= this.hashrateThreshold;
    }

    public getLevel() : number {
        return this.level;
    }

    public getName(): string {
        return (this.name && this.name.length !== 0) ? this.name : 'default';
    }
}