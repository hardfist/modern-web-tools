---
title: "深入typescript类型系统: 重载与子类型"
date: "2020-01-11"
description: "Typescript"
---

在编程语言和类型论中，polymorphism 指为不同的数据类型的实体提供统一的接口。
最常见的 polymorphism 包括

- ad hoc: 为一组独立的类型定义一个公共的接口，函数重载是常见的一种 ad hoc polymorphism
- subtyping: 如果 S 是 T 的 subtype，那么任何使用 T 类型对象的环境中，都可以安全的使用 S 类型的对象
- parametric polymorphism: 即我们一般所说的泛型，声明与定义函数、复合类型、变量时不指定其具体的类型，而把这部分类型作为参数使用，使得该定义对各种具体的类型都适用。

## ad hoc polymorphism （重载）

js 因为是动态类型，本身不需要支持重载，直接对参数进行类型判断即可，但是 ts 为了保证类型安全，支持了函数签名的类型重载，即多个 overload signatures 和一个 implementation signatures

```ts
function add(x:string,y:string):string;
function add(x:number, y:number):number;


function add(x:string|number, y: number|string): number | string{
  if(typeof x === 'string'){
    return x + ',' + y;
  }else {
    return x.toFixed() + (y as number).toFixed();
   // 很不幸，ts暂时不支持对函数重载后续参数的narrowing操作，如这里对x做了type narrowing但是对y没有做narrowing，需要手动的y做type assert操作
   见https://github.com/Microsoft/TypeScript/issues/22609
  }
}
let x = add(1,2) // string
let y = add(2,3) // number
```

> 实现重载有几个注意点

- 因为 implementation signatures 对外是不可见的，当我们实现重载时，通常需要定义两个以上的 overload signatures

```ts
function add(x: string, y: string): string
function add(x: number, y: number): number
function add(
  x: string | number | Function,
  y: number | string
): number | string {
  if (typeof x === "string") {
    return x + "," + y
  } else {
    return 1
  }
}
let x = add(1, 2)
let z = add(() => {}, 1) // 报错，implementation的signature不可见，即使implementation的signaure定义了function但是overload没定义，所以type check error
```

