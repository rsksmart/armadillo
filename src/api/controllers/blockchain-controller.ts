import { MainchainService } from '../../services/mainchain-service';
import { BranchService } from '../../services/branch-service';

export class BLockchainController {
  private mainchainService: MainchainService;
  private branchService: BranchService;

  constructor(mainchainService: MainchainService, branchService: BranchService) {
    this.mainchainService = mainchainService;
    this.branchService = branchService;
  }

  public async getLastBlocks(req: any, res: any): Promise<any> {
    let n: number = parseInt(req.params.n);
    var blockchains = { mainchain : [], forks: []};

    if(n > 5000){
      n = 5000;
    }
    
    blockchains.mainchain = await this.mainchainService.getLastItems(n);
    blockchains.forks = await this.branchService.getForksDetected(n);

    return res.status(200).send({
      success: 'true',
      message: `get mainchain and forks found in the last ${n} blocks`,
      blockchains: blockchains,
    });
  }
}