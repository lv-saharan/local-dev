# local-dev

a local dev server with simple api proxy

# install

```bash
npm i local-dev -D
```

# usage

```javascript
import { dev } from "local-dev-server";
const { reload } = dev({
  port: 9000,
});

//watch on change
setInterval(() => {
  reload("test....");
}, 10000);
```
# options
```javascript
const options={
    server: "localhost",
    root: "./",
    port: 8900,

    //use fixPath to handle req path
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

const apiOptions={
    host: "localhost",
    port: 8080,
    from: "/api",
    to: "/api"
}


dev(options,apiOptions)

```
