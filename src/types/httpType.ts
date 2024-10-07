import { IncomingMessage, ServerResponse } from 'http';

export interface HttpType {
    res: IncomingMessage;
    req: ServerResponse;
}
