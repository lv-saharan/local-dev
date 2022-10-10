import { dev } from "../src/index.js"
const { reload } = dev({root:"./test/"})

setInterval(() => {
    reload("test....")
}, 10000);