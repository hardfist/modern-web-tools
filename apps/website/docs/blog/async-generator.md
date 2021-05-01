---
title: "深入Typescript: 从类型理解rxjs和async generator"
date: "2020-01-11"
description: "关于rxjs"
---

经历了 react hooks 的洗礼后，我们走进了 rxjs 的怀抱。本文尝试从类型系统角度去理解 rxjs。

本文主要是本人对 Erik meijer(RX 的发明者) talk 的理解（信息量很大，看了 n 遍），错误之处，欢迎指正

https://www.youtube.com/watch?v=sTSQlYX5DU0
​

我们首先仔细回顾下我们日常使用的 javascript，基本上围绕着两个东西展开 function 和 value，下面详细讨论下 function。

function 几乎可以分为三类

- getter：没有入参，有返回值
- setter： 没有返回值，只有入参
- setter&&getter: 既有入参也有返回值
  为了简化讨论我们这里只讨论 getter 和 setter，为了进一步简化讨论，这里不区分 function 和 method

## Getters

首先定义 getter 的类型如下

```ts
interface Getter<T> {
  (): T
}
interface XXXGetter<T> {
  xxx(): T
}
```

我们日常使用的函数很多都是 getter，如 Math.random(),uuid() ,getter 相比直接的 value 访问一般有如下一些作用

- 屏蔽获取值的方式，将使用方和获取值的具体方式解耦，甚至可以用来支持依赖注入

```ts
function getHost() {
  if (process.env.NODE_ENV === "development") {
    return "test.xxx.com" // 返回线下测试地址
  } else {
    return "prod.xxx.com" // 返回线上地址
  }
}
```

- 惰性求值，配合 memo 使用可以避免重复的计算，如 react 的 useMemo 和 useCallback

```ts
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b])
```

- 惰性求值，用来隔离副作用，典型的就是 Reader Monad
  插入副作用,如每次访问某个对象时记录一条日志

```ts
function getUser() {
  Analytics.sendEvent("User object is now being accessed")
  return { name: "Alice", age: 30 }
}
```

## Setters

setters 恰好与 getter 相反，其只能接受参数，没有返回值，我们平时使用的很多函数都是 setters，例如 console.log, document.write，其类型签名如下

```ts
interface Setter<T> {
  (arg: T): void
}
interface XXXSetter<T> {
  xxx(arg: T): void
}
```

与 getters 相反，getter 多用于抽象，而 setters 则更多的用于发送命令。我们当然也可以对 setters 进行封装

```ts
function fancyConsoleLog(str) {
  console.log("⭐ " + str + " ⭐")
}
```

## Getter Getter

getter-getter 仍然还是一个 getter，只是其返回值也是一个 getter，其类型签名如下

```ts
interface GetterGetter<T> {
  (): Getter<T>
}
```

getter-getter 可以充分利用闭包的特性，进行状态封装,考虑下述函数

```ts
let i = 2;
function getNextPowerOfTwo() {
  const next = i;
  i = i \* 2;
  return next;
}
```

如果我们想要我们的 getter 是有状态的，每次调用的结果都不一定唯一，我们如果不在内部实现里依赖其他的 getter，那么只能将状态放在外部，但这对外部环境造成了污染。而且这种也不是并发安全的，当多个 getter 同时访问一个外部变量，结果很难预料。更好的方式则是再封装一层 getter

```ts
function getGetNext() {
  let i = 2;
  return function getNext() {
    const next = i;
    i = i \* 2;
    return next;
  }
}
let getNext = getGetNext();
console.log(getNext()); // 2
console.log(getNext()); // 4
console.log(getNext()); // 8
getNext = getGetNext(); // 🔷 restart!
console.log(getNext()); // 2
console.log(getNext()); // 4
console.log(getNext()); // 8
console.log(getNext()); // 16
console.log(getNext()); // 32
```

这样既防止了污染，也是并发安全的。

## Setter Setter

setter-setter 也还是一个 setter，只是其函数也是一个 setter，如下就是一个 setter setter

```ts
function addHelloEventListener(callback) {
  callback("hello")
}
addHelloEventListener(result => {
  console.log("result:", result)
})
```

我们发现这就是我们平时日常使用的 callback，实际上行 getter 和 setter 在一定程度上可以相互转换

```ts
// getter getter style
function getTen() {
  // producer
  return 10
}
function printResult(result) {
  // consumer
  logger.info(result)
}
printResult(getTen())
// setter setter style
function triggerCb(cb) {
  // producer
  cb(10)
}
function printResult(result) {
  // consumer
  logger.info(result)
}
triggerCb(printResult)
```

