import { IProxy } from "./interfaces";

export const defaultProxy: IProxy = {
  host: "localhost",
  port: 8080,
  https: false,
  dispatch(url) {
    return null;
  },
  from: "/api",
  to: "/api",
};
