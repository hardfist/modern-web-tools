import { isValidElement, ReactNode } from 'react';
import assert from 'assert';
import * as DOM from './dom';
import { document } from './dom';
export class Component {
  _currentElement: ReactNode | null;
  _renderedComponent: Component | null;
  constructor() {
    this._currentElement = null;
    this._renderedComponent = null;
  }
  _construct(_currentElement: ReactNode) {
    this._currentElement = _currentElement;
  }
  mountComponent() {
    let renderedElement = this.render();
    let renderedComponent = instantiate(renderedElement);
    this._renderedComponent = renderedComponent;
    let markup = mountComponent(renderedComponent);
    return markup;
  }
  render(): ReactNode {
    throw new Error('not implemented render');
  }
}
Component.prototype.isReactComponent = true;
class DOMComponent {
  _currentElement!: ReactNode;
  _domNode: HTMLElement | null;
  constructor(vnode: React.ReactNode) {
    this._currentElement = vnode;
    this._domNode = null;
  }
  mountComponent() {
    let el = document.createElement(this._currentElement?.type);
    this._domNode = el;

    this._updateDOMProperties({}, this._currentElement.props);
    this._createInitialDOMChildren(this._currentElement.props);
    return el;
  }
  _updateDOMProperties(prevProps, nextProps) {
    let styleUpdates = {};

    // Loop over previous props so we know what we need to remove
    Object.keys(prevProps).forEach((prop) => {
      // We're updating or adding a value, which we'll catch in the next loop so
      // we can skip here. That means the only props remaining will be removals.
      if (nextProps.hasOwnProperty(prop) || prevProps[prop] == null) {
        return;
      }

      // Unset all previous styles since we know there are no new ones.
      if (prop === 'style') {
        Object.keys(prevProps[prop]).forEach((style) => {
          styleUpdates[style] = '';
        });
      } else {
        // Handle propery removals. In React we currently have a white list of known
        // properties, which allows us to special case some things like "checked".
        // We'll just remove blindly.
        DOM.removeProperty(this._domNode, prop);
      }
    });

    // Handle updates / additions
    Object.keys(nextProps).forEach((prop) => {
      let prevValue = prevProps[prop];
      let nextValue = nextProps[prop];

      // Don't do anything if we have identical values.
      if (Object.is(prevValue, nextValue)) {
        return;
      }

      if (prop === 'style') {
        // Update carefully. We need to remove old styles and add new ones
        if (prevValue) {
          Object.keys(prevValue).forEach((style) => {
            if (!nextValue || !nextValue.hasOwnProperty(style)) {
              styleUpdates[style] = '';
            }
          });
          Object.keys(nextValue).forEach((style) => {
            if (prevValue[style] !== nextValue[style]) {
              styleUpdates[style] = nextValue[style];
            }
          });
        } else {
          // If there was no previous style, we can just treat the new style as the update.
          styleUpdates = nextValue;
        }
      } else {
        // DOM updates
        DOM.setProperty(this._domNode, prop, nextValue);
      }

      DOM.updateStyles(this._domNode, styleUpdates);
    });
  }
  _createInitialDOMChildren(props) {
    // Text content
    if (typeof props.children === 'string' || typeof props.children === 'number') {
      // TODO: validate element type can have text children
      // TODO: wrap with helper, there are browser inconsistencies
      this._domNode.textContent = props.children;
    }
  }
  static create(vnode: React.ReactNode) {
    return new DOMComponent(vnode);
  }
  static createText(vnode: React.ReactNode) {
    return new DOMComponent({
      type: 'span',
      props: {
        children: vnode
      }
    });
  }
}

function mountComponent(component: Component): HTMLElement {
  return component.mountComponent();
}
export function render(vnode: React.ReactNode, root: HTMLElement) {
  assert(isValidElement(vnode));
  return mount(vnode, root);
}
export function instantiate(vnode: React.ReactNode) {
  assert(isValidElement(vnode));
  const type = vnode.type;
  console.log('type:', type);
  let instance = null;
  if (typeof vnode === 'string') {
    instance = DOMComponent.createText(vnode);
  } else if (typeof type === 'string') {
    instance = DOMComponent.create(vnode);
  } else if (typeof type === 'function' && type.prototype?.isReactComponent) {
    instance = new vnode.type(vnode.props);
    instance._construct(vnode);
  } else if (typeof type === 'function') {
    console.log('type:', type, type.prototype, type.prototype.isComponent);
    throw new Error('not implemented yet');
  }
  return instance;
}

export function mount(vnode: React.ReactNode, node: HTMLElement) {
  let component = instantiate(vnode);
  let renderNode = mountComponent(component);
  console.log('renderNode:', renderNode.innerHTML);
  return renderNode;
}
