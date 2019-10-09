import { MainchainService } from '../../services/mainchain-service';
import { BranchService } from '../../services/branch-service';
import { Branch, BranchItem } from '../../common/branch';

export class BlockchainController {
  private mainchainService: MainchainService;
  private branchService: BranchService;

  constructor(mainchainService: MainchainService, branchService: BranchService) {
    this.mainchainService = mainchainService;
    this.branchService = branchService;
  }

  public async getLastBlockchains(req: any, res: any): Promise<any> {
    let n: number = parseInt(req.params.n);
    var blockchains = { mainchain : [], forks: []};

    if(n > 5000){
      n = 5000;
    }
    
    blockchains.mainchain = await this.mainchainService.getLastItems(n);
    
    let heightToGetForksFrom = 0;
    if( blockchains.mainchain.length != 0){
      heightToGetForksFrom = blockchains.mainchain[0].rskInfo.height - (n - 1);
    }
    let forksBranches = await this.branchService.getForksDetected(heightToGetForksFrom);
    blockchains.forks = forksBranches.map(x => Branch.fromObjectToListBranchItems(x));
    return res.status(200).send({
      success: 'true',
      message: `Get mainchain and forks in the last ${n} blocks`,
      blockchains: blockchains,
    });
  }
}