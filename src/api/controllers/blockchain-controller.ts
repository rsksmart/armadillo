import { MainchainService } from '../../services/mainchain-service';
import { ForkService } from '../../services/fork-service';
import { MessageResponse, BlockchainHistory } from '../common/models';
import { Item, Fork } from '../../common/forks';

export class BlockchainController {
  private mainchainService: MainchainService;
  private forkService: ForkService;

  constructor(mainchainService: MainchainService, forkService: ForkService) {
    this.mainchainService = mainchainService;
    this.forkService = forkService;
  }

  public async getLastBlocksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var mainchain: Item[] = await this.mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(n);

    let btcHeightToGetForksFrom = 0;
    // TODO mainchainWithBtcInfo declaration and secondary condition in if statement should be removed but it's necessary for the integration tests.
    const mainchainWithBtcInfo: Item[] = mainchain.filter(x => x.btcInfo != null);
    if (mainchain.length > 0 && mainchainWithBtcInfo.length === n) {
      btcHeightToGetForksFrom = mainchain[mainchain.length - 1].btcInfo.height;
    }

    let forks = await this.forkService.getForksDetectedFromBtcHeight(btcHeightToGetForksFrom);

    return res.status(200).send(
      new MessageResponse(
        `Get mainchain and forks in the last ${n} BTC blocks`,
        true,
        new BlockchainHistory(mainchain, forks)
      )
    );
  }

  public async getLastForksInChain(req: any, res: any): Promise<MessageResponse<Fork[]>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    let forks : Fork[] = await this.forkService.getLastForks(n);
    return res.status(200).send(
      new MessageResponse(
        `Get forks in the last ${n} BTC blocks`,
        true,
        forks
      )
    );
  }
}