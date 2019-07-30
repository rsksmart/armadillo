import { ForkDetectionData } from "./fork-detection-data";

export default class Branch {
    public _id: number;
    public startHeight: number;
    public lastHeight: number;
    private items: ForkDetectionData[];

    constructor(initialItem?: ForkDetectionData) {
        this.items = [];
        this.items.push(initialItem);
    }

    public getTop(): ForkDetectionData {
        return this.items.pop(); //get last item
    }

    public pushTop(tag: ForkDetectionData) {
        
        if(this.items.length == 0){
            this.startHeight = tag.BN;
        }

        this.lastHeight = tag.BN;
        this.items.push(tag);
    }

    public getStart(): ForkDetectionData {
        if(this.items.length > 0 ){
            return this.items[0];
        }
    }

    public getLast(): ForkDetectionData {
        return this.items[this.lengh()];
    }

    public lengh(): number {
        return this.items.length;
    }
}