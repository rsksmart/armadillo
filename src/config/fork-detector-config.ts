export class ForkDetectorConfig
 {
    public timeToSleepWaitingForkRskBlocks: number;
    public rskBlocksToWait: number;

    public static fromObject(config: any): ForkDetectorConfig {
        return new ForkDetectorConfig(config.timeToSleepWaitingForkRskBlocks, config.rskBlocksToWait);
    }
    
    constructor(timeToSleepWaitingForkRskBlocks: number, rskBlocksToWait: number) {
        this.timeToSleepWaitingForkRskBlocks = timeToSleepWaitingForkRskBlocks;
        this.rskBlocksToWait = rskBlocksToWait;
    }
}
