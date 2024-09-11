import { IDevOptions } from "./interfaces";
export const defaultDevOptions: IDevOptions = {
  server: "localhost",
  port: 8081,
  openBrowser: true,
  root: "./",
  home: "/",
  response: (filePath, res) => {
    return false;
  },

  notFoundHandler(req, res) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.write("404 ,Not Found!");
  },

  serverErrorHandler(req, res) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.write("500 ,Server Error!");
  },

  fixPath: (req) => {
    let [reqPath] = req.url.split("?");
    reqPath = decodeURIComponent(reqPath);
    let paths = reqPath.split("/");
    let names = paths.pop().split(".");
    let extName = names.pop();
    let fileName = names.join(".");
    if (fileName === "") {
      //  /结尾
      fileName = "index";
    }
    if (extName === "") {
      const accept = req.headers.accept ?? "";
      if (accept.includes("text/html")) {
        extName = ".html";
      } else if (accept == "*/*") {
        extName = ".js";
      }
    } else {
      extName = "." + extName;
    }

    return { reqDir: paths.join("/") + "/", fileName, extName };
  },
};