我们可以将一个 getter 操作以 setter 方式的进行书写，这实际就是 CPS 变换

看看上面代码，明显 settter setter style 的可读性较差，那么这种写法还有用吗，实际上还是有点用的

我们观察一下上述代码，发现实际可以将功能拆分开来

- producer： 生成者负责生产值，即这里的 10
- consumer： 消费者负责消费值：即这里的http://logger.info
  对于上面的 getter getter style，实际是消费者决定生产者何时生产值即 pull 模型，而对于 setter setter style，是生产者决定消费者何时消费值，即 push 模型，这对于我们平时的业务建模影响很大。

# Iterator

给 getter getter 加一点约束吧
我们再回顾下上面的 getter-getter

```ts
function getGetNext() {
  let i = 2;
  return function getNext() {
    const next = i;
    i = i \* 2;
    return next;
  }
}
let getNext = getGetNext();
console.log(getNext()); // 2
console.log(getNext()); // 4
console.log(getNext()); // 8
getNext = getGetNext(); // 🔷 restart!
console.log(getNext()); // 2
console.log(getNext()); // 4
console.log(getNext()); // 8
console.log(getNext()); // 16
console.log(getNext()); // 32
```

已经具有了支持多次重入和有状态两种性质了，实际上一旦我们再给我们的 getter 加上一些约束，将会发挥更大的作用

如果我们把我们的 getNext 当做一个序列，我们发现我们上面的 getter 是不太好区分这个序列是否结束的。我们可以考虑约定下 getNext 的返回类型，加一个标志位来表示该序列是否结束,定义返回类型如下

```ts
interface IteratorResult<T> {
  value: T
  done: boolean
}
```

重写上述函数

```ts
function getGetNext(): IteratorResult<number> {
  let i = 40
  return function getNext() {
    if (i <= 48) {
      const next = i
      i += 2
      return { done: false, value: next }
    } else {
      return { done: true }
    }
  }
}
```

此时通过标记为，我们就可以很方便的实现迭代了

```ts
let getNext = getGetNext()
for (let result = getNext(); !result.done; result = getNext()) {
  console.log(result.value)
}
```

我们发现这个约定不错，只要任何函数都是这样实现的，就可以很方便的对该函数进行遍历了，我们甚至可以进一步的定义一个类型,这里仍然可以将其视为一个返回 IteratorResult 的 getter

```ts
interface Iterator<T> {
  next(): IteratorResult<T>
}
```

这样只要我们的对象实现了该接口，我们就可以通过 next 接口对该对象进行遍历了，如下我们就实现了一个简单的可迭代类型

```ts
class GetNext implements Iterator<number> {
  i = 42
  public next() {
    if (this.i <= 48) {
      const next = this.i
      this.i += 2
      return { done: false, value: next }
    } else {
      return { done: true, value: undefined }
    }
  }
}
```

简直完美，但是每次使用 Iterator 都写那么一坨 for 代码实在有点麻烦，要是有人帮我写这段代码多好啊，制定语言规范的那帮人，那么聪明早就帮你想好了，只要你实现了 Symbol.iterator 协议，就可以很轻松的使用 for of 对你的对象进行遍历了（这下你知道为啥能对数组进行 for of 遍历了吧）

## Iterable: for of 的背后功臣

此时定义实现了 Symbole.iterator 接口的类型如下

```ts
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>
}
```

修改上述代码，支持 Iterable 接口

```ts
class GetNext2 implements Iterable<number> {
  [Symbol.iterator]() {
    return {
      i: 42,
      next() {
        if (this.i <= 48) {
          const next = this.i
          this.i += 2
          return { done: false, value: next }
        } else {
          return { done: true, value: undefined }
        }
      },
    }
  }
}

for (const x of new GetNext2()) {
  console.log("result2:", x)
}
```

这下我们遍历就简化了很多，但是仍然存在不足，此时我们没法使用传统的 next 方法遍历 GetNext2 对象了，明显 for of 遍历虽然简洁，但是 next 方法遍历实际更加灵活，所以进一步的我们考虑是否能同时支持 Iterable 和 Iterator 接口，答案是可以的。

## IterableIterator: Generator 不过是 IterableItreator 的实现罢了

我们定义 IterableIterator 接口

```ts
interface IterableIterator<T> extends Iterator<T> {
  [Symbole.iterator](): IterableIterator<T>
}
```

我们这次尝试实现 IterableIterator

