const sourcemap = require('source-map');
const generator = new sourcemap.SourceMapGenerator({
  file: 'bundle.js'
});
generator.addMapping({
  source: 'module-one',
  original: {
    line: 128,
    column: 0
  },
  generated: {
    line: 3,
    column: 456
  }
});
console.log(generator.toJSON());
