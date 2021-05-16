const { parse } = require('@vue/compiler-sfc');
const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const rollupPluginVue = require('rollup-plugin-vue');

async function main() {
  const content = fs.readFileSync(path.join(__dirname, './fixtures/App.vue'), 'utf-8');
  const sfcRecord = parse(content, { filename: 'App.vue' });
  const map = sfcRecord.descriptor['styles'][0].map;
  console.log('map:', map);
}
async function bundle() {
  const bundle = await rollup.rollup({
    input: [path.join(__dirname, './fixtures/App.vue')],
    plugins: [rollupPluginVue({ needMap: true })],
    external: ['vue'],
    output: {
      sourcemap: 'inline'
    }
  });
  const result = await bundle.write({
    output: {
      file: 'bundle.js',
      sourcemap: true
    }
  });
  for (const chunk of result.output) {
    console.log('chunk:', chunk.map);
    const minifyResult = await require('terser').minify(chunk.code, {
      sourceMap: true
    });
    console.log('minifyMap:', minifyResult.map);
    console.log('minifyCode:', minifyResult.code);
  }
}
main();
bundle();
