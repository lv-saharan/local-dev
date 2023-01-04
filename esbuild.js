import esbuild from 'esbuild'

const options = {
    format: "esm",
    platform: "node",
    bundle: true,
    sourcemap: true,
    minify: true,
    charset: 'utf8',
    entryPoints: ['./src/index.js'],
    outdir: "./dist"
}

esbuild.build(options).then(result => {
    console.log(`build  ok!`)
})