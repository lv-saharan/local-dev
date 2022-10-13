# local-dev-server

a local dev server with simple api proxy.

a esbuild dev server implements.

local-dev-server use EventSource to notify client to reload.

https://developer.mozilla.org/en-US/docs/Web/API/EventSource

# install

```bash
npm i local-dev-server -D
```

# usage

```javascript
import { dev } from "local-dev-server";
//dev function return a reload callback ,
//you can use reload function to reload current dev pages
const { reload } = dev({
  port: 9000,
});

//watch on change
setInterval(() => {
  reload("test....");
}, 10000);
```

# default options

```javascript
const options = {
  server: "localhost",
  root: "./",
  port: 8900,
  response: (filePath, res) => {
    //if use esbuild ,and write:false
    //find the contents of esbuild

    const outfile = buildResult?.outputFiles.find(
      (file) => file.path == filePath
    );
    if (outfile) {
      res.setHeader("Content-Type", "application/javascript;charset=utf-8");
      res.end(outfile.contents);
      return true;
    }
    return false;
  },
  //use fixPath to handle req path
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

const apiOptions = {
  host: "localhost",
  port: 8080,
  from: "/api",
  to: "/api",
  //use dispatch can handle multi server apis
  dispatch(url) {
    if (url.startsWith("/abc")) {
      return {
        from: "/abc",
        to: "/def",
      };
    }else if(url.startsWith("/aaa")){
        return {
            from: "/abc",
            to: "/def",
            host: "local",
            port: 9999
      };
    }
    return false;
  },
};

dev(options, apiOptions);
```

# working with esbuild

```javascript
import { dev } from "local-dev-server";
const { reload } = dev({
  port: 9000,
});
//some code
//.....
esbuild.build({
    ...options,
    entryPoints: [infile],
    outfile,
    write:false
    watch:

    {
        onRebuild(error, result) {
            if (error) console.error('watch build failed:', error)
            else {
                console.log('watch build succeeded:', result)
                //when esbuild rebuild,call reload function
                reload("esbuild rebuild ok,reload now!")
            }
        },
    }
}).then(result => {
    console.log(`build  ${module} ok!`)
})
```
# open browser support

```javascript
//openBrowser :defualt,chrome,firefox,edge
//openBrowser set true,will open chrome
const { reload } = dev({ root: "./test/",openBrowser:"edge" })
```