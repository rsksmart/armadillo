import { RangeForkInMainchain, Fork } from "../../../common/forks";

export class ForkInformationEmail {
    public btcGuessedMinersNames: string[];
    public forkBTCitemsLength: number;
    public forkTime: string;
    public distanceFirstItemToBestBlock: number;
    public cpvInfo: any;
    public distanceCPVtoPrevJump: number;
    public bestBlockInRskInThatMoment: number;
    public rangeWhereForkCouldHaveStarted: RangeForkInMainchain;
    public chainDistance: any;
    public btcListHeights: number[];
    public forkLengthRskBlocks: number;
    public btcGuessedMinedInfo: GuessMinedBlockInfo[];
    public fork: Fork
}

export class GuessMinedBlockInfo {
  public poolName: string;
  public totalPorcentageOfBlocksMined: number;
  public numberOfBlocksMined: number;
}
  