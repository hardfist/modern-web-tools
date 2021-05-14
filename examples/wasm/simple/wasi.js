const fs = require('fs');
const { WASI } = require('wasi');
const path = require('path');
const wasi = new WASI({
  args: process.argv,
  env: process.env
});
const importObject = { wasi_snapshot_preview1: wasi.wasiImport };

(async () => {
  const wasm = await WebAssembly.compile(fs.readFileSync(path.join(__dirname, './hello.wasm')));
  const instance = await WebAssembly.instantiate(wasm, importObject);

  wasi.start(instance);
})();
