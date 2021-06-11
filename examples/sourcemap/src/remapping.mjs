import ts from 'typescript';
import { minify } from 'terser';
import babel from '@babel/core';

import fs from 'fs';
import remapping from '@ampproject/remapping';
const code = `
const add = (a,b) => {
  return a+b;
}
`;

const transformed = babel.transformSync(code, {
  filename: 'origin.js',
  sourceMaps: true,
  plugins: ['@babel/plugin-transform-arrow-functions']
});
console.log('transformed code:', transformed.code);
console.log('transformed map:', transformed.map);

const minified = await minify(
  {
    'transformed.js': transformed.code
  },
  {
    sourceMap: {
      includeSources: true
    }
  }
);
console.log('minified code:', minified.code);
console.log('minified map', minified.map);

const mergeMapping = remapping(minified.map, (file) => {
  if (file === 'transformed.js') {
    return transformed.map;
  } else {
    return null;
  }
});

fs.writeFileSync('remapping.js', minified.code);
fs.writeFileSync('remapping.js.map', minified.map);
//fs.writeFileSync('remapping.js.map', JSON.stringify(mergeMapping));
