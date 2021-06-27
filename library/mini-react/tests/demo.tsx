import { test } from 'uvu';
import React from 'react';
import util from 'util';
import { JSDOM } from 'jsdom';
import * as assert from 'uvu/assert';
import { mount } from '../src/index';
import { App } from '../src/case';
test('mount', () => {
  const dom = new JSDOM(`<body><div id="root">root</div></body>`);
  const root = dom.window.document.getElementById('root')!;
  const result = mount(<App />, root);
});

test.run();
