import { MainchainService } from '../../services/mainchain-service';

/* eslint-disable class-methods-use-this */

export class MainchainController {
  private service: MainchainService;

  constructor(service: MainchainService) {
    this.service = service;
    this.service.createIndex({ "rskInfo.height": 1 }, { unique: true });
  }

  public async getLastBlocks(req: any, res: any): Promise<any> {
    const n: number = parseInt(req.params.n);
    var blocks: any[] = await this.service.getLastItems(n);

    return res.status(200).send({
      success: 'true',
      message: `get last ${blocks.length}/${req.params.n} blocks in mainchain`,
      blocks: blocks,
    });
  }

  public async removeLastBlocks(req: any, res: any): Promise<any> {
    const n: number = parseInt(req.params.n);

    this.service.removeLastBlocks(n);
    
    return res.status(200).send({
      success: 'true',
      message: `remove last ${req.params.n} blocks in mainchain`,
    });
  }

  public async getAll(req: any, res: any): Promise<any> {
    const n: number = parseInt(req.params.n);

    var items = await this.service.getAll();
    
    return res.status(200).send({
      success: 'true',
      message: `get all`,
      items: items
    });
  }
}