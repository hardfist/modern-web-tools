---
title: "This in Typescript"
date: "2020-02-01"
---

`this`可以说是`Javascript`里最难理解的特性之一了，`Typescript`里的 this 似乎更加复杂了，`Typescript`里的 this 有三中场景，不同的场景都有不同意思。

- this 参数: 限制调用函数时的 this 类型
- this 类型: 用于支持链式调用，尤其支持 class 继承的链式调用
- ThisType&ltT&gt:用于构造复杂的 factory 函数

## this 参数

由于 javascript 支持灵活的函数调用方式，不同的调用场景，this 的指向也有所不同

- 作为对象的方法调用
- 作为普通函数调用
- 作为构造器调用
- 作为 Function.prototype.call 和 Function.prototype.bind 调用

### 对象方法调用

这也是绝大部分 this 的使用场景，当函数作为对象的
方法调用时，this 指向该对象

```ts
const obj = {
  name: "yj",
  getName() {
    return this.name // 可以自动推导为{ name:string, getName():string}类型
  },
}
obj.getName() // string类型
```

这里有个坑就是如果对象定义时对象方法是使用箭头函数进行定义，则 this 指向的并不是对象而是全局的 window，Typescript 也自动的帮我推导为 window

```ts
const obj2 = {
  name: "yj",
  getName: () => {
    return this.name // check 报错，这里的this指向的是window
  },
}
obj2.getName() // 运行时报错
```

### 普通函数调用

即使是通过非箭头函数定义的函数，当将其赋值给变量，并直接通过变量调用时，其运行时 this 执行的并非对象本身

```ts
const obj = {
  name: "yj",
  getName() {
    return this.name
  },
}
const fn1 = obj.getName
fn1() // this指向的是window，运行时报错
```

很不幸，上述代码在编译期间并未检查出来，我们可以通过为`getName`添加`this`的类型标注解决该问题

```ts
interface Obj {
  name: string
  // 限定getName调用时的this类型
  getName(this: Obj): string
}
const obj: Obj = {
  name: "yj",
  getName() {
    return this.name
  },
}
obj.getName() // check ok
const fn1 = obj.getName
fn1() // check error
```

这样我们就能报保证调用时的 this 的类型安全

### 构造器调用

在 class 出现之前，一直是把 function 当做构造函数使用，当通过 new 调用 function 时，构造器里的 this 就指向返回对象

```ts
function People(name: string) {
  this.name = name // check error
}
People.prototype.getName = function() {
  return this.name
}
const people = new People() // check error
```

