const factory = require('./val');

async function main() {
  const m = await factory();
  const test = new m.Test();
  // test.setCb((s) => {
  //   console.log('hello world');
  // })
  //test.callCb();
  // console.log('result:',result)
  test.setCb(() => {
    console.log('hello world');
  });
  const result = test.callCb();
  console.log('result:', result);
  const id = m.addFunction(() => {}, 'vi');
  console.log('id:', id);
}
main();
