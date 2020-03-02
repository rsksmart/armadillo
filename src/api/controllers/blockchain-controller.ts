import { MainchainService } from '../../services/mainchain-service';
import { BranchService } from '../../services/branch-service';
import { Branch, Item } from '../../common/branch';
import { MessageResponse } from '../common/message-response';

export class BlockchainHistory {
  public forks: Branch[];
  public mainchain: Item[];

  constructor(mainchain: Item[], forks: Branch[]) {
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

  private async getBlockchain(n : number){
    var mainchain : Item[] = await this.mainchainService.getLastBtcBlocksDetectedInChain(n);

    let heightToGetForksFrom = 0;

    if (mainchain.length != 0) {
      heightToGetForksFrom = mainchain[0].rskInfo.height - (n - 1);
    }

    let forksBranches = await this.branchService.getForksDetected(heightToGetForksFrom);

    return new BlockchainHistory(mainchain, forksBranches);
  }

  public async getLastBlocksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var data = await this.getBlockchain(n);

    return res.status(200).send(
      new MessageResponse(
        `Get mainchain and forks in the last ${n} BTC blocks`,
        true,
        data
      )
    );
  }

  public async getLastForksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var data = await this.getBlockchain(n);

    return res.status(200).send(
      new MessageResponse(
        `Get forks in the last ${n} BTC blocks`,
        true,
        data.forks
      )
    );
  }
}