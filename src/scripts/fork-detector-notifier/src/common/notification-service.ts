import { MongoStore } from "../../../../storage/mongo-store";
import BaseService from "../../../../services/base-service"
import ForkNotification from "./models/forkNotification";

export class NotificationService extends BaseService {

    constructor(store: MongoStore) {
        super(store);
    }

    public async notificationForkWasSent(identifier: string): Promise<boolean> {
        //First remove the existing item and then save the new items
        var count = await this.store.getCollection().countDocuments({ "identifier": identifier }, { limit: 1 });
        return count > 0;
    }

    public async saveForkNotifications(notifications: ForkNotification[]): Promise<void> {
        await this.store.getCollection().insertMany(notifications);
    }
}