很不幸，Typescript 暂时对 ES5 的 constructor function 的类型推断暂时并未支持(https://github.com/microsoft/TypeScript/issues/18171),没办法推导出 this 的类型和 people 可以作为构造函数调用，因此需要显示的进行类型标注

```ts
interface People {
  name: string
  getName(): string
}
interface PeopleConstructor {
  new (name: string): People // 声明可以作为构造函数调用
  prototype: People // 声明prototype，支持后续修改prototype
}
const ctor = (function(this: People, name: string) {
  this.name = name
} as unknown) as PeopleConstructor // 类型不兼容，二次转型

ctor.prototype.getName = function() {
  return this.name
}

const people = new ctor("yj")
console.log("people:", people)
console.log(people.getName())
```

当然最简洁的方式，还是使用 class

```ts
class People {
  name: string
  constructor(name: string) {
    this.name = name // check ok
  }
  getName() {
    return this.name
  }
}

const people = new People("yj") // check ok
```

这里还有一个坑，即在 class 里 public field method 和 method 有这本质的区别
考虑如下三种 method

```ts
class Test {
  name = 1
  method1() {
    return this.name
  }
  method2 = function() {
    return this.name // check error
  }
  method3 = () => {
    return this.name
  }
}

const test = new Test()

console.log(test.method1()) // 1
console.log(test.method2()) // 1
console.log(test.method3()) // 1
```

虽然上述三个代码都能成功的输出 1，但是有这本质的区别

- method1: 原型方法，动态 this，异步回调场景下需要自己手动 bind this
- method2: 实例方法，类型报错, 异步场景下需要手动 bind this
- method3: 实例方法，静态 this,异步场景下不需要手动 bind this

在我们编写 React 应用时，大量的使用了 method3 这种自动绑定 this 的方式，
但实际上这种做法存在较大的问题

- 每个实例都会创建一个实例方法，造成了浪费
- 在处理继承时，会导致违反直觉的现象

```ts
class Parent {
  constructor() {
    this.setup()
  }

  setup = () => {
    console.log("parent")
  }
}

class Child extends Parent {
  constructor() {
    super()
  }

  setup = () => {
    console.log("child")
  }
}

const child = new Child() // parent

class Parent2 {
  constructor() {
    this.setup()
  }

  setup() {
    console.log("parent")
  }
}

class Child2 extends Parent2 {
  constructor() {
    super()
  }
  setup() {
    console.log("child")
  }
}

const child2 = new Child2() // child
```

在处理继承的时候，如果 superclass 调用了示例方法而非原型方法，那么是无法在 subclass 里进行 override 的，这与其他语言处理继承的 override 的行为向左，很容出问题。
因此更加合理的方式应该是不要使用实例方法，但是如何处理 this 的绑定问题呢。
目前较为合理的方式要么手动 bind，或者使用 decorator 来做 bind

```ts
import autobind from "autobind-decorator"
class Test {
  name = 1
  @autobind
  method1() {
    return this.name
  }
}
```

### call 和 apply 调用

call 和 apply 调用没有什么本质区别，主要区别就是 arguments 的传递方式，不分别讨论。和普通的函数调用相比，call 调用可以动态的改变传入的 this，
幸运的是 Typescript 借助 this 参数也支持对 call 调用的类型检查

```ts
interface People {
  name: string
}
const obj1 = {
  name: "yj",
  getName(this: People) {
    return this.name
  },
}
const obj2 = {
  name: "zrj",
}
const obj3 = {
  name2: "zrj",
}
obj1.getName.call(obj2)
obj1.getName.call(obj3) // check error
```

另外 call 的实现也非常有意思，可以简单研究下其实现,我们的实现就叫做 call2
首先需要确定 call 里 第一个参数的类型，很明显 第一个参数 的类型对应的是函数里的 this 参数的类型，我们可以通过 ThisParameterType 工具来获取一个函数的 this 参数类型

```ts
interface People {
  name: string
}
function ctor(this: People) {}

type ThisArg = ThisParameterType<typeof ctor> // 为People类型
```

ThisParameterType 的实现也很简单，借助 infer type 即可

```ts
type ThisParameterType<T> = T extends (this: unknown, ...args: any[]) => any
  T extends (this: infer U, ...args: any[]) => any
  ? U
  : unknown
```

但是我们怎么获取当前函数的类型呢,通过泛型实例化和泛型约束

```ts
interface CallableFunction {
  call2<T>(this: (this: T) => any, thisArg: T): any
}
interface People {
  name: string
}
function ctor(this: People) {}
ctor.call2() //
```

在进行 ctor.call 调用时，根据 CallableFunction 的定义其 this 参数类型为(this:T) => any,而此时的 this 即为 ctor,而根据 ctro 的类型定义，其类型为(this:People) => any，实例化即可得此时的 T 实例化类型为 People,即 thisArg 的类型为 People

进一步的添加返回值和其余参数类型

```ts
interface CallableFunction {
  call<T, A extends any[], R>(
    this: (this: T, ...args: A) => R,
    thisArg: T,
    ...args: A
  ): R
}
```

## This Types

为了支持[fluent interface](https://en.wikipedia.org/wiki/Fluent_interface),需要支持方法的返回类型由调用示例确定，这实际上需要类型系统的额外支持。考虑如下代码

```ts
class A {
  A1() {
    return this
  }
  A2() {
    return this
  }
}
class B extends A {
  B1() {
    return this
  }
  B2() {
    return this
  }
}
const b = new B()
const a = new A()
b.A1().B1() // 不报错
a.A1().B1() // 报错
type M1 = ReturnType<typeof b.A1> // B
type M2 = ReturnType<typeof a.A1> // A
```

仔细观察上述代码发现，在不同的情况下，A1 的返回类型实际上是和调用对象有关的而非固定，只有这样才能支持如下的链式调用，保证每一步调用都是类型安全

```ts
b.A1()
  .B1()
  .A2()
  .B2() // check ok
```

this 的处理还有其特殊之处，大部分语言对 this 的处理，都是将其作为隐式的参数处理，但是对于函数来讲其参数应该是逆变的，但是 this 的处理实际上是当做协变处理的。考虑如下代码

```ts
class Parent {
  name: string
}
class Child extends Parent {
  age: number
}
class A {
  A1() {
    return this.A2(new Parent())
  }
  A2(arg: Parent) {}
  A3(arg: string) {}
}
class B extends A {
  A1() {
    // 不报错，this特殊处理，视为协变
    return this.A2(new Parent())
  }
  A2(arg: Child) {} // flow下报错，typescript没报错
  A3(arg: number) {} // flow和typescript下均报错
}
```

这里还要提的一点是 Typescript 处于兼容考虑，对方法进行了双变处理，但是函数还是采用了逆变，相比之下 flow 则安全了许多，方法也采用了逆变处理

## ThisType

Vue2.x 最令人诟病的一点就是对 Typescript 的羸弱支持，其根源也在于 vue2.x 的 api 大量使用了 this，造成其类型难以推断，Vue2.5 通过 ThisType 对 vue 的 typescript 支持进行了一波增强，但还是有不足之处，Vue3 的一个大的卖点也是改进了增强了对 Typescript 的支持。下面我们就研究下下 ThisType 和 vue 中是如何利用 ThisType 改进 Typescript 的支持的。

先简单说一下 This 的决断规则，推测对象方法的 this 类型规则如下，优先级由低到高

### 对象字面量方法的 this 类型为该对象字面量本身

```ts
// containing object literal type
let foo = {
  x: "hello",
  f(n: number) {
    this //this: {x: string;f(n: number):void }
  },
}
```

### 如果对象字面量进行了类型标注了，则 this 类型为标注的对象类型

```ts
type Point = {
  x: number
  y: number
  moveBy(dx: number, dy: number): void
}

let p: Point = {
  x: 10,
  y: 20,
  moveBy(dx, dy) {
    this // Point
  },
}
```

### 如果对象字面量的方法有 this 类型标注了，则为标注的 this 类型

```ts
let bar = {
  x: "hello",
  f(this: { message: string }) {
    this // { message: string }
  },
}
```

### 如果对象字面量的即进行了类型标注，同时方法也标注了类型，则方法的标注 this 类型优先

```ts
type Point = {
  x: number
  y: number
  moveBy(dx: number, dy: number): void
}

let p: Point = {
  x: 10,
  y: 20,
  moveBy(this: { message: string }, dx, dy) {
    this // {message:string} ,方法类型标注优先级高于对象类型标注
  },
}
```

### 如果对象字面量进行了类型标注，且该类型标注里包含了 ThisType&ltT&gt，那么 this 类型为 T

```ts
type Point = {
  x: number
  y: number
  moveBy: (dx: number, dy: number) => void
} & ThisType<{ message: string }>

let p: Point = {
  x: 10,
  y: 20,
  moveBy(dx, dy) {
    this // {message:string}
  },
}
```

### 如果对象字面量进行了类型标注，且类型标注里指明了 this 类型,则使用该标注类型

```ts
type Point = {
  x: number
  y: number
  moveBy(this: { message: string }, dx: number, dy: number): void
}

let p: Point = {
  x: 10,
  y: 20,
  moveBy(dx, dy) {
    this // { message:string}
  },
}
```

将规则按从高到低排列如下

- 如果方法里显示标注了 this 类型，这是用该标注类型
- 如果上述没标注，但是对象标注的类型里的方法类型标注了 this 类型，则使用该 this 类型
- 如果上述都没标注，但对象标注的类型里包含了 ThisType&ltT&gt,那么 this 类型为 T
- 如果上述都没标注，this 类型为对象的标注类型
- 如果上述都没标注，this 类型为对象字面量类型

这里的一条重要规则就是在没有其他类型标注的情况下，如果对象标注的类型里如果包含了 ThisType&ltT&gt,那么 this 类型为 T,这意味着我们可以通过类型计算为我们的对象字面量添加字面量里没存在的属性，这对于 Vue 极其重要。
我们来看一下 Vue 的 api

```ts
import Vue from 'vue';
export const Component = Vue.extend({
  data(){
    return {
      msg: 'hello'
    }
  }
  methods:{
    greet(){
      return this.msg + 'world';
    }
  }
})
```

这里的一个主要问题是 greet 是 methods 的方法，其 this 默认是 methods 这个对象字面量的类型，因此无法从中区获取 data 的类型，所以主要难题是如何在 methods.greet 里类型安全的访问到 data 里的 msg。
借助于泛型推导和 ThisType 可以很轻松的实现，下面让我们自己实现一些这个 api

```ts
type ObjectDescriptor<D, M> = {
  data: () => D
  methods: M & ThisType<D & M>
}

declare function extend<D, M>(obj: ObjectDescriptor<D, M>): D & M

const x = extend({
  data() {
    return {
      msg: "hello",
    }
  },
  methods: {
    greet() {
      return this.msg + "world" // check
    },
  },
})
```

其推导规则如下
首先根据对象字面量的类型和泛型约束对比,可得到类型参数 T 和 M 的实例化类型结果

```ts
D: { msg: string}
M: {
  greet(): todo
}
```

接着推导 ObjectDescriptor 类型为

```ts
{
  data(): { msg: string},
  methods: {
    greet(): string
  } & ThisType<{msg:string} & {greet(): todo}>
}
```

接着借助推导出来的 ObjectDescriptor 推导出 greet 里的 this 类型为

```
{ msg: string} & { greet(): todo}
```

因此推导出 this.msg 类型为 string，进一步推导出 greet 的类型为 string，至此所有类型推完。
另外为了减小 Typescript 的类型推倒难度，应该尽可能的显示的标注类型，防止出现循环推导或者造成推导复杂度变高等导致编译速度过慢甚至出现死循环或者内存耗尽的问题。

```ts
type ObjectDescriptor<D, M> = {
  data: () => D
  methods: M & ThisType<D & M>
}

declare function extend<D, M>(obj: ObjectDescriptor<D, M>): D & M

const x = extend({
  data() {
    return {
      msg: "hello",
    }
  },
  methods: {
    greet(): string {
      // 显示的标注返回类型，简化推导
      return this.msg + "world" // check
    },
  },
})
```
