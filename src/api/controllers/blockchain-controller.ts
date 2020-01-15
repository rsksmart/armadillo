import { MainchainService } from '../../services/mainchain-service';
import { BranchService } from '../../services/branch-service';
import { Branch, BranchItem } from '../../common/branch';
import { MessageResponse } from '../common/message-response';

export class BlockchainHistory {
  public forks: BranchItem[][];
  public mainchain: BranchItem[];

  constructor(mainchain: BranchItem[], forks: BranchItem[][]) {
    this.forks = forks;
    this.mainchain = mainchain;
  }
}

export class BlockchainController {
  private mainchainService: MainchainService;
  private branchService: BranchService;

  constructor(mainchainService: MainchainService, branchService: BranchService) {
    this.mainchainService = mainchainService;
    this.branchService = branchService;
  }

  public async getLastBlocksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var mainchain : BranchItem[] = await this.mainchainService.getLastItems(n);

    let heightToGetForksFrom = 0;

    if (mainchain.length != 0) {
      heightToGetForksFrom = mainchain[0].rskInfo.height - (n - 1);
    }

    let forksBranches = await this.branchService.getForksDetected(heightToGetForksFrom);
    var forks: BranchItem[][] = forksBranches.map(x => Branch.fromObjectToListBranchItems(x));

    return res.status(200).send(
      new MessageResponse(
        `Get mainchain and forks in the last ${n} blocks`,
        true,
        new BlockchainHistory(mainchain, forks)
      )
    );
  }
}