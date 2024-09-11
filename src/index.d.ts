/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { IDevOptions, IProxy } from "./interfaces";
export declare function proxy(req: IncomingMessage, res: ServerResponse, proxy: IProxy): void;
export declare function dev(options: Partial<IDevOptions>, ...proxies: Partial<IProxy>[]): {
    reload(message?: string): void;
};
