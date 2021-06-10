import babel from '@babel/core';
import fs from 'fs';
const result = babel.transform('a === b;', {
  sourceMaps: true,
  filename: 'transform.js',
  plugins: [
    {
      name: 'my-plugin',
      pre: () => {
        console.log('xx');
      },
      visitor: {
        BinaryExpression(path, t) {
          let tmp = path.node.left;
          path.node.left = path.node.right;
          path.node.right = tmp;
        }
      }
    }
  ]
});
console.log(result.code, result.map);
