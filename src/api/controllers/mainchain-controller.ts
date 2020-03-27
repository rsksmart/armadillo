import { MainchainService } from '../../services/mainchain-service';
import { ForkItem, Item } from '../../common/forks';
import { MessageResponse } from '../common/models';

/* eslint-disable class-methods-use-this */

export class MainchainController {
  private service: MainchainService;
        

  constructor(service: MainchainService) {
    this.service = service;
    this.service.createIndex({ "rskInfo.height": 1 , "rskInfo.mainchain": 1 }, { unique: true });
  }

  public async getLastBlocks(req: any, res: any): Promise<MessageResponse<Item[]>> {
    const n: number = parseInt(req.params.n);
    var blocks: Item[] = await this.service. getLastItems(n);
    
    return res.status(200).send(
      new MessageResponse<Item[]>(
        `Get last ${blocks.length}/${req.params.n} blocks in mainchain`,
        true,
        blocks
      )
    );
  }

  public async getLastBtcBlocksBetweenHeight(req: any, res: any): Promise<MessageResponse<Item[]>> {
    const startHeight: number = parseInt(req.params.startHeight);
    const endHeight: number = parseInt(req.params.endHeight);

    if(endHeight < startHeight){
      return new MessageResponse<Item[]>(
        `endHeight:${endHeight} must be bigger than startHeight: ${startHeight}`,
        false,
        []
      )
    }
    var blocks: Item[] = await this.service.getBtcBlocksBetweenRskHeight(startHeight, endHeight);
    
    return res.status(200).send(
      new MessageResponse<Item[]>(
        `Get just last BTC blocks between ${startHeight} and ${endHeight} BTC height`,
        true,
        blocks
      )
    );
  }

  public async getBtcBlocksBetweenRskHeight(req: any, res: any): Promise<MessageResponse<Item[]>> {
    const startHeight: number = parseInt(req.params.startHeight);
    const endHeight: number = parseInt(req.params.endHeight);
    
    if(endHeight < startHeight){
      return new MessageResponse<Item[]>(
        `endHeight:${endHeight} must be bigger than startHeight: ${startHeight}`,
        false,
        []
      )
    }
    
    var blocks: Item[] = await this.service.getBtcBlocksBetweenRskHeight(startHeight, endHeight);
    
    return res.status(200).send(
      new MessageResponse<Item[]>(
        `Get just last BTC blocks between ${startHeight} and ${endHeight} RSK height`,
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

  public async getAll(req: any, res: any): Promise<MessageResponse<Item[]>> {
    var items : Item[] = await this.service.getAll();

    return res.status(200).send(new MessageResponse<Item[]>(
      `Get all mainnet items`,
      true,
      items
    ));
  }
}