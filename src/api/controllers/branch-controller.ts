import { BranchService } from '../../services/branch-service';
import { Branch } from '../../common/branch';
import { MessageResponse } from '../common/message-response';

/* eslint-disable class-methods-use-this */

export default class BranchController {
  private service: BranchService;

  constructor(service: BranchService) {
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