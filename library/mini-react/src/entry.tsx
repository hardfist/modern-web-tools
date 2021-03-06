import type { ReactElement } from 'react';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createElement } from 'react';
const dom = new JSDOM(`<body><div id="root">root</div></body>`);
const document = dom.window.document;
export function mount2(vnode: ReactElement) {
  vnode.type;
  if (typeof vnode === 'string') {
    return vnode;
  } else if (vnode.type?.prototype?.isReactComponent) {
    const instance = new vnode.type(vnode.props);
    instance.props = vnode.props;
    vnode = instance.render();
  } else if (typeof vnode.type === 'function') {
    vnode = vnode.type(vnode.props);
  }
  console.log('cild:', vnode.props.children);
  let children = vnode.props.children ?? [];
  if (!Array.isArray(children)) {
    children = [children];
  }
  const newChildren = children.map((x) => mount(x));
  return React.cloneElement(vnode, {
    children: newChildren
  });
}
export function render2(app: ReactElement) {
  if (typeof app === 'string') {
    return document.createTextNode(app);
  }
  const parent = document.createElement(app.type);
  for (const [prop, value] of Object.entries(app.props)) {
    if (prop !== 'children') {
      parent.setAttribute(prop, value);
    }
  }
  const children = app.props.children ?? [];
  for (const child of children) {
    parent.appendChild(render(child));
  }
  return parent;
}
