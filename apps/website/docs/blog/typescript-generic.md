---
title: "深入typescript类型系统: 泛型"
date: "2020-01-11"
---
typescript 泛型和类型元编程

[https://zhuanlan.zhihu.com/p/82056426](https://zhuanlan.zhihu.com/p/82056426) 前面讲了typescript关于子类型的一些问题，本文主要讨论Typescript的泛型设计和类型元编程能力。泛型和子类型几乎是正交的两个概念，当然两者也可以配合使用(Bounded Polymorphism)。泛型可以说是Typescript类型系统里最难以理解的部分，因为其涉及非常多type theory的知识，本人对type theory也是一窍不通，只是结合平时的日常使用加以理解。

### introduction

我们先实现一个简单的函数，用于查找数组的第一个元素

    function firstElementString(list: string[]){
      return list[0];
    }
    function firstElementNumber(list: number[]){
      return list[0];
    }

我们发现每次添加一个新的类型，我们都要重新实现一遍该函数,当然我们也可以直接使用any

    function firstElement(list: any[]){
      return list[0];
    }

但这样无法保证返回值的类型和传入参数类型的一致性，这时候使用泛型就比较合理

    function firstElement<T>(list: T[]): T{
       return T[0]
    }
    const s = firstElement<string>(['a','b','c']) // s is string
    const n = firstElement<number>([1,2,3]) // n is number

调用的时候也可以不指明返回类型，可以自动的根据实参推断出类型变量的类型

    const n = firstElement([1,2,3]) // n is number

多个类型变量之间甚至可以建立约束关系
```
function pick<T>(o: T, keys: keyof T) {
    
}
pick({a:1,b:2},'c') // 报错，'c'不属于'a'|'b'
```
上面的firstElement对于任何的T类型都有效，但是有时候我们的函数实现依赖了类型变量的某些性质，这时候我们需要对类型变量加以约束，来保证我们实现的合法性。
```
function longest<T extends { length: number }>(a: T, b: T) {
  if (a.length >= b.length) {
    return a;
  } else {
    return b;
  }
}
```
如上述longest函数实现，其要求T类型必须有length属性，这样才可以进行length大小的比较。Typescript中可以通过`extends`对参数变量的类型加以限制。
值得注意的是当函数的返回值也是类型变量时，有些行为可能会出乎意料
```
function minimumLength<T extends { length: number }>(obj: T, minimum: number): T {
  if (obj.length >= minimum) {
    return obj;
  } else {
    return { length: minimum }; // 报错 Type '{ length: number; }' is not assignable to type 'T'.
  }
}
```
这里的 `{length:minimum}`虽然貌似符合`{length: number}`的约束，但是这里的返回类型实际上还有一个约束就是与输入的obj类型参数一致。因此如果obj的类型为 `{length:number} & { name: string}`,这里的`{length:minimum}`明显不符合约束
```
function minimumLength<T extends { length: number }>(obj: T, minimum: number): T {
  if (obj.length >= minimum) {
    return obj;
  } else {
    return {...obj, length: minimum } // 这里能同时保证满足T和{length:number}的约束
  }
}
```
我们查看泛型函数的类型发现，其类型和普通的类型不一致，其类型里包含类型参数
![image](https://user-images.githubusercontent.com/8898718/70391108-86b28e80-1a0c-11ea-8be3-add9c539f2ab.png)
实际上我们可以定义其类型如下
```
type Fn<T extends {length: number}> = (obj: T, minimum: number) => T

```
很不幸Typescript缺乏对Generic values的支持，没办法直接声明一个变量类型为泛型（https://github.com/microsoft/TypeScript/issues/17574）
![image](https://user-images.githubusercontent.com/8898718/70391114-93cf7d80-1a0c-11ea-8daa-69ff609ef670.png)

这里的Fn即是type constructor
### type constructor
在typescript里有两个东西功能重合度很大即type alias和interface，这两者实际上都扮演了type constructor的角色（两者有细微的语义差异，这里暂不讨论），后续的type constructor泛指 type alias和interface。type constructor扮演的角色实际上相当于函数的角色，只不过其参数是类型，可以称之为type的函数，其输入是type输出也是type,其甚至有类似if/else的控制结构，实际上type constructor结合extends|infer和对recursive的支持，其本身也近似图灵完全（https://github.com/Microsoft/TypeScript/issues/14833)。


type constructor和Typescript 本身的一些类型运算符实际上构成了type expression，其和`js`里的表达式基本上能构成对应关系，我们因此可以把我们的type expression当做函数程序一样进行运行求值，即我们可以进行type-level programming（很类似于c++的模板元编程）。参考SICP中对于语言的三个基本要素的描述
![image](https://user-images.githubusercontent.com/8898718/70391117-9e8a1280-1a0c-11ea-8ed8-f8ccee953076.png)

我们通过和普通的js程序进行对比，来展示Typescript 类型是否满足这个三个基本要素。
```
基本数值和literal type
'abc' | 'def', ; // type-level
'hello' // value-level

类型别名和变量
type Age = number;  // type-level
let age = 1 // value-level

union和基本运算
type ID = number | string ; 
let id = 1 + 2;

对象和record type
type Class = { teacher: string, room_no: string} 
let class = {teacher:'yj', room_no: 201}

复合过程
type MakePair<T,U> = [T,U]
const make_pair = (x,y) => [x,y];
type Id<T> = T; 
const id = x => x;

函数求值和泛型实例化
let pair = make_pair(1,2)
type StringNumberPair = MakePair<string,number>

条件表达式和谓词
let res = x === true ? 'true': 'false'
type Result = x extends true ? 'true' : 'false'

对象解构 和 extractType
const { name } = { name: 'yj'}

type NameType<T> = T extends { name: infer N } ? N : never;
type res = NameType<{name: 'yj'}>


递归类型和递归函数
type List<T> = {
   val: T,
   next: List<T>
} | null

function length<T>(list: List<T>){
  return list === null ? 0 : 1 + length(list.next);
}


map && filter && 遍历 & 查找

const res = [1,2,3].filter(x => x%2 ===0).map(x => 2*x)
type A = {
    0: 1,
    1: 2,
    2: '3',
    3: '4'
}
type Filtler<T extends Record<string,any>, Condition> = {
    [K in keyof T]: T[K] extends Condition ? T[K] : never
}[keyof T]
type B = Filtler<A, string> // 不支持内联写type function
```
通过对比我们发现Typescript已经满足了上述的三个基本要素，完全可以进行很灵活的面向类型编程。但是其仍然存在某些限制(如只支持递归，不支持 循环，不支持对number literal进行数学运算等)，导致其相比于js编程仍然稍显麻烦。本文通过几个case展示TS类型编程中容易碰到的一些问题
#### Tuple
细心的用户可能会发现，虽然在Javascript中不存在tuple类型（定长异构数组），但是Typescript是有单独的Tuple类型的，其在函数式编程中的类型安全扮演了重要的角色。
```
const a = [1,'a','3'] as const // [1,'a','3'] tuple类型
const  a = [1,'a','3'] // (string|number)[]数组类型
```
Tuple类型的一种重要应用就是定长函数参数的类型实际上tuple类型。
```
function test(name:string, age: number, single: boolean) { true }

type parameters = Parameters<typeof test> // tuple类型 [string,number,boolean]
```
实际上面test函数也可以表达如下,这样可以清楚的看出来，实际上定参的函数参数实际上就是一个单参的tuple(很不幸，javascript不支持tuple。。。)
```
function  test2(...args: [string, number, boolean]) {
    return true
}
test2(1, 2, 3) // 报错
test2('a', 2, true);
```
接下来我们可以对tuple进行一些常规的运算
####  Head: 获取tuple的第一个元素
```
type Head<T extends any[]> = T[0]
type head = Head<Parameters<typeof test2>> // 结果为string
```
#### Length: 获取tuple的长度
借助lookup type可以轻松获取
```
type Length<T extends any[]> = T['length']
```
#### Tail: 除去第一个的后续元素
很自然的想到用infer
```
type Tail<T> = T extends (head: any, ...tail: infer U) ? U : never; 
```
很不幸Typescript在数组里目前并不支持这样写 ttps://github.com/Microsoft/TypeScript/issues/25719，但是在函数参数里却支持(有点莫名其妙)
```
type Tail<A extends any[]> = 
  ((...args: A) => any) extends ((h: any, ...t: infer T) => any) ? T : never
```
#### last 获取最后一个元素
既然我们已经能获取到Tuple的长度了，很自然的想到下述方法
```
type Last<T> = T[Length<T> -1]
```
很不幸Typescript目前并不支持对number literal运算的支持https://github.com/microsoft/TypeScript/issues/26382 , 因此我们没办法直接这样操纵,怎么实现呢，读者自己可以想想

### **conditional type**
从上面的例子可以看出，类型运算大量的依赖于conditional type,下面研究下conditional type的一些性质
conditional type的定义如下
```
T extends U ? X : Y
```
为了方便后续讨论，各参数定义如下：
* checkedType 被检测类型
* extendsType 判断条件
* X: trueType 检测条件为true的结果类型
* Y: falseType 检测条件为false的结果类型
上述type expression的意思为：如果T能够assignable（这里不是subtype的意思,assignable的问题又足够讲一篇了）给U那么结果为X，否则结果为Y，如果上述表达式里的T和U含有泛型参数，那么condition的结果就被defer了，否则改表达式的结果被resolve为X或者Y
一个简单的运用如下
```
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";

type T0 = TypeName<string>;  // "string"
type T1 = TypeName<"a">;  // "string"
type T2 = TypeName<true>;  // "boolean"
type T3 = TypeName<() => void>;  // "function"
type T4 = TypeName<string[]>;  // "object"
```
该表达式虽然简单，但实际上充满了各种edge case。
这里着重声明一点，虽然Typescript多处使用了extends关键词，但是实际上每处extends的意思不尽相同，更不要强行的将extends往java的继承上去靠，extends关键词一定程度上感觉是被Typescript滥用了。
#### distributive conditional types
在上面的conditional types里，如果我们的 checked type是 naked type那么 conditional types就被称为distributive conditional types。distributive conditional types具有如下性质
```
type F<T> = T extends U ? X : Y
type union_type = A | B | C
type a = F<union_type>
那么a的结果为 A extends U ? X :Y | B extends U ? X :Y | C extends U ? X : Y
```
如下例所示
```
type T10 = TypeName<string | (() => void)>;  // "string" | "function"
type T12 = TypeName<string | string[] | undefined>;  // "string" | "object" | "undefined"
type T11 = TypeName<string[] | number[]>;  // "object"
```
##### 嵌套运算
并且如果这里的X也是包含T的表达式，即X = G<T\>那么此时T在X的表达式也满足U的约束，这实际上促使我们可以进行conditional types的嵌套运算，如下例所示
```
type ContainName<T> = T extends { name: string } ? T : never;

type ContainAge<T> = T extends { age: number } ? T : never;

type a = { name: 'yj' } | { age: 20 } | { name: 'yj', age: 20 }

type res = ContainAge<ContainName<a>> // 结果为 {name: 'yj', age: 20}
```
#### naked type
我们注意到distributive conditional types实际上有三个前提条件
* 必须是checked type
* 必须是naked type
* T实例化为union type
首先考察第一点这里要求的必须要checkedType,如果T出现在extends type里并不会distributive
```
type Boxed<T> = T extends any ? { value: T } : never;
type Boxed2<T> = any extends T ? { value: T } : never;
type a = Boxed<'a' | 'b'>  // distributed {value: 'a'} | {value: 'b'} 
type b = Boxed2<'a'|'b'>  // non distributive { value: 'a' | 'b'}
```
第二点是要求必须要naked type，然而Typescript并没有说明啥是naked type, 我们大致还可以这个type没有被包裹在其他的复合结构里，如 array , record , function等。如我们可以通过将T包裹为[T]来破坏naked type

```
type Boxed3<T> = [T] extends any ? { value: T } : never;
type c = Boxed3<'a' | 'b'> // { value: 'a' | 'b'}
```

第三点是要求T实例化为一个union type，这点本来似乎没啥歧义，是不是union一看便知，然而这里的union type还包含了两个看着不像是union的type， any和boolean
```
type Check<T> = T extends true ? 'true' : 'false'

type d = Check<any> // 'true' | 'false'
type e = Check<boolean> // 'true' | 'false'
```
出乎意料的是这里的返回结果并不是`true`而是`true`|`false`, 原因就在于any和boolean都被视为了union type，这在我们类型编程中经常会造成影响，如何避免any被resolve为trueType和falseType呢？很简单，破坏前面两个条件即可。
这里还有一个坑就是，虽然`unknown`和any都贵为 top type，unknown却没被视为union，而且这是故意为之的（因为any的union特性经常导致一些意外的行为，所以可能提供一个不union的替代吧）。




#### why never
这里其实还有另一个坑就是never的处理
```
type Boxed<T> = T extends any ? { value: T } : never;
type res = Boxed<never> // 结果为never
type res2 = never extends any ? { value: never} : never; // 结果为 { value: never}
```
WTF？res2不就是将res泛型实例化的结果吗？为啥子还不一样呢
没办法，这实际上是支持distributive conditional type的必要条件, 主要原因在于never是union运算的幺元
```typescript
A | never  = A;
```
考虑下述运算
```ts
type F<T> = T extends U ? X : Y
type F<A> = A extends U ? X : Y  // before
// A = A | never
type F<A> = type F<A|never> = A extends U ? X : Y  | never extends U ? X : Y // after
```
我们这这里要保证before和after恒等，那么就必须要保证  `never extends U ? X : Y`的结果也是union的幺元即never。
never其实还另有其他用处，我们打开ts的标准ts声明`lib.es5.d.ts` 看看标准里怎么运用conditional type.

我们发现经常出现下述模式
```
type F<T> = T extends Condtion? Result | never; 
```
为啥子这里的falseType要用never呢。原因也和distributive conditional type有关。原因还是在于never是union运算的幺元。所以如果我们的conditional types是做某些过滤操作的话，通常合理的做法就是讲falsetype设置为never，这样可以保证一旦某些union的分支判断结果为falseType,就可以过滤掉该分支。如下例所示
```
type Diff<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type T30 = Diff<"a" | "b" | "c" | "d", "a" | "c" | "f">;  // "b" | "d"
```
#### type resolve  && type check
还有一个需要注意的是Typescript类型系统也分为type resolve和type check两部分, type check的结果可能并不影响type infer的结果。考虑下述case
```
type F<T extends string> = T extends string ? 'string' : 'other'

type a = F<'1'> // 结果为 'string'
type b = F<1>  // 结果为 'other'
type c = b extends 'other' ? true : false; // 结果为 true
```
这里虽然约定了T是 extends string的，但是这个约束不像嵌套运算里的讲的约束，嵌套运算里的约束会影响后续 运算结果，而这里的T的约束，只进行type checker，并不影响运算结果。


