const fs = require('fs');
const path = require('path');

async function main() {
  const binary = fs.readFileSync(path.join(__dirname, './main.wasm'));
  const wasm = await WebAssembly.compile(binary);
  const instance = await WebAssembly.instantiate(wasm, {
    env: {
      memory: new WebAssembly.Memory({
        initial: 256
      }),
      print(x) {
        console.log('xxx:', x);
      }
    }
  });
  instance.exports.add(123);
}
main();
