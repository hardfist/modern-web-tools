import { openBlock, createBlock, toDisplayString } from 'vue';

console.log('hello world');
var script = {
  props: ['name']
};

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createBlock('div', null, 'Hello ' + toDisplayString($props.name) + '!', 1 /* TEXT */);
}

script.render = render;
script.__file = 'fixtures/HelloWorld.vue';

export default script;
//# sourceMappingURL=bundle.js.map