- implementation signature 和 overload signature 必须兼容，否则会 type check error
  如下 [implementation 和 overload 不兼容](http://www.typescriptlang.org/play/#code/GYVwdgxgLglg9mABAQwCaoBQA8BcBnKAJxjAHMAaAT3yJNIEobiyBuAKFElgRXWxzAgAtgCMApoXKJqg0RMazxhdm1Udw0eEjSZcBZhWk5EiiQB99dRieFLEZxJbIBvNokQxgGKJQAOYuGBELEQAXnDEAHInUkj6V3d3QjEoEEIkEIBqKPJIxGzKdncAXzEAGzwxRASklLSkAEYixGK2VrKU4LDeTAbyACZ6IA)

```ts
function add(x: string, y: string): string
function add(x: number, y: number): number // 报错，implementation没有实现该overload signatue

function add(x: string, y: number | string): number | string {
  if (typeof x === "string") {
    return x + "," + y
  } else {
    return 1
  }
}
let x = add(1, 2)
```

- overload signature 的类型不会合并，只能 resolve 到一个

```ts
function len(s: string): number
function len(arr: any[]): number
function len(x: any) {
  return x.length
}

len("") // OK
len([0]) // OK
let t = Math.random() > 0.5 ? "hello" : [0]
len(t) // 这里的t是string|number[]但是仍然check error
```

因此这里就不要用重载了，直接用 union type 吧

```ts
function len(x: any[] | string) {
  return x.length
}
let t = Math.random() > 0.5 ? "hello" : [0]
len(t) // 没问题了
```

因此多用 union 少用 overload 吧

### control flow analysis && narrow

当使用 union 来实现函数重载时，ts 可以通过 control flow analysis，将 union type narrowing 到某个具体的类型，可以帮助我们保证我们的实现更加安全。

```ts
function padLeft(padding: number | string, input: string) {
  return new Array(padding + 1).join(" ") + input // 报错，string + 1 不合法
}
```

narrowing to rescue

```ts
function padLeft(padding: number | string, input: string) {
  if (typeof padding === "number") {
    return new Array(padding + 1).join(" ") + input
  }
  return padding + input // 此时padding的类型被narrowing为string了
}
```

#### side effect

如果 control flow 含有函数调用，那么可能破坏 control flow analysis,若 1 处虽然 ts 帮我们推断了 arg.x 不为 null，但是由于 alert 存在副作用运行时还是可能为 null，导致运行时程序挂掉

```ts
function fn(arg: { x: string | null }) {
  if (arg.x !== null) {
    alert(arg)
    console.log(arg.x.substr(3)) //1. 这里的arg.x被设置为null了，所以这里会导致runtime error
  }
}
function alert(a: any) {
  a.x = null
}
```

flow 的策略于此相反

```flow
// @flow
function otherMethod() {
  /* ... */
}

function method(value: { prop?: string }) {
  if (value.prop) {
    otherMethod() // flow认为otherMethod可能含有副作用，所以invlidate refinement
    // $ExpectError
    value.prop.charAt(0) // type check error
  }
}
```

flow 和 ts 在这里采用了两种策略，ts 更加乐观，默认函数没有副作用，这可能导致 runtime error,但是 flow 更加悲观，默认存在副作用，导致 typecheck error 这可能导致很多无谓的判断，一个倾向于 completeness，一个倾向于 sound

#### 副作用标注

支持副作用标注，如果我们可以标注函数的副作用，就可以得到更合理的 type check

```ts
function fn(arg: { x: string | null }) {
    if (arg.x !== null) {
        alert(arg);
        console.log(arg.x.substr(3)); //1. 这里的arg.x被设置为null了，所以这里会导致runtime error
    }
}
// 假想的语法，没有支持
pure function alert(a:any)  {
    a.x = null;
}
```

更加详细的讨论见
https://github.com/microsoft/TypeScript/issues/9998
https://github.com/Microsoft/TypeScript/issues/7770

### type guard

typescript 通过 type guard 来进行 narrowing 控制，ts 内置了如下的 type guard

- typeof

```ts
function printAll(strs: string | string[] | null) {
  if (typeof strs === "object") {
    for (const s of strs) {
      console.log(s)
    }
  } else if (typeof strs === "string") {
    console.log(strs)
  } else {
    // do nothing
  }
}
```

- truth narrowing
  除了`0`|`NaN`|`""`|`0n`|`null`|`undefined`如下几个 value 为 falsy value，其他都是 truth value，ts 可以通过 truth 判定来进行 narrowing

```ts
function printAll(strs: string | string[] | null | undefined) {
  if (strs) {
    if (typeof strs === "object") {
      // 这里的strs被收敛到truthy value即 string | string[]
      for (const s of strs) {
        console.log(s)
      }
    }
  }
  // 由于""为string但是为falsy，所以这里的str为string | null
  else if (typeof strs === "string") {
    console.log(strs)
  }
}
```

- equality narrowing

```ts
function foo(x: string | number, y: string | boolean) {
  if (x === y) {
    // 通过相等判定，x和y只能都为string
    x.toUpperCase()

    y.toLowerCase()
  } else {
    console.log(x)

    console.log(y)
  }
}
```

- instance narrowing

```ts
function logValue(x: Date | string) {
  if (x instanceof Date) {
    console.log(x.toUTCString())
  } else {
    console.log(x.toUpperCase())
  }
}
```

- assignment narrowing

```ts
function foo() {
  let x: string | number | boolean

  x = Math.random() < 0.5

  console.log(x)

  if (Math.random() < 0.5) {
    x = "hello"
    console.log(x.toUpperCase()) // narrow 为string
  } else {
    x = 100
    console.log(x.toFixed()) // narrow为number
  }

  return x
}
```

- user-defined type guard

```ts
interface Foo {
  foo: number
  common: string
}

interface Bar {
  bar: number
  common: string
}

function isFoo(arg: any): arg is Foo {
  return arg.foo !== undefined
}

function doStuff(arg: Foo | Bar) {
  if (isFoo(arg)) {
    console.log(arg.foo) // OK
    console.log(arg.bar) // Error!
  } else {
    console.log(arg.foo) // Error!
    console.log(arg.bar) // OK
  }
}

doStuff({ foo: 123, common: "123" })
doStuff({ bar: 123, common: "123" })
```

### algebraic data types && pattern match

上面提到的 narrowing 只适用于简单的类型如 string，boolean，number 之类，通常我们可能需要处理更加复杂的类型如不同结构的对象，我们 typescript 可以通过 discriminated union 来实现对复杂对象的 narrowing 操作，discriminated union 通常由如下几部分组成

- union: 是多个 type 的 union
- discriminant: union 里的每个 type 都必须要有一个公共的 type property
- type guard: 通过对公共的 type property 进行 type check 来实现 narrowing

```ts
interface Circle {
  kind: "circle"
  radius: number
}

interface Square {
  kind: "square"
  sideLength: number
}

type Shape = Circle | Square

//cut
function getArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2
    case "square":
      return shape.sideLength ** 2
  }
}
```

#### exhaustive check

如我们此时新添加了一个 shape 类型 type Shape = Circle | Square | Rectangle, typescript 会自动告诉我们 getArea 里需要添加对新加类型的处理

```ts
interface Circle {
  kind: "circle"
  radius: number
}

interface Square {
  kind: "square"
  sideLength: number
}
interface Rectangle {
  kind: "rectangle"
  width: number
  height: number
}
type Shape = Circle | Square | Rectangle

//cut
// 在开了noimplicitReturn:true情况下，会提示我们Not all code paths return a value.ts(7030)
function getArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2
    case "square":
      return shape.sideLength ** 2
  }
}
```

当然我们也可以通过 never 直接进行检测

```ts
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x)
}
//cut
function getArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2
    case "square":
      return shape.sideLength ** 2
    /*
        case 'rectangle':
            return shape.height * shape.width;
        */
    default:
      return assertNever(shape) // 这里会type error,提示我们rectangle无法赋值给never
  }
}
```

基于 discriminant union 我们实际上实现了 ADT(algebraic data type)， 在其他的 functional programming language 里 ADT 和 pattern match 配合起来，有着惊人的表达能力,如 haskell 计算一个树高

```hs
data Tree = Empty
          | Leaf Int
          | Node Tree Tree

depth :: Tree -> Int
depth Empty = 0
depth (Leaf n) = 1
depth (Node l r) = 1 + max (depth l) (depth r)
```

上面的算法用 ts 表述如下,稍显累赘

```ts
type Tree = TreeNode | Empty
type Empty = {
  kind: "empty"
}
type TreeNode = {
  kind: "node"
  left: Tree
  right: Tree
}
const root: Tree = {
  kind: "node",
  left: {
    kind: "node",
    left: {
      kind: "empty",
    },
    right: {
      kind: "empty",
    },
  },
  right: {
    kind: "empty",
  },
}

function depth(tree: Tree): number {
  if (tree.kind === "empty") {
    return 0
  } else {
    return 1 + Math.max(depth(tree.left), depth(tree.right))
  }
}

console.log(depth(root))
```

## subtyping polymorphism（子类型）

### soundness && completeness

在类型系统中

- `soundness`指 type checker 能够 reject 所有的在运行时可能发生 error 的代码，这可能导致 reject 一些运行时不会发生 error 的代码
- `completeness`指 type checker 只 reject 运行时可能发生 error 的代码，这可能导致有一些运行时可能产生 error 的代码没被 reject
  理想的情况当然是 type checker 即是 sound 也是 complete，但这是不可能实现的，只能在两者中做 tradeoff，事实上 typescript 即不 sound 也不 completeness。事实上受限于 javascript 的本身缺陷，基于 javascript 的 type checker 几乎不可能做到 sound，理由如下

> A fully-sound type system built on top of existing JS syntax is simply a fool's errand; it cannot be done in a way that produces a usable programming language. Even Flow doesn't do this (people will claim that it's sound; it isn't; they make trade-offs in this area as well).
> JS runtime behavior is extremely hostile toward producing a usable sound type system. Getters can return a different value each time they're invoked. The valueOf and toString functions are allowed to do literally anything they want; it's possible that the expression x + y produces a nondeterministic type due to this. The delete operator has side effects which are extremely difficult to describe with a type system. Arrays can be sparse. An object with a own property of type undefined behaves differently from an object with a prototype property of the same value. What could even be done about code like const x = { ["to" + "String"]: 42 } + "oops"; (disallow all computed property names? disallow all primitive values? disallow operator + except when you've... done what, exactly)?

### structural typing && nominal typing

大部分面向对象的语言都是 nominal typing 的，这意味着即使两个类型的结构相同，也互不相容

```flow
class Foo {
  method(input: string): number { ... }
}
class Bar {
  method(input: string): number { ... }
}
let foo: Foo = new Bar(); // ERROR
```

这里的 Foo 和 Bar 虽然结构相同由于不是同一个 class name，所以并不相容
而对于 structual typing,只进行结构比较，并不关心 name，所以下述代码在 ts 里并不会报错

```
class Foo {
  method(input: string): number { ... }
}
class Bar {
  method(input: string): number { ... }
}
let foo: Foo = new Bar(); // Okay.
```

而 flow 的做法和 typescript 不同，其对 class 采用了 nominal typing 而对普通的对象和 function 采用了 structural typing,
typescript 暂时并不支持 nominal typing,
但可以通过其他方式进行模拟 https://basarat.gitbooks.io/typescript/docs/tips/nominalTyping.html,
事实上有一个 pr 正在个 typescript 添加 nominal typing 的支持https://github.com/microsoft/TypeScript/pull/33038

### subtype && assignment

typescript 里的 subtype 和 assignment 在大部分情况下等价，我们后续讨论不区分 assignment 和 subtype

```
So far, we’ve used “compatible”, which is not a term defined in the language spec. In TypeScript, there are two kinds of compatibility: subtype and assignment. These differ only in that assignment extends subtype compatibility with rules to allow assignment to and from any, and to and from enum with corresponding numeric values.
```

事实上 typescript 大部分都是 assignment compatibility 检测，即使是在 extends 的场景如 A extends B ? X : Y 这里检查的是 A 和 B 的 assignment compatibility。

> Different places in the language use one of the two compatibility mechanisms, depending on the situation. For practical purposes, type compatibility is dictated by assignment compatibility, even in the cases of the implements and extends clauses.

### structural assignability

由于 ts 暂时不支持 nominal subtyping, 我们主要讨论 structural subtyping 问题.

#### primitive type

对于 primitive type，类型检查很简单

```
function isAssignableTo(source: Type, target: Type): boolean {
  return source === target;
}
```

这里的 Type 可以是 null| string | number | Date | Regex 等基本类型，我们只需要直接比较两者的类型是否相等即可,为了简化讨论
我们定义`=>`来表示 isAssignableTo，如下

```
target => source
```

这里的 target 为 subtype, source 为 supertype
对于 primitive type，=>可以等价于==,但是对于 ts 还支持其他复杂类型，此时=>和==就不等价了,如

- structural types
- union type ,intersect types
- literal type , enum type
- generic type

### width subtyping

对于 structual types，
比较两个对象的是否类型兼容，我们只需要检查两个对象的所有属性的类型是否相同（这里是===并不是 =>,对于对象属性的=>的讨论见 depth subtyping)。

```
即 {a:T1,b:T2 } => { a:T1,b:T2}
```

如 target: {a:string,b:number} => source: { a: string, b: number}

另一个规则就是 target 不能缺少 source 里的 member,如下就会产生错误

```ts
function distance(p: { x: number; y: number }) {
  return p.x * p.x + p.y * p.y
}
distance({ x: 1 }) // error
```

这里的 target 为{x:number} 而 source 为{x:number,y:number} ，target 里缺少 source 的 y 会导致程序出现 runtime error。

另一个规则也比较显然
target 里在包含了 source 所有的属性之外还可以包含 source 之外的属性

```ts
function distance(p: { x: number; y: number }) {
  return p.x * p.x + p.y * p.y
}
distance({ x: 1, y: 2, z: 3 }) // ok
```

上述的代码并不会产生 runtime error，所以这条规则似乎也很显然

#### exact type

但是有时候我们不希望我们的对象有额外的属性，一个常见的场景是 object.assign 的使用

```ts
function assign(x: { name: string }, y: { age: number }) {
  return Object.assign({}, x, y)
}
const x = { name: "yj" }
const y = { age: 20, name: "override" }
assign(x, y) //我们不希望x的name被y的name覆盖掉，所以期望这里ts报错
```

flow 对 exact object type 进行了支持，保证传入的参数没有额外属性

```
/* @flow */
function assign(x:{name: string}, y:{|age: number|}){ // {||}表示exact object type
  return Object.assign({},x,y);
}
const x = {name: 'yj'}
const y = {age: 20, name: 'override'}
assign(x, y) //flow 会报错， Cannot call `assign` with `y` bound to `y` because property `name` is missing in object type [1] but exists in object literal [2].
References:
```

但是 ts 尚未支持 exact types,有相关 pr https://github.com/microsoft/TypeScript/pull/28749
ts 采取了另外一种方式来处理 exact type 的问题
ts 对于 object literal type 进行了 EPC(excess property check)
下述代码实际上是会报错的

```
function assign(x:{name: string}, y:{age: number}){
  return Object.assign({},x,y);
}
const x = {name: 'yj'}
const y = {age: 20, name: 'override'}
assign(x, {age: 20, name: 'override'}) //我们不希望x的name被y的name覆盖掉，所以期望这里ts报错
```

如果我们不希望进行 ECF，则可以通过将 object literal 赋值给变量来绕过 ECF，因为 ECF 只适用于 object literal

```
function assign(x:{name: string}, y:{age: number}){
  return Object.assign({},x,y);
}
const x = {name: 'yj'}
const y = {age: 20, name: 'override'}
assign(x, y) // 绕过ecf检查
```

### depth subtyping

如果我们有如下两个 class

```ts
class Person {
  name: string
}
class Employee extends Person {
  department: string
}
```

可知 Employee 是 Person 的 subtype，即 Employee => Person，我们可以将 Employee 赋值给 Person 的

```ts
class Person {
  name: string
}
class Employee extends Person {
  department: string
}

var employee: Employee = new Employee()
var person: Person = employee // OK
```

但是能否将包含 Employee 属性的对象赋值给包含 Person 属性的对象呢，考虑下述 case

```ts
class Person {
  name: string
}
class Employee extends Person {
  department: string
}

var employee: { who: Employee } = { who: new Employee() }
var person: { who: Person } = employee
```

上述代码，在 flow 里是出错的，在 typescript 是通过的，显然在这里 ts 和 flow 又采取了不同的策略，实际上 flow 策略更加安全，如如下代码
虽然在 ts 里正常通过，但是实际上会导致 runtime error

```
class Person {
  name: string
  constructor() {
    this.name = 'person'
  }

}
class Employee extends Person {
  constructor(public department: string) {
    super();
  }
}

var employee: { who: Employee } = { who: new Employee('department') };
var person: { who: Person } = employee;
person.who = new Person

employee.who.department.toUpperCase(); // runtime error
```

这里出错的根源在于 person 和 employee 是 mutable 的，如果他们是 immutable 的，那么 person.who = new Person
这步操作就会被禁止，也就不会导致 runtime error,结论就是在 mutation 情况下，depth subtyping 会导致 unsound

事实上 typescript 不仅仅是 object 是 covaraint 的，数组也是 covariant 的，同样会导致 runtime error

```ts
class Person {
  name: string
  constructor() {
    this.name = "person"
  }
}
class Employee extends Person {
  constructor(public department: string) {
    super()
  }
}

let person_list: Person[] = []
let employee_list: Employee[] = []
person_list = employee_list

person_list[0] = new Person()
employee_list[0].department.toUpperCase()
```

而 flow 的数组是 invariant 则更为安全

### type variance

简单介绍下各种 type variance

我们有三个类

```
class Noun {x:string}
class City extends Noun {y:string}
class SanFrancisco extends City {z:string}

// 由于ts的class是structual typing，所以
class A{}
class B extends A{} 中A =>B && B=>A ,A和B是等价的，所以需要额外加成员来区分，
在flow里就不用了
```

可以得知 SanFrancisco => City => Noun
City 是 Noun 的 subtype， Noun 是 City 的 supertype
ts 不支持 type variance 标注，我们这里使用 flow 来说明

- invariance

```ts
function method(value: InvariantOf<City>) {...}

method(new Noun());         // error...
method(new City());         // okay
method(new SanFrancisco()); // error...
```

invariance 不接受 supertype 和 subtypes

- covariance

```ts
function method(value: CovariantOf<City>) {...}
method(new Noun());         // error...
method(new City());         // okay
method(new SanFrancisco()); // okay
```

covariance 接受 subtype 不接受 supertype

- congtravariance

```ts
function method(value: ContravariantOf<City>) {...}

method(new Noun());         // okay
method(new City());         // okay
method(new SanFrancisco()); // error...
```

contravariance 接受 supertype 但不接受 subtype

- bivarance

```ts
function method(value: BivariantOf<City>) {...}
method(new Noun());         // okay
method(new City());         // okay
method(new SanFrancisco()); // okay
```

bivarance 即接受 supertype 也接受 subtype
事实上 flow 对于对象属性和数组都是 invariant 的，而 ts 对于对象和数组都是 coviant 的

### function subtyping

ts2.6 之前对于参数是 bivariant 的，参数协变其实会产物问题，逆变则没有问题

```
function dist1(p:{x:number,y:number}){
  return p.x+p.y
}
function dist2(p:{x:number,y:number,z:number}){
  return p.x + p.y + p.z
}

let f: typeof dist1 = dist2;
let g: typeof dist2 = dist1;
console.log(g({x:1,y:2,z:3})// ok
console.log(f({x:1,y:2})) // 结果为NaN,因为 p.z为undefined
```

因此 ts 在 2.6 之后，在开启 strictFunctionTypes=true 的情况下，函数参数变为了 contravariant 了则更加安全了。

这个规则也可以推理不同参数的函数的 subtying 情况,
首先考察 tuple 的 subtyping 问题

```ts
let tuple = [1, 2] as [number, number]
let tuple2 = [1, 2, 3] as [number, number, number]

let t1: typeof tuple = tuple2 // ok
let t2: typeof tuple2 = tuple // error because t2[2].toFixed() will cause runtime error
```

可知 t2 => t1 即 tuple 长度大的是长度小的子类型
由于 ts 的多参函数实际可以视为 tuple,且 function 是逆变的，因此可以推得参数少的可以赋值给参数多的

```
function add1(x:number,y:number){
  return x+y;
}
function add2(x:number,y:number,z:number){
  return x+y+z
}
let f1: typeof add2 = add1; // ok，because [number,number,number] => [number,number]  and function contravariant
let f2: typeof add1 = add2; // error
```

我们再考虑返回值

```ts
function f(): { x: number; y: number } {
  return { x: 1, y: 2 }
}
function g(): { x: number; y: number; z: number } {
  return { x: 1, y: 2, z: 3 }
}

let a: typeof f = g
let b: typeof g = f

a().x // ok
b().z // error
```

我们可以看到对于函数返回值应该设计为协变，这里 flow 和 ts 都是采用协变，不同的是 ts 在这里又做了个特殊的处理，考虑如下代码

```
let t = {x:1,y:2,z:3};
function f(): void{

}
function g(): string{
  return 'a'
}

let a: typeof f = g; // should error but ok

const res = a();

```

这里虽然 void 既不是 string 的 subtype 又不是 supertype，但是这里仍然能够通过检查，这里 ts 故意为之见https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-functions-returning-non-void-assignable-to-function-returning-void， 但在 flow 里是通不过类型检查的
