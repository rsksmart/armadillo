import { Fork, Item } from "../../common/forks";

export class MessageResponse<T> {
  public message: string;
  public success: boolean;
  public data: T

  constructor(message: string, success: boolean, data?: T) {
    this.message = message;
    this.success = success;
    this.data = data;
  }
}

export class BlockchainHistory {
  public readonly forks: Fork[];
  public readonly mainchain: Item[];

  constructor(mainchain: Item[], forks: Fork[]) {
    this.forks = forks;
    this.mainchain = mainchain;
  }

  static fromObject(blockchainHistory: any): BlockchainHistory {

    var forks = blockchainHistory.forks.map(y => Fork.fromObject(y));
    var mainchain = blockchainHistory.mainchain.map(x => Item.fromObject(x));
    return new BlockchainHistory(mainchain, forks);
  }
}
