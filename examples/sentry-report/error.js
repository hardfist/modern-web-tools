Error.prepareStackTrace = (error, structedStackTrace) => {
  for (const frame of structedStackTrace) {
    console.log('frame:', frame.getFunctionName(), frame.getLineNumber(), frame.getColumnNumber());
  }
};
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
