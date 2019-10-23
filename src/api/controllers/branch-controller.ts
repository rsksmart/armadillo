import { BranchService } from '../../services/branch-service';
import { Branch } from '../../common/branch';
import { MessageResponse } from '../common/message-response';

/* eslint-disable class-methods-use-this */

export default class BranchController {
  private service: BranchService;

  constructor(service: BranchService) {
    this.service = service;
    // this.service.createIndex({ "header.height": 1 }, { unique: false });
  }

  public async getForksDetected(req: any, res: any): Promise<MessageResponse<Branch[]>> {
    const n: number = parseInt(req.params.n);
    var forks: Branch[] = await this.service.getForksDetected(n);

    return res.status(200).send(
      new MessageResponse<Branch[]>(
        `Get last forks detected in the last ${n} blocks`,
        true,
        forks
      )
    );
  }
}