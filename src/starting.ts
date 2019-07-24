
function detectTag() {

}

class ForkDetectionData {

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


let lastBTCheck: BlockBTC;

function getLastBlockFromBTC() {
    return new BlockBTC(1, "hash", "tag loco");
}

function getBlocksFromRSK() {

    let listBLocks: BlockRSK[];

    listBLocks.push(new BlockRSK(5985954, "hash1rsk", "tagHere"))
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", "tagHere1"))
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", "tagHere3232"))
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", "tagHere2"))
    listBLocks.push(new BlockRSK(5985954, "hash1rsk", "tagHere3223s"));

    return listBLocks;
}


function rskTagIsInSomeBlock(blocks: BlockRSK[], rskTag: ForkDetectionData): boolean {

    for (const block of blocks) {
        if(block.rskTag == rskTag){
            return true;
        }
    }

    return false;
}

function getPossibleForks(blockNumber: number) : ForkDetectionData[]{

    let minimunHeightToSearch = getHeightforPossibleBranches(blockNumber);
    //connect to the database to get possible branches forks
    service.getPossibleForks()
}

function getBranchesThatOverlap(rskTag: ForkDetectionData) {
    let branchesThatOverlap = []

    //Get possible branches given a height
    let branches: ForkDetectionData[] = getPossibleForks(rskTag.BN);

    for (const branch of branches) {
        let last = branch.last();

        if(overlapsInXPosition(last, cpvToCheck)){
            branchesThatOverlap.push(branch)
        }
    }

    return branchesThatOverlap
}

function createNewBranch(){

    
}

function addOrCreateInTemporalLine(rskTag: ForkDetectionData){
    let cpvToCheck = rskTag.CPV;

    const branches: ForkDetectionData[] = getBranchesThatOverlap(rskTag)

    if (branches.length > 0) {
        // por ahora solo usamos el primero
        const branch = branches[0]
        branch.push(rskTag)
    } else {
        createNewBranch(rskTag);
    }
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