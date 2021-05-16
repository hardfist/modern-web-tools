const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const { resolve } = require('path');
const { codeFrameColumns } = require('@babel/code-frame');
const sourceMap = require('source-map');
const distDir = resolve(__dirname, './dist');

const content = fs.readFileSync(resolve(__dirname, './fixtures/add.ts'), 'utf-8');
const result = ts.transpileModule(content, {
  fileName: 'add.ts',
  compilerOptions: { sourceMap: true, inlineSources: true }
});
fs.writeFileSync(resolve(distDir, './add.js'), result.outputText);
fs.writeFileSync(resolve(distDir, './add.js.map'), result.sourceMapText);

const rawMap = JSON.parse(result.sourceMapText);

class SourceMap {
  constructor(rawMap) {
    this.decode(rawMap);
    this.rawMap = rawMap;
  }
  /**
   *
   * @param {number} line
   * @param {number} column
   */
  originalPositionFor(line, column) {
    const lineInfo = this.decoded[line];
    if (!lineInfo) {
      throw new Error(`不存在该行信息:${line}`);
    }
    const columnInfo = lineInfo[column];
    for (const seg of lineInfo) {
      // 列号匹配
      if (seg[0] === column) {
        const [column, sourceIdx, origLine, origColumn] = seg;
        const source = this.rawMap.sources[sourceIdx];
        const sourceContent = this.rawMap.sourcesContent[sourceIdx];
        const result = codeFrameColumns(
          sourceContent,
          {
            start: {
              line: origLine + 1,
              column: origColumn + 1
            }
          },
          { forceColor: true }
        );
        return {
          source,
          line: origLine,
          column: origColumn,
          frame: result
        };
      }
    }
    throw new Error(`不存在该行列号信息:${line},${column}`);
  }
  decode(rawMap) {
    const { mappings } = rawMap;
    const { decode } = require('vlq');
    /**
     * @type {string[]}
     */
    const lines = mappings.split(';');
    const decodeLines = lines.map((line) => {
      const segments = line.split(',');
      const decodedSeg = segments.map((x) => {
        return decode(x);
      });
      return decodedSeg;
    });
    const absSegment = [0, 0, 0, 0, 0];
    const decoded = decodeLines.map((line) => {
      absSegment[0] = 0; // 每行的第一个segment的位置要重置
      if (line.length == 0) {
        return [];
      }
      const absoluteSegment = line.map((segment) => {
        const result = [];
        for (let i = 0; i < segment.length; i++) {
          absSegment[i] += segment[i];
          result.push(absSegment[i]);
        }
        return result;
      });
      return absoluteSegment;
    });
    this.decoded = decoded;
  }
}

const consumer = new SourceMap(rawMap);

console.log(consumer.originalPositionFor(0, 21).frame);

async function main() {
  const consumer = await new sourceMap.SourceMapConsumer(rawMap);
  consumer.eachMapping((x) => {
    console.log(x);
  });
}
main();
