const factor = require('./main');

async function main() {
  const Module = await factor();
  console.log(Module.lerp(1, 2, 3));

  var instance = new Module.MyClass(10, 'hello');
  instance.incrementX();
  instance.x; // 11
  instance.x = 20; // 20
  Module.MyClass.getStringFromInstance(instance); // "hello"
  instance.delete();
  var person = Module.findPersonAtLocation([10.2, 156.5]);
  console.log('Found someone! Their name is ' + person.name + ' and they are ' + person.age + ' years old');

  var DerivedClass = Module.Interface.extend('Interface', {
    // __construct and __destruct are optional.  They are included
    // in this example for illustration purposes.
    // If you override __construct or __destruct, don't forget to
    // call the parent implementation!
    __construct: function () {
      this.__parent.__construct.call(this);
    },
    __destruct: function () {
      this.__parent.__destruct.call(this);
    },
    invoke: function () {
      // your code goes here
    }
  });

  var inst = new DerivedClass();
  console.log('inst:', inst);
}
main();
