const factor = require('./exce');
async function main() {
  const m = await factor();
  try {
    console.log('m:', m.add());
  } catch (err) {
    console.log('err:', err);
    const msg = m.getExceptionMessage(err);
    console.log('msg:', msg);
  }
}

main();
