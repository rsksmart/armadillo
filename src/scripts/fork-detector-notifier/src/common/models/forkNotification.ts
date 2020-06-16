import { Fork } from "../../../../../common/forks";
import { ForkEmail } from "./forkEmail";

export default class ForkNotification {
    public identifier: string;
    public fork: Fork;
    public email: ForkEmail;
  
    constructor(identifier: string, fork: Fork, email: ForkEmail) {
      this.identifier = identifier;
      this.fork = fork;
      this.email = email;
    }
  }