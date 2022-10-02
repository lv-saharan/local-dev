import { dev } from "../src/index.js"
const { reload } = dev()

setInterval(() => {
    reload("test....")
}, 10000);