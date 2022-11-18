import { dev } from "../src/index.js"
const { reload } = dev({ root: "./test/",openBrowser:"edge" }, {
    dispatch: (url) => {
        console.log(url)

        if (url.startsWith("/abc")) {
            return {
                from: "/abc",
                to: "/def"
            }
        }
    }
})

 dev({port:8999},[{
    host:'local',
    port:9090,
    from:"/abcc",
    to:"/ccab"
 },{
    host:'local2',
    port:9090,
    from:"/cccc",
    to:"/dddd"
 }])