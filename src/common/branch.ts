import { ForkDetectionData } from "./fork-detection-data";
import { BtcHeaderInfo } from "./btc-block";

export default class Branch {
    public firstDetected: ForkDetectionData; //rsk item when fork started
    public lastDetectedHeight: number;  
   
    private items: BranchItem[];

    constructor(branchItem: BranchItem) {
        this.items = [];
        this.firstDetected = branchItem.forkDetectionData;
        this.items.push(branchItem);
    }

    public getTop(): BranchItem {
        return this.items[this.items.length -1];
    }

    public pushTop(branch: BranchItem) {
        this.lastDetectedHeight = branch.forkDetectionData.BN;

        this.items.push(branch);
    }

    public getStart(): BranchItem {
        return this.items[0];
    }

    public getLast(): BranchItem {
        return this.items[this.lengh()];
    }

    public lengh(): number {
        return this.items.length;
    }
}

export class BranchItem {
    public btcInfo: BtcHeaderInfo;
    public forkDetectionData: ForkDetectionData

    constructor(btcInfo: BtcHeaderInfo, forkDetectionData: ForkDetectionData){
        btcInfo  = btcInfo;
        forkDetectionData = forkDetectionData;
    }
}