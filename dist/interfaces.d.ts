/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import open from "open";
export interface IProxy {
    host: string;
    port: number;
    from: string;
    to?: string;
    path?: string;
    https?: boolean;
    headers?: {} | ((req: IncomingMessage) => {});
    dispatch?(url: string): IProxy | null;
}
export interface IFixPathResult {
    /**
     * 请求目录
     */
    reqDir: string;
    /**
     * 请求文件名
     */
    fileName: string;
    /**
     * 请求扩展名
     */
    extName: string;
}
export interface IDevOptions {
    /**
     *Server start name：localhost | 127.0.0.1 | 0.0.0.0 |...
     */
    server: string;
    /**
     * Server start port：80 | 443 | 9000 |...
     */
    port: number;
    https: false | {
        key: string;
        cert: string;
    };
    /**
     * Open browser
     */
    openBrowser: boolean | open.AppName;
    /**
     * Project root directory
     */
    root: string;
    /**
     * Home page path
     */
    home: string;
    /**
     * 如果对路径进行了处理，返回ture，就不在进行之后的处理
     * @param filePath
     * @param res
     * @param extra
     * @param IncomingMessage
     */
    response?(filePath: string, res: ServerResponse, extra: {
        fileName: string;
        extName: string;
        reqDir: string;
        req?: IncomingMessage;
    }, req?: IncomingMessage): boolean;
    /**
     * handle 404
     * @param req Request
     * @param res Response
     */
    notFoundHandler?(req: IncomingMessage, res: ServerResponse): void;
    /**
     * handle 500
     * @param req Request
     * @param res Response
     */
    serverErrorHandler?(req: IncomingMessage, res: ServerResponse): void;
    /**
     * 请求来时先处理一下请求地址，可以进行默认后缀等功能的处理
     * @param req Request
     */
    fixPath?(req: IncomingMessage): IFixPathResult;
}
