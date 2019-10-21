import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";
import { RskBlock } from "./rsk-block";

export class Branch {
   
    private firstDetected: ForkDetectionData; //rsk item when fork started
    private lastDetectedHeight: number;
    private items: BranchItem[];
    private mainchainBlockForkCouldHaveStarted: RskBlock

    constructor(mainchainBlockForkCouldHaveStarted: RskBlock, branchItems: BranchItem | BranchItem[]) {
        this.mainchainBlockForkCouldHaveStarted = mainchainBlockForkCouldHaveStarted;
        
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

        branch.items.map(x => items.splice(1).push(BranchItem.fromObject(x)));

        return new Branch(branch.items[0], items);
    }

    static fromObjectToListBranchItems(branche: any): BranchItem[] {
        let items: BranchItem[] = [];
        
        branche.items.map(x => items.push(BranchItem.fromObject(x)));
        let mainchainBlockForkCouldHaveStarted = {
            btcInfo: null,
            rskInfo: branche.mainchainBlockForkCouldHaveStarted
        }
        return items.concat(mainchainBlockForkCouldHaveStarted);
        // return items.concat(branche.mainchainBlockForkCouldHaveStarted);
    }

    public addNewForkItem(branch: BranchItem) {
        this.lastDetectedHeight = branch.rskInfo.forkDetectionData.BN;
        this.items.unshift(branch);
    }

    public getForkItems(): BranchItem[] {
        return this.items;
    }

    //This getter return all the forks items + mainchain connection block
    public getCompleteBranch(): BranchItem[] {
        return this.items.concat(new BranchItem(null, this.mainchainBlockForkCouldHaveStarted));
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
        return new BranchItem(BtcHeaderInfo.fromObject(branchItem.btcInfo), branchItem.rskInfo);
    }
}
