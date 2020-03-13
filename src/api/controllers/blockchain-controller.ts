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

  public async getLastBlocksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var mainchain : Item[] = await this.mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(n);

    let heightToGetForksFrom = 0;

    if (mainchain.length > 0) {
      heightToGetForksFrom = mainchain[mainchain.length -1].btcInfo.height;
    }

    let forks = await this.forkService.getForksDetected(heightToGetForksFrom);

    return res.status(200).send(
      new MessageResponse(
        `Get mainchain and forks in the last ${n} BTC blocks`,
        true,
        new BlockchainHistory(mainchain, forks)
      )
    );
  }

  public async getLastForksInChain(req: any, res: any): Promise<MessageResponse<BlockchainHistory>> {
    let n: number = parseInt(req.params.n);

    if (n > 5000) {
      // 5000 is the maximum of data to return
      n = 5000;
    }

    var mainchain : Item = await this.mainchainService.getFirstBtcBlockDetectedInChainGoingBackwards(n);
    let forks = [];
   
    if(mainchain != null){
      forks = await this.forkService.getForksDetected(mainchain.btcInfo.height);
    }

    return res.status(200).send(
      new MessageResponse(
        `Get forks in the last ${n} BTC blocks`,
        true,
        forks
      )
    );
  }
}