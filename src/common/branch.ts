import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";
import { RskBlockInfo, RskForkItemInfo } from "./rsk-block";

export class RangeForkInMainchain {
    public startBlock: RskBlockInfo;
    public endBlock: RskBlockInfo;

    constructor(_startBlock: RskBlockInfo, _endBlock: RskBlockInfo){
        this.startBlock = _startBlock;
        this.endBlock = _endBlock;
    }

    static fromObject(rangeForkInMainchain: any): RangeForkInMainchain {
        return new RangeForkInMainchain(rangeForkInMainchain.startBlock, rangeForkInMainchain.endBlock);
    }
}

export class Branch {
    //firstDetected contains the forkDetectionData of the first element in items
    private firstDetected: ForkDetectionData;
    private lastDetectedHeight: number;
    private items: BranchItem[];
    private mainchainRangeForkCouldHaveStarted: RangeForkInMainchain;

    constructor(mainchainRangeForkCouldHaveStarted: RangeForkInMainchain, branchItems: BranchItem | BranchItem[]) {
        this.mainchainRangeForkCouldHaveStarted = mainchainRangeForkCouldHaveStarted;
        
        if (branchItems instanceof BranchItem) {
            this.items = [];
            this.firstDetected = branchItems.rskForkInfo.forkDetectionData;
            this.addNewForkItem(branchItems);
        } else {
            if (branchItems.length > 0) {
                let branches = branchItems.sort((x,y) => x.rskForkInfo.forkDetectionData.BN > y.rskForkInfo.forkDetectionData.BN ? 0 : 1);
                this.items = branches;
                this.firstDetected = branches[branches.length -1].rskForkInfo.forkDetectionData;
                this.lastDetectedHeight = branchItems[0].rskForkInfo.forkDetectionData.BN;
            } else {
                throw "branchItems should have at least one item"
            }
        }
    }

    static fromObject(branch: any): Branch {
        let items: BranchItem[] = [];

        branch.items.map(x => items.push(BranchItem.fromObject(x)));

        return new Branch(RangeForkInMainchain.fromObject(branch.mainchainRangeForkCouldHaveStarted), items);
    }

    public addNewForkItem(branch: BranchItem) {
        this.lastDetectedHeight = branch.rskForkInfo.forkDetectionData.BN;
        this.items.unshift(branch);
    }

    public getForkItems(): BranchItem[] {
        return this.items;
    }

    public forkLenght(): number {
        return this.items.length;
    }

    public getFirstDetected(): BranchItem{
        return this.items[this.items.length -1];
    }

    public getLastDetected(): BranchItem {
        return this.items[0];
    }

    public getLastDetectedHeight(){
        return this.lastDetectedHeight;
    }
}

export class  Item {
    public btcInfo?: BtcHeaderInfo;
    public rskInfo: RskBlockInfo;

    constructor(btcInfo: BtcHeaderInfo, rskBlock: RskBlockInfo) {
        this.btcInfo = btcInfo;
        this.rskInfo = rskBlock;
    }

    static fromObject(branchItem: any): Item {
        return new Item(BtcHeaderInfo.fromObject(branchItem.btcInfo), RskBlockInfo.fromObject(branchItem.rskInfo));
    }
}

export class BranchItem {
    public btcInfo: BtcHeaderInfo;
    public rskForkInfo: RskForkItemInfo;
    public time: string;

    constructor(btcInfo: BtcHeaderInfo, rskForkInfo: RskForkItemInfo) {
        this.btcInfo = btcInfo;
        this.rskForkInfo = rskForkInfo;
        
        this.time = Date();
    }

    static fromObject(branchItem: any): BranchItem {
        return new BranchItem(BtcHeaderInfo.fromObject(branchItem.btcInfo), RskForkItemInfo.fromObject(branchItem.rskForkInfo));
    }
}
