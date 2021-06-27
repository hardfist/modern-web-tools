import { JSDOM } from 'jsdom';
const jsdom = new JSDOM(`<div id="root"></div>`);
const document = jsdom.window.document;
// Remove all children from this node.
function empty(node: {
  childNodes: any;
  removeChild: (value: never, index: number, array: never[]) => void;
}) {
  [].slice.call(node.childNodes).forEach(node.removeChild, node);
}

// Very naive version of React's DOM property setting algorithm. Many
// properties need to be updated differently.
function setProperty(node: { setAttribute: (arg0: any, arg1: any) => void }, attr: string, value: any) {
  // The DOM Component layer in this implementation isn't filtering so manually
  // skip children here.
  if (attr === 'children') {
    return;
  }

  node.setAttribute(attr, value);
}

// Remove the property from the node.
function removeProperty(node: { removeAttribute: (arg0: any) => void }, attr: any) {
  node.removeAttribute(attr);
}

function updateStyles(node: { style: { [x: string]: any } }, styles: { [x: string]: any }) {
  Object.keys(styles).forEach((style) => {
    // TODO: Warn about improperly formatted styles (eg, contains hyphen)
    // TODO: Warn about bad vendor prefixed styles
    // TODO: Warn for invalid values (eg, contains semicolon)
    // TODO: Handle shorthand property expansions (eg 'background')
    // TODO: Auto-suffix some values with 'px'
    node.style[style] = styles[style];
  });
}

function appendChild(node: { appendChild: (arg0: any) => void }, child: any) {
  node.appendChild(child);
}

function appendChildren(node: any, children: any[]) {
  if (Array.isArray(children)) {
    children.forEach((child) => appendChild(node, child));
  } else {
    appendChild(node, children);
  }
}

function insertChildAfter(
  node: { insertBefore: (arg0: any, arg1: any) => void; firstChild: any },
  child: any,
  afterChild: { nextSibling: any }
) {
  node.insertBefore(child, afterChild ? afterChild.nextSibling : node.firstChild);
}

function removeChild(node: { removeChild: (arg0: any) => void }, child: any) {
  node.removeChild(child);
}

export {
  setProperty,
  removeProperty,
  updateStyles,
  empty,
  appendChild,
  appendChildren,
  insertChildAfter,
  removeChild,
  document
};
