function inner() {
  myUndefinedFunction();
}
function outer() {
  inner();
}
function main() {
  try {
    outer();
  } catch (err) {
    console.log(err.stack);
  }
}

async function foo() {
  bar();
}
async function bar() {
  main();
}

foo();
