import React from 'react';
import { Component } from './index';
class Tab extends Component {
  render() {
    return <div>{this.props.text}</div>;
  }
}

export class Button extends Component {
  render() {
    return (
      <div>
        <div>text: {this.props.text}</div>
      </div>
    );
  }
}
export class App extends Component {
  render() {
    return (
      <div>
        hello world
        <Button text="hello"></Button>
      </div>
    );
  }
}