```ts
class GetNext3 implements IterableIterator<number> {
  private i = 42
  public next(): IteratorResult<number> {
    if (this.i < 48) {
      return {
        done: false,
        value: this.i++,
      }
    } else {
      return {
        done: true,
        value: undefined,
      }
    }
  }
  [Symbol.iterator](): IterableIterator<number> {
    return this
  }
}

for (const x of new GetNext3()) {
  console.log("GetNext3:", x)
}

for (
  let obj = new GetNext3(), result = obj.next();
  !result.done;
  result = obj.next()
) {
  console.log("result3.1:", result.value)
}
```

读到这里你会说，谁会写这种代码啊，看着好难懂，规范的作者早就帮你想好了，为 IterableIterator 提供了简化的实现方式： Generator

```ts
function \*GetNext4(i=42): IterableIterator<number>{
while(i<48){
yield i++;
}
}
for(const x of GetNext4()){
console.log('GetNext4:',x);
}
for(let gen=GetNext4(),x=gen.next();!x.done;x = gen.next()){
console.log('GetNext4.1', x);
}
```

让我回顾一下之前的定义的一些类型

- IteratorResult: 为 value 类型， 约定了返回值类型
- Iterator： 为 Getter 类型，提供了统一的 for 循环遍历方式
- Iterable: 为 Getter -> Getter 类型： 提供了 for 循环遍历的简化方式，支持 for of 操作
- IterableIterator : 为 Getter -> Getter 类型: 同时支持 Iterator 和 Iterable 两种遍历方式，
- Generator: 提供了简化实现 Iterablleterator 的方式,函数返回类型为 IterableIterator 类型,实际上给 getter getter 添加约束的方式并不只有这一种， 不同的约束方式实际会构造出不同抽象原语，下篇会继续讨论其他的约束方式

* Obsevable： 给 setter setter 加一点约束吧
  我们发现我们给 getter getter 加了一点约束之后，就展现了巨大的作用，那么如果我们考虑给 setter setter 加一点约束，会有什么作用吗。

回顾一下之前的例子

```ts
function triggerCb(cb) {
  // producer
  cb(10)
}
function printResult(result) {
  // consumer
  logger.info(result)
}
triggerCb(printResult)
```

我们发现假如我们的 triggerCb 的实现不加以限制，其行为就会很难预料

调用次数无法控制：如果 cb 不是幂等的 effect，如果多次调用会影响业务，如转账操作，也有可能不调用导致后续流程无法继续进行

```ts
function triggerCb(cb) {
  cb(10)
  cb(10)
  cb(10)
}
同步异步行为难以预料
let a = 10
function mutateA() {
  a++
}
function triggerCbSync(cb) {
  cb()
}
function triggerCbAsync(cb) {
  cb()
}
triggerCbSync(cb) // 同步调用当前修改对当前栈立即可见
console.log("a:", a)
triggerCbAsync(cb) // 异步调用当前修改对当前栈不可见
console.log("a:", a)
```

当写业务时，我们当然不期望使用他人的提供的 sdk 时，还需要去阅读别人的代码，当时假如别人给我提供这个 triggerCb 的 sdk 时，我假如无法保证上述行为的确定性，又怎么敢安心去使用呢。

所以最佳的方式是，给 setter-setter 也加点约束吧。

我们现在将上述的函数换个名字

```ts
// before
function triggerCb(cb){ // producer
  cb(10);
}
function printResult(result){ // consumer
  logger.info(result);
}
triggerCb(printResult) // 触发 producer 生产，同时 producer 调用 consumer
// after
function observable(observer){ // producer
  observer();
}
function observer(result){ // consumer
  logger.info(result);
}
observable(observer) // pro
// 换成方法看看

const obj = new Observable(observer){ // producer
  observer.next(10);
}
const observer = { // consumer
    next(result){
      console.log('result:',result);
    }
}
obj.subscribe(observer) // producer 调用 consumer
```

至此我们发现原来 Observable 就是 setter setter 而已，只是多加了些功能的限制

- 增加了 complete 和 error 这两个 setter
- next 的可以进行多次调用（不保证单词调用）
- complete|error 和 next 存在约束关系，如 complete|error 之后，不会再次调用 next
- 增加了 unsubscribe
- produce 的生产是 lazy 的，只有 consumer 订阅 producer 的时候才会触发 producer 生产数据

实际上 Observable 是对 setter setter 的一种限制，当我们对 setter setter 加上不同的限制，会得到不同的抽象。如 Promise 对 setter setter 的限制却是另外一种景象,next 只允许执行一次，即 next 本身也意味着 complete ,then 回调执行是异步的,produce 的生产是 eager，生成 promise 对象时就开始进行生产数据，完成数据生产则异步触发 consumer

实际上 setter setter 的限制远不止这些，基于不同的限制我们可能进一步派生出更多的抽象原语，这就放到下篇说吧
