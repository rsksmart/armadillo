import { ForkService as ForkService } from '../../services/fork-service';
import { MessageResponse } from '../common/message-response';

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
}