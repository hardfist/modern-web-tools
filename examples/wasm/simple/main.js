const fs = require('fs');
const path = require('path');

const binary = fs.readFileSync(path.join(__dirname, './side_module.wasm'));
async function test() {
  const wasm = await WebAssembly.compile(binary);
  const instance = await WebAssembly.instantiate(wasm, {
    env: {
      __memory_base: 1024,
      __table_base: 2048,
      memory: new WebAssembly.Memory({
        initial: 1024
      })
    }
  });
  console.log('instance:', instance.exports.Increment(22));
}
test();
