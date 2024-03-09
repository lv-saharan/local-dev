import http from "http";
import path from "path";
import mime from "mime";
import fs from "fs";
import open from "open";

const defaultProxy = {
  host: "localhost",
  dispatch(url) {
    //dispatch can return a host ，port，path！！！
    return false;
  },
  port: 8080,
  from: "/api",
  to: "/api",
};
const defaultOptions = {
  server: "localhost",
  openBrowser: true,
  root: "./",
  home: "/",
  port: 8900,
  response: (filePath, res) => {
    return false;
  },

  notFoundHandler(req, res) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.write("404 ,Not Found!");
  },
  serverErrorHandler(req, res) {},
  fixPath: (req) => {
    const [reqPath] = req.url.split("?");
    const accept = req.headers.accept ?? "";
    let fileName = "";
    let extName = "";
    if (!path.extname(reqPath)) {
      if (reqPath.endsWith("/")) {
        fileName = "index";
      }
      if (accept.includes("text/html")) {
        extName = ".html";
      } else if (accept == "*/*") {
        extName = ".js";
      }
    }
    return { fileName, extName };
  },
};
const watchingScript = `
if (typeof EventSource != undefined) {
    const sse = new EventSource("/--watch")
    sse.addEventListener("message", evt => {
       if(evt.data=="reload") window.location.reload()
    })
}
`;
const sseInjection = `<script src="/--watching"></script>`;

export function dev(options = {}, proxy = {}) {
  const {
    server,
    root,
    home,
    port,
    openBrowser,
    notFoundHandler,
    serverErrorHandler,
    fixPath,
    response,
  } = {
    ...defaultOptions,
    ...options,
  };
  if (proxy instanceof Array === false) {
    proxy = { ...defaultProxy, ...proxy };
  }
  const devServer = http.createServer();
  devServer.listen(port);
  const serverURL = `http://${server}:${port}${home}`;
  console.info("local-dev-server start:", serverURL);
  if (openBrowser) {
    let app = "chrome";
    if (openBrowser !== true) {
      app = openBrowser;
    }
    open(serverURL, {
      app: {
        name: open.apps[app],
      },
    });
  }

  const watches = [];
  devServer.on("request", (req, res) => {
    if (req.url == "/--watching") {
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(watchingScript);
      return;
    }
    if (req.url == "/--watch") {
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

    let dispatch = defaultProxy;
    if (proxy instanceof Array) {
      const rule = proxy.find(({ from }) => req.url.startsWith(from));
      if (rule) dispatch = rule;
    } else {
      dispatch = proxy.dispatch(req.url);
      if (dispatch === false) {
        dispatch = proxy;
      } else {
        dispatch = { ...proxy, ...dispatch };
      }
    }

    if (req.url.startsWith(dispatch.from)) {
      const { connection, host, ...originHeaders } = req.headers;
      const dispatchHeaders =
        typeof dispatch.headers == "function"
          ? dispatch.headers(req)
          : dispatch.headers ?? {};
      const options = {
        method: req.method,
        hostname: dispatch.host,
        port: dispatch.port,
        path: dispatch.to + req.url.substring(dispatch.from.length),
        headers: { ...originHeaders, ...dispatchHeaders },
      };
      console.log("call proxy:", options);

      // Forward each  incoming proxy  request to proxy server
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      // Forward the body of the request
      req.pipe(proxyReq, { end: true }).on("error", (err) => {
        console.error("pipe proxy request error", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("500 ~");
      });
    } else {
      if (req.method == "GET") {
        console.log("get url:", req.url);
        const [reqPath] = req.url.split("?");
        const { fileName, extName } = fixPath(req);
        const filePath = path.resolve(
          root,
          `./${decodeURIComponent(reqPath)}${fileName}${extName}`
        );
        try {
          if (!response(filePath, res)) {
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
