import { ForkDetectionData } from "./fork-detection-data";

export default class Branch {
    public itemsTags: ForkDetectionData[];

    constructor(initialItem?: ForkDetectionData) {
        this.itemsTags = [];
        this.itemsTags.push(initialItem);
    }

    public getTop(): ForkDetectionData {
        return this.itemsTags.pop(); //get last item
    }

    public pushTop(tag: ForkDetectionData) {
        this.itemsTags.push(tag); //push to last item
    }
}