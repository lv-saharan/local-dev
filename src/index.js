import http from "http"
import path from "path"
import mime from "mime"
import fs from "fs"
import open from "open"

const defaultApi = {
    host: "localhost",
    port: 8080,
    from: "/api",
    to: "/api"
}
const defaultOptions = {
    server: "localhost",
    root: "./",
    port: 8900,

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
    const { server, root, port, fixPath } = { ...defaultOptions, ...options }
    api = { ...defaultApi, ...api }
    const devServer = http.createServer()
    devServer.listen(port)
    open(`http://${server}:${port}`, "chrome")

    const watches = []
    devServer.on("request", (req, res) => {
        if (req.url.startsWith("/--watch")) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });
            res.write("retry: 10000\n\n")
            watches.push(res)


        } else if (req.url.startsWith(api.from)) {
            const { connection, host, ...originHeaders } = req.headers;
            const options = {
                method: req.method,
                hostname: api.host,
                port: api.port,
                path: api.to + req.url.substring(api.from.length),
                headers: { ...originHeaders }
            }
            console.log("call api", options)

            const p = new Promise((resolve, reject) => {
                const postbody = [];
                req.on("data", chunk => {
                    postbody.push(chunk);
                })
                req.on('end', () => {
                    const postbodyBuffer = Buffer.concat(postbody);
                    resolve(postbodyBuffer)
                })
            });
            p.then((postbodyBuffer) => {
                const responsebody = []
                const request = http.request(options, (response) => {
                    res.writeHead(response.statusCode, response.headers)
                    response.on('data', (chunk) => {
                        responsebody.push(chunk)
                    })
                    response.on("end", () => {
                        const responsebodyBuffer = Buffer.concat(responsebody)
                        res.end(responsebodyBuffer);
                    })

                })
                request.write(postbodyBuffer)
                request.end();
            })
        } else {
            if (req.method == "GET") {
                console.log("get url", req.url)
                const [reqPath] = req.url.split('?')
                const { fileName, extName } = fixPath(req)
                const filePath = path.resolve(root, `./${decodeURIComponent(reqPath)}${fileName}${extName}`)
                if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
                    try {
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

