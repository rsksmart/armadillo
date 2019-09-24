import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";
import { RskBlock } from "./rsk-block";

export class Branch {
   
    private firstDetected: ForkDetectionData; //rsk item when fork started
    private lastDetectedHeight: number;
    private items: BranchItem[];
    private mainchainBlockForkCouldHaveStarted: BranchItem

    constructor(mainchainBlockForkCouldHaveStarted: BranchItem, branchItems: BranchItem | BranchItem[]) {
        this.mainchainBlockForkCouldHaveStarted = mainchainBlockForkCouldHaveStarted;
        if (branchItems instanceof BranchItem) {
            this.items = [];
            this.firstDetected = branchItems.rskInfo.forkDetectionData;
            this.pushTop(branchItems);
        } else {
            if (branchItems.length > 0) {
                this.items = branchItems;
                this.firstDetected = branchItems[0].rskInfo.forkDetectionData;
                this.lastDetectedHeight = branchItems[branchItems.length - 1].rskInfo.forkDetectionData.BN;
            } else {
                throw "branchItems should have at least one item"
            }
        }
    }

    static fromObject(branch: any): Branch {
        let items: BranchItem[] = [];

        branch.items.map(x => items.splice(1).push(BranchItem.fromObject(x)));

        return new Branch(branch.items[0], items);
    }

    static fromObjectToListBranchItems(branche: any): BranchItem[] {
        let items: BranchItem[] = [];
        
        branche.items.map(x => items.push(BranchItem.fromObject(x)));

        return items;
    }

    public getTop(): BranchItem {
        return this.items[this.items.length - 1];
    }

    public pushTop(branch: BranchItem) {
        this.lastDetectedHeight = branch.rskInfo.forkDetectionData.BN;
        this.items.push(branch);
    }

    public getStart(): BranchItem {
        return this.items[0];
    }

    public getLast(): BranchItem {
        return this.items[this.items.length - 1];
    }

    public getForkItems(): BranchItem[] {
        return this.items;
    }

    //This getter return all the forks items + mainchain connection block
    public getCompleteBranch(): BranchItem[] {
        return [this.mainchainBlockForkCouldHaveStarted].concat(this.items);
    }

    public lengh(): number {
        return this.items.length;
    }

    public getFirstDetected(){
        return this.firstDetected;
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
