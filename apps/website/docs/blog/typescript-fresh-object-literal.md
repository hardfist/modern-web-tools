---
title: "深入typescript类型系统: fresh object literal"
date: "2020-01-11"
description: "关于fresh object literal的坑"
---

今天公司小伙伴分享 Typescript 实践时，提到的一个小坑就是对象字面量的赋值问题。本文结合规范谈谈关于 fresh object literal
type 的小坑。

```ts
interface SquareConfig {
  color?: string
  width?: number
}

function createSquare(config: SquareConfig): { color: string; area: number } {
  return {
    color: "sss",
    area: 10,
  }
}
const obj: SquareConfig = { colour: "red", width: 100 } // 1.报错
let mySquare = createSquare({ colour: "red", width: 100 }) // 2.报错
const obj2 = { colour: "red", width: 100 }
createSquare(obj2) // 3.不报错
createSquare({ colour: "red", width: 100 } as SquareConfig) // 4.不报错
```

上面这个 case 就是 Ts 中使用对象字面量常常碰到的一个坑。同一个对象为什么通过第一种和第二种的方式调用会报错，通过第三种和第四种的方式调用却不会报错呢。

其实上面的报错是 Typescript 进行 assignment compatibility 检测出来的。

Typescript 实际存在着两种兼容性，子类型兼容性(subtype compatibility)和赋值兼容性(assignment
compatibility)。上例子中的兼容性正对应了赋值兼容性。

![](https://pic1.zhimg.com/v2-47ab4e902895608db07e878777432fc8_b.jpg)

对于赋值语句和参数调用时都会触发赋值兼容性检测。

考虑赋值操作 T = S, S 可以赋值给 T 的一个条件是 S 相对于 T 并没有 excess properties。

![](https://pic1.zhimg.com/v2-70d74b61d93bae939ade9165c89bc138_b.jpg)

这里引入了 excess properties 的概念，Ts 引入 excess
properties 的目的就在于对于对象字面量的赋值，比相对于普通的右值进行更加严格的检查，以防止用户的拼写或者添加了多余属性错误。

excess properties 概念定义如下：

S 相对于 T 存在 excess properties，当且仅当:

1. S 是一个 fresh object literal type,
2. S 有一个或多个 T 中不 expect 的属性

规范毕竟是规范，概念层出不穷，这里又引入了两个额外的概念

fresh object literal type 和 expect

首先解释下 expect，我们说一个属性 P 被类型 T expect 当且仅当满足如下之一条件:

1. T 不是对象(object)，联合(union)，或者交叉(Intersection)类型
2. T 是对象类型且
   1. T 存在和 P 同名的属性
   2. T 存在 string 或者 index signature 如 { [key:string]:string}
   3. T 不存在属性
   4. T 是全局的 Object
3. T 是一个 union 或者 intersection 类型且 P 是 T 组成 type 的 expect 属性 (这里已经递归了，expect 的判定是个递归算法）

![](https://pic4.zhimg.com/v2-57b946e1d62dc22ba503498898de160b_b.jpg)

对象字面量如 `{ colour: 'red', width: 100 }` 的类型为 `fresh object literal type`
,我们可以通过 widen 或者 assertion 的方式将 `fresh object literal type`
的 freshness 擦除。看看这里又引入了 widen 和 assertion 的概念

![](https://pic4.zhimg.com/v2-47dd1d543550a803554b94f91dba4e53_b.jpg)

widen 的概念是 Ts 为了帮助用户做自动类型推断而引入的。

如

      var name = "Steve"; // 自动推断name 为string

实际上 Ts 的类型推倒稍显复杂,你能猜到下面的类型推倒结果吗？

```ts
var name1 = "steve" // string
const name2 = "hello" // 'hello'
const a = null // any
var b = null // any
const c = undefined // any
var d = undefined // any
const obj = { a: "hello", b: 2 } // { a: string, b: number, c: any}
```

widen type 的一条规则是所有 undefined 和 null 的地方都被推倒为 any。具体的全部规则我也不知道啊。

讲到这里我们终于可以解决开始的题目了。

```ts
interface SquareConfig {
  color?: string
  width?: number
}

function createSquare(config: SquareConfig): { color: string; area: number } {
  return {
    color: "sss",
    area: 10,
  }
}
const obj: SquareConfig = { colour: "red", width: 100 } // 1.fresh object type
let mySquare = createSquare({ colour: "red", width: 100 }) // 2. fresh object type
const obj2 = { colour: "red", width: 100 } //3. widen form :{ colour: string, width: number}
const obj4 = "string"
createSquare(obj2)
createSquare({ colour: "red", width: 100 } as SquareConfig) // 4. assertion
```

上例中 1 和 2 都是属于 S 属于 fresh object type 且含有 excess property 即 `colour`
,3 属于通过 widen 消除 freshness，4 属于通过 assertion 消除 freshness 。

那么我们还有其他方法来解决 1 和 2 中的报错吗？

当然可以只要破坏 S 相对于 T 存在 excess property 的两个必要条件之一即可

1. S 是一个 fresh object literal type,
2. S 有一个或多个 T 中不 expect 的属性

方法 3 和方法 4 都是破坏了条件 1，我们也可以通过破坏条件 2 解决报错问题。即 S 中的属性都被 T expect 即可，回顾属性 P 被类型 T
expect 条件。我们任意满足四个条件之一即可。

```ts
const obj3: { [key: string]: any; color?: string; width?: number } = {
  colour: "red",
  width: 100,
} // index signature

const obj4: {} = {
  colour: "red",
  width: 100,
} // has no properties

const obj5: Object = {
  colour: "red",
  width: 100,
} // global  Object
```
