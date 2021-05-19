const factory = require('./val');

async function main() {
  const m = await factory();
  var retVector = m['returnVectorData']();

  // vector size
  var vectorSize = retVector.size();

  // reset vector value
  retVector.set(vectorSize - 1, 11);

  // push value into vector
  retVector.push_back(12);

  // retrieve value from the vector
  for (var i = 0; i < retVector.size(); i++) {
    console.log('Vector Value: ', retVector.get(i));
  }

  const arr = new m.Array10();
  arr.get(1);
  arr.get2(11);
  const cls = new m.MyClass(1, 1);
  const origin = new m.C();
  const pass = m.passThrough(origin);
  console.log('pass:', pass);
  const test = new m.Test();
  const obj = { x: 10086, y: 1234 };
  const callback = m.Callback.implement({
    callback() {
      console.log('hello world');
      return obj;
    }
  });
  test.setCallback(callback);
  const res = test.callCallback();
  const zz = test.clone();
  zz.callCallback();
  test.add();
  test.add();
  console.log('test:', test.getCnt(), zz.getCnt());
  zz.delete();

  console.log('test:', test.getCnt());
  console.log('id:', res);
}
main();
