import http, { IncomingMessage, ServerResponse } from "http";
import https from "https";
import { IDevOptions, IProxy } from "./interfaces";

import { defaultDevOptions } from "./defaultDevOptions";
import { defaultProxy } from "./defaultProxy";
import open from "open";

import path from "path";
import mime from "mime";
import fs from "fs";
export function proxy(
  req: IncomingMessage,
  res: ServerResponse,
  proxy: IProxy
) {
  const { connection, host, ...originHeaders } = req.headers;
  const proxyHeaders =
    typeof proxy.headers == "function"
      ? proxy.headers(req)
      : proxy.headers ?? {};
  const options = {
    method: req.method,
    hostname: proxy.host,
    port: proxy.port,
    path: proxy.path ?? proxy.to + req.url.substring(proxy.from.length),
    headers: { ...originHeaders, ...proxyHeaders },
  };
  console.log("call proxy:", options);

  const proxyRequest = proxy.https ? https.request : http.request;

  // Forward each  incoming proxy  request to proxy server
  const proxyReq = proxyRequest(options, (proxyRes) => {
    res.on("close", (e) => {
      if (!proxyRes.destroyed && !proxyRes.closed) {
        proxyRes.destroy();
        console.log("client closed", e, req.url);
      }
    });
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.on("error", (e) => {
    console.log("client error");
  });

  proxyReq.on("error", (err) => {
    console.error("pipe proxy request error", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("500 ~");
  });
  // Forward the body of the request
  req.pipe(proxyReq, { end: true });
}

const watchingScript = `
if (typeof EventSource != undefined) {
    const sse = new EventSource("/--watching")
    sse.addEventListener("message", evt => {
       if(evt.data=="reload") window.location.reload()
    })
}
`;
const sseInjection = `<script src="/--listening"></script>`;

export function dev(
  options: Partial<IDevOptions>,
  ...proxies: Partial<IProxy>[]
) {
  const {
    server,
    root,
    home,
    port,
    https: httpsOption,
    openBrowser,
    notFoundHandler,
    serverErrorHandler,
    fixPath,
    response,
  } = {
    ...defaultDevOptions,
    ...(options ?? {}),
  };
  proxies = proxies.flat();
  //覆盖一下默认设置
  proxies.forEach((proxy) => {
    proxy = { ...defaultProxy, ...proxy };
  });

  const devServer =
    httpsOption === false
      ? http.createServer()
      : https.createServer({
          key:
            typeof httpsOption.key === "string"
              ? fs.readFileSync(httpsOption.key)
              : httpsOption.key,
          cert:
            typeof httpsOption.cert === "string"
              ? fs.readFileSync(httpsOption.cert)
              : httpsOption.cert,
        });
  devServer.listen(port);

  const serverURL = `http${
    httpsOption === false ? "" : "s"
  }://${server}:${port}${home}`;
  console.info("local-dev-server start:", serverURL);
  if (openBrowser != false) {
    let app = openBrowser == true ? "chrome" : openBrowser;

    open(serverURL, {
      app: {
        name: open.apps[app],
      },
    });
  }

  const watches = [];

  devServer.on("request", (req, res) => {
    if (req.url == "/--listening") {
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(watchingScript);
      return;
    }
    if (req.url == "/--watching") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("retry: 5000\n\n");
      watches.push(res);
      return;
    }

    let dispatch = proxies.find(({ from }) => req.url.startsWith(from));
    if (dispatch == null && typeof proxies[0]?.dispatch === "function") {
      dispatch = proxies[0]?.dispatch(req.url);
    }

    if (req.url.startsWith(dispatch?.from)) {
      proxy(req, res, dispatch as IProxy);
    } else {
      if (req.method == "GET") {
        console.log("get url:", req.url);
        const { fileName, extName, reqDir } = fixPath(req);
        const filePath = path.resolve(root, `.${reqDir}${fileName}${extName}`);
        try {
          if (
            !response(
              filePath,
              res,
              {
                fileName,
                extName,
                reqDir,
                req,
              },
              req
            )
          ) {
            if (
              fs.existsSync(filePath) &&
              !fs.statSync(filePath).isDirectory()
            ) {
              try {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader(
                  "Content-Type",
                  mime.getType(filePath) + ";charset=utf-8"
                );
                if (path.extname(filePath) == ".html") {
                  let contents = fs.readFileSync(filePath, "utf8");
                  res.end(contents.replace(/(<\/body>)/i, `${sseInjection}$1`));
                } else {
                  fs.createReadStream(filePath).pipe(res);
                }
              } catch (exc) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("500 ~");

                console.error(exc);
                if (typeof serverErrorHandler == "function") {
                  serverErrorHandler(req, res);
                }
                if (!res.closed) {
                  res.end();
                }
              }
            } else {
              if (typeof notFoundHandler == "function") {
                notFoundHandler(req, res);
              }
              if (!res.closed) {
                res.end();
              }
            }
          }
        } catch (exc) {
          console.error("call  function error ", exc);
        }
      }
    }
  });

  return {
    reload(message = "") {
      console.log("reload page", message);
      watches
        .filter((res) => res && !res.closed)
        .forEach((res) => {
          res.write("data: reload\n\n");
        });
    },
  };
}
