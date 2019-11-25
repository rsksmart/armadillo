import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";
import { RskBlock } from "./rsk-block";

export class RangeForkInMainchain {
    public startBlock: RskBlock;
    public endBlock: RskBlock;

    constructor(_startBlock: RskBlock, _endBlock: RskBlock){
        this.startBlock = _startBlock;
        this.endBlock = _endBlock;
    }

    static fromObject(rangeForkInMainchain: any): RangeForkInMainchain {
        return new RangeForkInMainchain(rangeForkInMainchain.startBlock, rangeForkInMainchain.endBlock);
    }
}

export class Branch {
    //firstDetected is the first item detected and why the fork was created
    private firstDetected: ForkDetectionData; 
    private lastDetectedHeight: number;
    private items: BranchItem[];
    private mainchainRangeForkCouldHaveStarted: RangeForkInMainchain;

    constructor(mainchainRangeForkCouldHaveStarted: RangeForkInMainchain, branchItems: BranchItem | BranchItem[]) {
        this.mainchainRangeForkCouldHaveStarted = mainchainRangeForkCouldHaveStarted;
        
        if (branchItems instanceof BranchItem) {
            this.items = [];
            this.firstDetected = branchItems.rskInfo.forkDetectionData;
            this.addNewForkItem(branchItems);
        } else {
            if (branchItems.length > 0) {
                let branches = branchItems.sort((x,y) => x.rskInfo.height > y.rskInfo.height ? 0 : 1);
                this.items = branches;
                this.firstDetected = branches[branches.length -1].rskInfo.forkDetectionData;
                this.lastDetectedHeight = branchItems[0].rskInfo.forkDetectionData.BN;
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

    static fromObjectToListBranchItems(branch: Branch): BranchItem[] {
        let items: BranchItem[] = [];
        
        branch.items.map(x => items.push(BranchItem.fromObject(x)));

        return items.concat([
                new BranchItem(null, branch.mainchainRangeForkCouldHaveStarted.endBlock),
                new BranchItem(null, branch.mainchainRangeForkCouldHaveStarted.startBlock)]
                );
    }

    public addNewForkItem(branch: BranchItem) {
        this.lastDetectedHeight = branch.rskInfo.forkDetectionData.BN;
        this.items.unshift(branch);
    }

    public getForkItems(): BranchItem[] {
        return this.items;
    }

    //This getter return all the forks items + mainchain range
    public getCompleteBranch(): BranchItem[] {
        var completeBranch : BranchItem[];
        completeBranch = this.items.concat(new BranchItem(null, this.mainchainRangeForkCouldHaveStarted.endBlock));
        completeBranch.concat(new BranchItem(null, this.mainchainRangeForkCouldHaveStarted.startBlock));
        return completeBranch;
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

export class BranchItem {
    public btcInfo: BtcHeaderInfo;
    public rskInfo: RskBlock;

    constructor(btcInfo: BtcHeaderInfo, rskBlock: RskBlock) {
        this.btcInfo = btcInfo;
        this.rskInfo = rskBlock
    }

    static fromObject(branchItem: any): BranchItem {
        return new BranchItem(BtcHeaderInfo.fromObject(branchItem.btcInfo), RskBlock.fromObject(branchItem.rskInfo));
    }
}
