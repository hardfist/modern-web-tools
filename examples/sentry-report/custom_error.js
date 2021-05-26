function CustomError(message) {
  this.message = message;
  this.name = CustomError.name;
  Error.captureStackTrace(this);
}
try {
  throw new CustomError('msg');
} catch (e) {
  console.error(e.name); //CustomError
  console.error(e.message); //bazMessage
  console.error(e.stack);
}
