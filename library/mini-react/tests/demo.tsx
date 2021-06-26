import { test } from 'uvu';
import React from 'react';
import util from 'util';
import { JSDOM } from 'jsdom';
import * as assert from 'uvu/assert';
import { mount, App, render } from '../src';
test('mount', () => {
  const dom = new JSDOM(`<body><div id="root">root</div></body>`);
  const root = dom.window.document.getElementById('root')!;
  console.log('root:', root, root?.innerHTML);
  const result = mount(<App />);
  const rootNode = render(result);
  console.log('rootNode:', rootNode);
  root.appendChild(rootNode);
  console.log('html:', root.outerHTML);
  //console.log('result:', util.inspect(result, {colors:true, depth:null}))
});

test.run();
