import { BranchService } from '../../services/branch-service';

/* eslint-disable class-methods-use-this */

export default class BranchController {
  private service: BranchService;

  constructor(service: BranchService) {
    this.service = service;
    // this.service.createIndex({ "header.height": 1 }, { unique: false });
  }


  public async getAllBranches(req: any, res: any): Promise<any> {
    var branches: any = await this.service.getAll();

    return res.status(200).send({
      success: 'true',
      message: 'get alls branchs',
      branches: branches,
    });
  }

  //It should return last branch detected
  // public async getLastBranche(req: any, res: any): Promise<any> {
  //   const n: number = parseInt();
  //   var branch: any= await this.service.getLastBranch();

  //   return res.status(200).send({
  //     success: 'true',
  //     message: `get last branch`,
  //     branch: branch,
  //   });
  // }
}