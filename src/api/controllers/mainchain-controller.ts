import { MainchainService } from '../../services/mainchain-service';
import { BranchItem } from '../../common/branch';
import { MessageResponse } from '../common/message-response';

/* eslint-disable class-methods-use-this */

export class MainchainController {
  private service: MainchainService;

  constructor(service: MainchainService) {
    this.service = service;
    this.service.createIndex({ "rskInfo.height": 1 }, { unique: true });
  }

  public async getLastBlocks(req: any, res: any): Promise<MessageResponse<BranchItem[]>> {
    const n: number = parseInt(req.params.n);
    var blocks: BranchItem[] = await this.service.getLastItems(n);
    
    return res.status(200).send(
      new MessageResponse<BranchItem[]>(
        `Get last ${blocks.length}/${req.params.n} blocks in mainchain`,
        true,
        blocks
      )
    );
  }

  public async removeLastBlocks(req: any, res: any): Promise<MessageResponse<any>> {
    const n: number = parseInt(req.params.n);

    this.service.removeLastBlocks(n);
    
    return res.status(200).send(new MessageResponse(
      `Remove last ${req.params.n} blocks in mainchain`,
      true
    ));
  }

  public async getAll(req: any, res: any): Promise<MessageResponse<any>> {
    const n: number = parseInt(req.params.n);

    var items : BranchItem[] = await this.service.getAll();
    
    return res.status(200).send(new MessageResponse<BranchItem[]>(
      `Get all mainnet items`,
      true,
      items
    ));
  }
}