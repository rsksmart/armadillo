import { ForkService as ForkService } from '../../services/fork-service';
import { MessageResponse } from '../common/models';

/* eslint-disable class-methods-use-this */

export default class ForkController {
  private service: ForkService;

  constructor(service: ForkService) {
    this.service = service;
  }

  public async removeAll(req: any, res: any): Promise<MessageResponse<any>> {
    await this.service.deleteAll();
    
    return res.status(200).send(new MessageResponse(
      `Remove all forks`,
      true
    ));
  }

  public async getAll(req: any, res: any): Promise<MessageResponse<any>> {
    var data = await this.service.getAll();

    return res.status(200).send(new MessageResponse(
      `Get all forks`,
      true,
      data
    ));
  }

  public async getForksFrom(req: any, res: any): Promise<MessageResponse<any>> {
    let n: number = parseInt(req.params.n);

    var data = await this.service.getForksDetectedFromBtcHeight(n);

    return res.status(200).send(new MessageResponse(
      `Get forks from ${n}`,
      true,
      data
    ));
  }
}