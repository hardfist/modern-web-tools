import esbuild from 'esbuild';
import path, { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SourceMapConsumer } from 'source-map';
import vlq from 'vlq';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('url:', __dirname, import.meta.url);
async function main() {
  const input = path.join(__dirname, '../fixtures/input.js');
  const output = path.join(__dirname, 'bundle.js');
  const result = await esbuild.build({
    entryPoints: [input],
    bundle: true,
    sourcemap: 'external',
    outfile: 'bundle.js',
    write: false
  });
  let map, code;

  for (const x of result.outputFiles) {
    if (x.path.endsWith('.map')) {
      map = x.text;
    } else {
      code = x.text;
    }
  }
  fs.writeFileSync(resolve(__dirname, 'bundle.js'), code);
  fs.writeFileSync(resolve(__dirname, 'bundle.js.map'), map);

  decode(JSON.parse(map));
}
/**
 *
 * @param map {import('source-map').RawSourceMap}
 */
function decode(map) {
  const lines = map.mappings.split(';');
  let decoded = lines.map((line) => {
    const segs = line.split(',');
    return segs.map((seg) => {
      return vlq.decode(seg);
    });
  });
  var sourceFileIndex = 0, // second field
    sourceCodeLine = 0, // third field
    sourceCodeColumn = 0, // fourth field
    nameIndex = 0; // fifth field
  decoded = decoded.map(function (line) {
    var generatedCodeColumn = 0; // first field - reset each time

    return line.map(function (segment) {
      if (segment.length === 0) {
        return [];
      }
      generatedCodeColumn += segment[0] || 0;
      sourceFileIndex += segment[1] || 0;
      sourceCodeLine += segment[2] || 0;
      sourceCodeColumn += segment[3] || 0;
      let result = [generatedCodeColumn, sourceFileIndex, sourceCodeLine, sourceCodeColumn];

      if (segment.length === 5) {
        nameIndex += segment([4] || 0);
        result.push(nameIndex);
      }

      return result;
    });
  });
  console.log('decoded:', decoded);
}
function addline(line1, line2) {
  const res = [];
  const len = Math.max(line1.length, line2.length);
  for (let i = 0; i < len; i++) {
    const tmp = (line1[i] || 0) + (line2[i] || 0);
    res.push(tmp);
  }
  return res;
}
main();
