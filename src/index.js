import http from "http"
import path from "path"
import mime from "mime"
import fs from "fs"
import open from "open"

const defaultApi = {
    host: "localhost",
    dispatch(url) {
        //dispatch can return a host ，port，path！！！
        return false
    },
    port: 8080,
    from: "/api",
    to: "/api"
}
const defaultOptions = {
    server: "localhost",
    openBrowser: true,
    root: "./",
    port: 8900,
    response: (filePath, res) => {
        return false
    },

    fixPath: (req) => {
        const [reqPath] = req.url.split('?')
        const accept = req.headers.accept ?? ""
        let fileName = ""
        let extName = ""
        if (!path.extname(reqPath)) {
            if (reqPath.endsWith('/')) {
                fileName = "index"
            }
            if (accept.includes("text/html")) {
                extName = ".html"
            } else if (accept == "*/*") {
                extName = ".js"
            }
        }
        return { fileName, extName }
    }
}
const sseInjection = `<script>
if (typeof EventSource != undefined) {
    const sse = new EventSource("/--watch")
    sse.addEventListener("message", evt => {
       if(evt.data=="reload") window.location.reload()
    })
}
</script>`

export function dev(options = {}, api = {}) {
    const { server, root, port, openBrowser, fixPath, response } = { ...defaultOptions, ...options }
    api = { ...defaultApi, ...api }
    const devServer = http.createServer()
    devServer.listen(port)
    const serverURL = `http://${server}:${port}`
    console.info("local-dev-server:", serverURL)
    if (openBrowser) {
        let app = "chrome"
        if (openBrowser !== true) {
            app = openBrowser
        }
        open(serverURL, {
            app: {
                name: open.apps[app]
            }
        })
    }

    const watches = []
    devServer.on("request", (req, res) => {
        if (req.url.startsWith("/--watch")) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });
            res.write("retry: 5000\n\n")
            watches.push(res)
            return
        }

        let dispatch = api.dispatch(req.url)
        if (dispatch === false) {
            dispatch = api
        }
        else {
            dispatch = { ...api, ...dispatch }
        }

        if (req.url.startsWith(dispatch.from)) {
            const { connection, host, ...originHeaders } = req.headers;
            const options = {
                method: req.method,
                hostname: dispatch.host,
                port: dispatch.port,
                path: dispatch.to + req.url.substring(dispatch.from.length),
                headers: { ...originHeaders }
            }
            console.log("call api", options)

            // Forward each  incoming api  request to api server
            const proxyReq = http.request(options, proxyRes => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            });
            // Forward the body of the request 
            req.pipe(proxyReq, { end: true });
        } else {
            if (req.method == "GET") {
                console.log("get url", req.url)
                const [reqPath] = req.url.split('?')
                const { fileName, extName } = fixPath(req)
                const filePath = path.resolve(root, `./${decodeURIComponent(reqPath)}${fileName}${extName}`)
                try {
                    if (!response(filePath, res)) {
                        if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
                            try {
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.setHeader('Content-Type', mime.getType(filePath) + ';charset=utf-8');
                                if (path.extname(filePath) == ".html") {
                                    let contents = fs.readFileSync(filePath, "utf8");
                                    res.end(contents.replace(/(<\/body>)/i, `${sseInjection}$1`));
                                } else {
                                    fs.createReadStream(filePath).pipe(res)
                                }
                            } catch (exc) {
                                res.writeHead(500, { 'Content-Type': 'text/plain' })
                                res.end('500 ~')
                                console.error(exc)
                            }

                        } else {
                            res.writeHead(404, { 'Content-Type': 'text/plain' })
                            res.end('404 ~')
                        }
                    }

                }
                catch (exc) {
                    console.error("call  function error ", exc)
                }

            }
        }

    })

    return {
        reload(message = "") {
            console.log("reload page", message)
            watches.filter(res => res && !res.closed).forEach(res => {
                res.write("data: reload\n\n")
            })
        }
    }

}

