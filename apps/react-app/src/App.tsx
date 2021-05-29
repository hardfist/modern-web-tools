import React, { useState } from 'react';
import { atom, selector, useRecoilState, useRecoilValue, useRecoilValueLoadable } from 'recoil';
import './App.css';
const fontSizeState = atom({
  key: 'fontSizeState',
  default: 14
});
const fontSizeLabelState = selector({
  key: 'fontSizeLabelState',
  get: ({ get }) => {
    const fontSize = get(fontSizeState);
    const unit = 'px';
    return `${fontSize}${unit}`;
  }
});
const todoListState = atom({
  key: 'todoListState',
  default: []
});
function App() {
  const [fontSize, setFontSize] = useRecoilState(fontSizeState);
  const fontSizeLabel = useRecoilValue(fontSizeLabelState);

  return (
    <div>
      <div>count:{fontSize}</div>
      <button
        onClick={() => {
          setFontSize((x) => x + 1);
        }}
      >
        add
      </button>
      <div>current fontSize: {fontSizeLabel}</div>
    </div>
  );
}

export default App;
