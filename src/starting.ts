
function detectTag() {

}

class ForkDetectionData {
    static getObject(tag: string): ForkDetectionData {
        return new ForkDetectionData(tag);
    }

    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(rskTag: string) {
        this.prefixHash = rskTag.slice();
        this.CPV = rskTag.slice();
        this.NU = parseInt(rskTag.slice());
        this.BN = parseInt(rskTag.slice());
    }
}

class BlockBTC {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;

    constructor(_height: number, _hash: string, _rskTag: string) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = new ForkDetectionData(_rskTag);
    }
}

class BlockRSK {
    public height: number;
    public rskTag: ForkDetectionData;
    public hash: string;
    public uncles?: BlockRSK[];

    constructor(_height: number, _hash: string, _rskTag: ForkDetectionData, uncles?: any) {
        this.height = _height;
        this.hash = _hash;
        this.rskTag = _rskTag;
        this.uncles = uncles; // check this
    }
}

class Branch {
    public itemsTags: ForkDetectionData[];

    constructor(initialItem?: ForkDetectionData) {
        this.itemsTags = new ForkDetectionData[];
        this.itemsTags.push(initialItem);
    }

    public getTop(): ForkDetectionData {
        return this.itemsTags.pop(); //get last item
    }

    public pushTop(tag: ForkDetectionData) {
        this.itemsTags.push(tag); //push to last item
    }
}


let lastBTCheck: BlockBTC;

function getLastBlockFromBTC() {
    return new BlockBTC(1, "hash", "tag loco");
}

function getBlocksFromRSK() {

    let listBLocks: BlockRSK[];

    listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag1")));
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag2")));
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag3")));
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag4")));
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", ForkDetectionData.getObject("rskTag5")));

    return listBLocks;
}

function rskTagIsInSomeBlock(blocks: BlockRSK[], rskTag: ForkDetectionData): boolean {

    for (const block of blocks) {
        if (block.rskTag == rskTag) {
            return true;
        }
    }

    return false;
}

function getHeightforPossibleBranches(numberBlock: number): number {
    let maxBlocksBackwardsToSearch = 448;

    if (numberBlock > maxBlocksBackwardsToSearch) {
        return numberBlock - maxBlocksBackwardsToSearch;
    } else {
        return 0;
    }
}

function getPossibleForks(blockNumber: number): ForkDetectionData[] {
    //No necesitamos los branches si no los ultimos "nodos" que se agregaron
    let minimunHeightToSearch = getHeightforPossibleBranches(blockNumber);

    //connect to the database to get possible branches forks , 
    //No deberiamos traer todo, solo hasta un maximo hacia atras
    let forks: ForkDetectionData[] = this.service.getForksDetected(minimunHeightToSearch);

    return forks;
}

function getBranchesThatOverlap(rskTag: ForkDetectionData) {
    let branchesThatOverlap = []
    // Hay que renombrar mejor
    let lastTopsDetected: ForkDetectionData[] = getPossibleForks(rskTag.BN);

    for (const branch of lastTopsDetected) {
        if (overlapCPV(branch, rskTag)) {
            branchesThatOverlap.push(branch)
        }
    }

    return branchesThatOverlap;
}

function overlapCPV(existingTag: ForkDetectionData, tagToCheck: ForkDetectionData): boolean {
    let countCPVtoMatch = 3; // I think we can say that 3 is enaugh to say that is in the same branch

    let cpvInFork = existingTag.CPV.split("");
    let cpvToCheck = tagToCheck.CPV.split("");

    var numberOfMatch = 0;

    for (var i = 0; i < cpvToCheck.length; i++) {
        if (cpvInFork[cpvInFork.length - i] == cpvToCheck[i]) {
            numberOfMatch++;
        } else {
            break;
        }
    }

    if (numberOfMatch >= countCPVtoMatch) {
        return true;
    } else {
        return false;
    }
}

function addOrCreateInTemporalLine(rskTag: ForkDetectionData) {
    let branchToSave: Branch;
    const branches: Branch[] = getBranchesThatOverlap(rskTag)

    if (branches.length > 0) {
        // por ahora solo usamos el primero
        branchToSave = branches[0];
        branchToSave.pushTop(rskTag);
    } else {
        branchToSave = new Branch(rskTag);
    }


    //Deberia crear o editar un branch existente en db
    service.saveBranch(branchToSave);
}

function main() {

    //for now we just do a polling to get last btc block
    let lastBlock: BlockBTC = getLastBlockFromBTC();

    if (lastBlock.hash != lastBTCheck.hash) {

        if (lastBlock.rskTag == null) {
            //this block doesn't have rsktag, nothing to do
            return;
        }
        //is a new block, let's detect rsk tag

        let rskTag: ForkDetectionData = lastBlock.rskTag;

        let hashPrefix = rskTag.prefixHash;
        let CPV = rskTag.CPV;
        let NU = rskTag.NU;
        let BN = rskTag.BN

        //Should we get rsk block from height:
        let blocks: BlockRSK[] = this.getBlocksNumberFromRSK(BN);

        let tagIsInblock: boolean = rskTagIsInSomeBlock(blocks, rskTag);

        if (!tagIsInblock) {
            //save it into db to temporal line, we have to know which is the miner ? 
            addOrCreateInTemporalLine(rskTag);
        } else {
            //Should we do something with this information ? 
            // if CPV is in main chain or in rsk uncles ? 
        }
    }
}

main();