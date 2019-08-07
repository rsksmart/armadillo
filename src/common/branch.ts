import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";

export class Branch {
    public firstDetected: ForkDetectionData; //rsk item when fork started
    public lastDetectedHeight: number;
    private items: BranchItem[];

    constructor(branchItems: BranchItem | BranchItem[]) {
        if (branchItems instanceof BranchItem) {
            this.items = [];
            this.firstDetected = branchItems.forkDetectionData;
            this.pushTop(branchItems);
        } else {
            if (branchItems.length > 0) {
                this.items = branchItems;
                this.firstDetected = branchItems[0].forkDetectionData;
                this.lastDetectedHeight = branchItems[branchItems.length - 1].forkDetectionData.BN;
            } else {
                throw "branchItems should have at least one item"
            }
        }
    }

    static fromObject(branch: any): Branch {
        let items: BranchItem[] = [];

        branch.items.map(x => items.push(BranchItem.fromObject(x)));

        return new Branch(items);
    }

    public getTop(): BranchItem {
        return this.items[this.items.length - 1];
    }

    public pushTop(branch: BranchItem) {
        this.lastDetectedHeight = branch.forkDetectionData.BN;

        this.items.push(branch);
    }

    public getStart(): BranchItem {
        return this.items[0];
    }

    public getLast(): BranchItem {
        return this.items[this.items.length - 1];
    }

    public getItems(): BranchItem[] {
        return this.items;
    }

    public lengh(): number {
        return this.items.length;
    }
}

export class BranchItem {
    public btcInfo: BtcHeaderInfo;
    public forkDetectionData: ForkDetectionData

    constructor(btcInfo: BtcHeaderInfo, forkDetectionData: ForkDetectionData) {
        this.btcInfo = btcInfo;
        this.forkDetectionData = forkDetectionData;
    }

    static fromObject(branchItem: any): BranchItem {
        let forkDetectionData = branchItem.forkDetectionData;
        return new BranchItem(BtcHeaderInfo.fromObject(branchItem.btcInfo), new ForkDetectionData(forkDetectionData));
    }
}