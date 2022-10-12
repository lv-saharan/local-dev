import { dev } from "../src/index.js"
const { reload } = dev({ root: "./test/" }, {
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

setInterval(() => {
    reload("test....")
}, 1000);