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