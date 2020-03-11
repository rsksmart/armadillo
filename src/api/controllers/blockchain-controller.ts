import { MainchainService } from '../../services/mainchain-service';
import { ForkService } from '../../services/fork-service';
import { MessageResponse, BlockchainHistory } from '../common/models';
import { Item } from '../../common/forks';

export class BlockchainController {
  private mainchainService: MainchainService;
  private forkService: ForkService;

  constructor(mainchainService: MainchainService, forkService: ForkService) {
    this.mainchainService = mainchainService;
    this.forkService = forkService;
  }

  private async getBlockchain(n : number){
    var mainchain : Item[] = await this.mainchainService.getLastBtcBlocksDetectedInChain(n);

    let heightToGetForksFrom = 0;

    if (mainchain.length != 0) {
      heightToGetForksFrom = mainchain[0].rskInfo.height - (n - 1);
    }

    let forks = await this.forkService.getForksDetected(heightToGetForksFrom);

    return new BlockchainHistory(mainchain, forks);
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