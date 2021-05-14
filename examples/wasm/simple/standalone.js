const fs = require('fs');
const path = require('path');
async function main() {
  const binary = fs.readFileSync(path.join(__dirname, './hello_world.wasm'));
  const wasm = await WebAssembly.compile(binary);
  const instance = await WebAssembly.instantiate(wasm);
  console.log('wasm:', wasm, instance, instance.exports.doubler(2));
}
main();
