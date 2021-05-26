function CustomError(message, stripPoint) {
  this.message = message;
  this.name = CustomError.name;
  Error.captureStackTrace(this, stripPoint);
}
function leak_secure() {
  throw new CustomError('secure泄漏了');
}
function hidden_secure() {
  throw new CustomError('secure没泄露', outer_api);
}
function outer_api() {
  try {
    leak_secure();
  } catch (err) {
    console.error('stk:', err.stack);
  }
  try {
    hidden_secure();
  } catch (err) {
    console.error('stk2:', err.stack);
  }
}

outer_api();
