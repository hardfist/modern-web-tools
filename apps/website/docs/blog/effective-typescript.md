---
title: "Effective Typescript"
date: "2020-01-29"
---
## Typescript 入门
### 理解Typescript与Javascript区别
### Typescript编译选项影响类型检查(建议开启strict)
### 代码生成与类型检查是独立的
* 类型报错也不影响代码生成
* 运行时不进行类型检查
* 类型断言不影响运行时类型
* 运行是类型和定义的类型可能不一致
```ts
function setLightSwitch(value:boolean){
  switch(value){
    case true: 
       turnOn();
       break;
    case false: 
       turnOff();
       break;
    default: 
        console.log('dead code')
  }
}
```
上述代码的default条件在TS里会被标记为`dead code`,但在运行时仍然可能执行，如`setLightSwitch('boom')`,所以
代码里不能完全依赖于类型检查，必要时还是需要进行防御性编程
* 不支持静态重载
如不支持如下静态重载
```ts
function add(a:number,b:number): number { 
  return a + b;
}
function add(a:string,b:string): string{
  return a + b + '!'
}
```
只能支持函数签名加函数实现的方式重载
```ts
function add(a:number,b:number):number;
function add(a:string,b:string):string;
function add(a:any,b:any){
  if(typeof a === 'string'){
    return a + b + '!'
  }else{
    return a + b
  }
}
```
* Typescript的类型声明不影响运行时性能

### 习惯结构化类型(Structual Typing)
下述代码，即使vector3D不是vector2D的子类，仍然不会报错，
因为Typescript不是通过继承来实现子类型，而是通过structual typing来实现子类型，
即虽然vector3D不是vector2D的子类但是是其子类型。
```ts
class vector2D{
  constructor(public x:number, public y: number){
    this.x = x;
    this.y = y;
  }
}
class vector3D{
  constructor(public x:number,public y:number,public z:number){
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
function calculateLength(v:vector2D){
  return Math.sqrt(v.x*v.x + v.y*v.y)
}
const point = new vector3D(0,1,2)
const dist = calculateLength(point) 
```
### 限制any的使用
* any相当于放弃了类型检测
* any破坏了自动补全
* any对重构代码不友好
* any掩盖了你的类型设计
* 尽你所能避免any
### Typescript的类型系统
* 充分使用编辑器的language service功能（类型提示，类型检查，类型推倒，自动补全，类型定义跳转)
* 把类型当做值的集合思考
```ts
type A= 'A' // 单值集合 { 'A' }
type B= 'B' // 单值集合 { 'B' }
type AB = 'A' | 'B'  // 集合的并集 { 'A', 'B' }
type twoInt =  2 | 4 | 5 ... // 无限元素集合 { 1,2,3,4}
type threeInt = 3 | 6 | 9 // 无限集合
type twoIntersectThreeInt = twoInt & threeInt // 无限集合的交集
type twoUnionThreeInt = 2| 3 | 4 | 6 ... // 无限集合的并集
keyof (A&B) = (keyof A) | (keyof B)
keyof (A|B) = (keyof A) & (keyof B)
```
* 术语和集合术语对照表

| Typescript术语 | 集合术语|
| --- | --- |
| never | 空集|
| literal type | 单值集合 |
| value 可赋值给 T| value ∈T |
| T1 assignable to T2 | T1是T2的子集 |
| T1 extends T2 | T1是T2的子集 | 
| T1 | T2 | T1和T2的并集 | 
| T1 & T2 | T1 和T2的交集 |
| unknown| universal set |



### 区分类型空间(type space)还是值空间(value space)
* TS中的一个符号可以属于`Type space`或者 `value Space`，也可以同时属于`type space`和`value space`
* `class`和`enum`同时属于`type space`和`value space`
如下的左边的`Cylinder`是实例的类型，而右边的`Cylinder`是construtor
```ts
class Cylinder {
  radius = 1;
  height = 1
}
const instance: Cylinder = new Cylinder();
```

并且`typeof Cylinder`并非是`Cylinder`类型，而`InstanceType<typeof Cylinder>`才是`Cylinder`类型
这里着重说一下class，class实际上是两类对象的合体,一类是作为构造函数及其原型属性一类是类对象本身
考察如下的class
```ts
class Test {
  constructor(x:number){
    this.instanceMember = x;
  }
  static staticMember = 1;
  instanceMember = 2;
  static staticMethod1(){

  }
  static staticMethod2(){
    this.staticMethod1();
  }
  instanceMethod1(){

  }
  instanceMethod2(){
    this.instanceMethod1()
  }
}
```
实际上可以将Test拆分为两部分
```ts
class Test {
   instanceMember = 1;
   instanceMethod1(){

   }
   instanceMethod2(){

   }
}

object Test {
  new(x:number): Test{

  }
  staticMethod1(){

  }
  staticMethod2(){

  }
  staticMember = 1
}
```
这里的`object Test`在scala中被称为伴生对象,而这里的`class Test`实际是用来生成实例对象的
伴生对象和实例对象通过构造函数关联
我们可以从伴生类型中获取实例类型，也可以从实例类型获取伴生类型
```ts
const test = new Test()
type instanceType = typeof test; // 获取实例对象的类型即这里class Test定义的类型
type companionType = typeof Test // 获取伴生对象的类型即这里的object Test定义的类型
type c = InstanceType<companionType> // 根据伴生类型推倒实例类型
```
虽然可以通过实例的__proto__来获取伴生对象但是Typescript并没有提供支持


* 还有很多东西在两个spaces下有不同的意义
  * `const`在`value space`修饰变量时表示变量不能重新赋值,而`as const`修饰则修改字面量的类型推导
  * `extends` 可以用来定义继承关系(`class A extends B`)或者定义子类型(`interface A extends B`)或者定义泛型约束`Generic<T extends number>`
  * `in`可用于检测属性存在`key in object`也可以用于mapped type(`{[key in keyof T]:string}`)


### 优先使用类型声明而非类型断言
### 避免使用装箱类型(String, Number, Boolean, Symbol, BigInt)
```ts
const a = new String('ss');
const b: string = a; // String无法赋值给string
const c:String = '123' // string可以赋值给String
```

### 多余属性检查(Excess Property Checking)的局限
当将对象字面量赋值给变量时会触发额外的属性检查，以保证没有传入多余的属性
```ts
interface Point {
  x: number;
  y: number;
}
const point : Point = {
  x:1,
  y:2,
  z:3 // 报错，多余的属性
}
```
这个按照strutual typing的设计是不合理的，有几种绕过Excess Property Checking方式
这里是Typescript对对象字面量额外添加的检查，
* 引入临时变量
```ts
interface Point {
  x: number;
  y: number;
}
const tmp = {
  x:1,
  y:2,
  z:3 
}
const point:Point= tmp; // 不报错
```
* 类型断言
```ts
interface Point {
  x: number;
  y: number;
}
const point : Point = {
  x:1,
  y:2,
  z:3 
} as Point
```
### 尽可能对整个函数表达式进行类型标注
* 提取出公共的函数类型
```ts
function add(a:number,b:number){
  return a+b;
}
function sub(a:number,b:number){
  return a-b;
}
function mult(a:number,b:number){
  return a*b;
}
function div(a:number,b:number){
  return a/b;
}
```
提取出公共的函数类型，可简化如下
```ts
type Binary = (a:number,b:number) =>number;
const add : Binary = (a,b) => a+b;
const sub: Binary = (a,b) => a-b;
const mult: Binary = (a,b) => a*b;
const div: Binary= (a,b) => a-b;
```
* 使用`typeof fn`来标注增强的函数类型
```ts
const checked: typeof fetch = (...args) => {
  return fetch(...args).then(resp=> {
    if(!resp.ok){
      throw new Error('failed')
    }
  })
}
checked('/api') // 可以继续获取类型检查
```

### 了解type和interface的区别
* 绝大部分情况下，type和interface都能等价转换
```ts
// 普通对象
type TState = {
  name: string;
  capital: string;
}
interface TState {
  name: string;
  capital: string;
}
// index signature
type TDict = {[key:string]: string }
interface IDict {
  [key:string]: string
}
type TFn = (x:number) => string;
interface IFn {
  (x:number):string;
}
// function with props
type TFnWithProps = {
  (x:number):number;
  prop: string;
}
interface IFnWithProps {
  (x:number):number;
  prop: string;
}
//  constructor
type TConstructor = new(x:number) => {x:number}
interface IConstructor{
  new(x:number): {x:number}
}
// generic
type TPair<T>= {
  first: T;
  second: T;
}
interface IPair<T> {
  first: T;
  second: T;
}
// extends
type TStateWithProps = IState & { population : number}
interface IStateWithProp extends TState {
  population: number;
}
// implements
class StateT implements TState {
  name = '';
  capital = '';
}
class StateI implements IState {
  name='';
  capital = ''
}
```

* type和interface亦有所区别
  * inteface无法应用于union type | intersection type | conditional type | tuple
```ts
type AorB = 'A' | 'B'
type NamedVariable = (Input | Output) & { name: string}
type Pair = [number,number]
```
  * interface 可以augumented,而type不可以
```ts
// inner
interface IState {
  name :string;
  capital: string;
}
// outer
interface IState {
  population: number
} 
const wyoming: IState = {
  name: 'Wyoming',
  capital: 'Cheyenne',
  population: 500_000
}
```
### 充分利用泛型和类型运算避免冗余类型标记
* 使用泛型提取公共的util type，简化类型编写
```ts
interface ButtonProps {
  type: string;
  size: 'large' | 'middle'| 'small'
}
interface ButtonPropsWithChildren{
  type: string;
  size: 'large' | 'middle'| 'small',
  children: React.ReactNode
}
```
使用PropsWithChildren简化
```ts
import { PropsWithChildren } from 'react';
type ButtonPropsWithChildren = PropsWithChildren<ButtonProps>
```

* 使用index type | mapped type | keyof 等进行类型传递
```ts
interface State {
  userId: string;
  pageTitle: string;
  recentFiles: string[]
  pageContents: string;
}
interface TopNavState {
  userId: string;
  pageTitle: string;
  recentFiles: string[]
}
```
上述代码可通过lookup type简化
```ts
interface TopNavState = {
  userId: State['userId'];
  pageTitle: State['pageTitle']
  recentFiles: State['recentFiles']
}
```
使用mapped type 可进一步简化
```ts
type TopNavState = {
  [k in 'userId' | 'pageTitle' | 'recentFiles'] : State[k]
}
```
再使用工具类进一步简化
```ts
type TopNavState = Pick<State, 'userId', 'pageTitle', 'rencentFiles'>
```

我们也可以利用typeof来进行类型传递
```ts
function getUserInfo(userId:string){
  return {
    userId,
    name,
    age,
    height,
    weight,
    favoriteColor
  }
}
type UserInfo = ReturnType<typeof getUserInfo>
```
* 编写`utility type`时，多多使用`generic constraint`保证实例化时的类型安全
```ts
interface Name {
  first: string;
  last: string
}
type Pick1<T, K>{
  [k in K]: T[k]
}
type FirstLast = Pick1<Name, 'first'| 'last'>
type FirstMiddle = Pick1<Name, 'first', 'middle'> // 应该报错但没报错
type Pick2<T, K extends keyof T> = { // 添加泛型约束
  [k in K]: T[K]
}
type FirstMiddle = Pick2<Name, 'first', 'middle'> // 正确的报错了
```

### 使用Index signature来表示动态数据
* 对于只有在运行期才能获取的属性，可以通过index signature来建模，如从csv或者远程加载数据
```ts
function parseCSV(input:string): {[columnName:string]: string}[]{
  // xxx
}
```
可以通过Record简化
```ts
function parseCSV(input:string): Record<string,string>[]
```
* 对于动态数据，其属性的值的类型应添加undefined类型，确保安全访问
```ts
function safeParseCSV(input:string): Record<string,string|undefined>[]
const result =safeParseCSV('input')
for(const x of result){
  console.log(x.name?.toUpperCase()) // 应该使用optiona chain访问，防止属性不存在
}
```
* 尽可能对index signatures 进行细化以保证类型安全
```ts
interface Row1 { [column:string]: number} // 太宽泛了,允许访问不应该允许的属性了
interface Row2 { a:number, b?:number, c?:number, d?:number} // 不允许访问不存在的属性了
interface Row3 = | {a:number} | { a: number; b:number } | {a:number;b:number;c:number} | {a: number; b: number; c:number; d:number} 
// 更细化了，不允许{ a:1, c: 2}这种不允许的对象
```
### 优先使用 Arrays、Tuple、ArrayLike而非number index signatures
* 数组实际上是对象，其keys也是string而非number，Typescript里使用number index signature是为了进行更多的类型检查
即使如下代码x[0]和x['0']的行为在运行时完全一致，但是只有x[0]才能正确的推倒出类型。
```ts
let a : string[] = []
let x = a[0] // x类型为string
let y = a['0'] // 但是y类型为any
```
### 使用readonly来避免mutation造成的错误
* 声明参数为readonly来避免在函数实现里修改参数
如下所示，当声明一个函数的参数为readonly时
* Typescript会检查函数实现里是否对参数进行了修改
* 调用者可以确保实现没有修改参数
* 调用者可以传递一个readonly 的数组
```ts
function arraySum(arr:readonly number[] ){
  let sum=0,num = 0;
  // check error
  while((num = arr.pop()) !== undefined){
    sum += num;
  }
  return sum;
}
```
如果一个函数没有声明一个函数参数为readonly,那么将无法传递一个readonly的数组,
即使函数实现没有修改参数

```ts
function arraySum2(arr: number[]) {
  
}
const arr: readonly number[] = [];
arraySum2(arr)
```
所以为了保证函数可以同时接受readonly和非readonly的数组，应尽量声明参数为readonly(这里和c++的const reference 和reference的限制很类似)

* 区别`const` 和`readonly`
 * const 用于修饰变量，表示变量不可重新赋值
 * readonly用于修饰值，表示值的不可变(虽然在Typescript只能限制最外一层)

### 使用Mapped Type来实现值和类型的同步
假如有一天你实现了一个组件，并且实现了shouldComponentUpdate来进行性能优化
```tsx
class App extends React.Component<{
  x: number,
  y: number
}> {
  shouldComponentUpdate(props){
    return props.x !== this.props.x  || props.y !== this.props.y
  }
}
```
突然有一天你的组件添加了个新的z props,虽然你扩展了你的props类型，但是你忘记修改了
shouldComponentUpdate，导致组件该重新渲染的时候没重新渲染,此时Typescript并不会
帮你做检查
```ts
type AppProps = {
  x: number,
  y: number,
  z: number,
  onClick: () => {} // 不需要检查它
}
class App extends React.Component<
AppProps> {
  shouldComponentUpdate(props){
    return props.x !== this.props.x  || props.y !== this.props.y
  }
}
```
通过Mapped Type我们可以建立这种检查,下面的`[k in keyof AppProps]`保证了
每次添加新的属性，都需要在REQUIRED_UPDATE进行添加
```ts
{
  x: number,
  y: number,
  z: number,
  onClick: () => {} // 不需要检查它
}

const REQUIRED_UPDATE: {[k in keyof AppProps]: boolean} = {
  x: true,
  y: true,
  z: true
  onClick: false,
}
class App extends React.Component<AppProps> {
  shouldComponentUpdate(props){
    for(const k in this.props){
      if(this.props[k] !== props[k] && REQUIRED_UPDATE[k]){
        return true;
      }
    }
    return false;
    
  }
}
```

## 类型推导
### 避免滥用类型推导
* 避免对简单可以推导的类型进行标注
```ts
const a: number = 10; // 不建议
const a = 10 // 可自行推导

const obj: {name: string, age: number} = {name:'yj', age: 20} // 不建议
const obj = { name: 'yj', age: 20} // 自动推导
```
* 对于函数尽量显示的标明返回类型，而非依赖类型推导

### 避免将一个变量重复赋值为其他类型
如下代码虽然在javascript里是合法的，但是在typescript里会报错
```ts
let id = '123456';
id = 123456; // 123456 not assignable to string
```
解决方式1: 声明类型为union
```ts
let id: string| number = '123456';
id = 123456 // works
```
虽然上述代码能通过类型检查，但更好的方式是避免使用union,
而是重新定义一个新的变量
```ts
let id= '123456';
let idInt = 123456;
```
进一步的可以将变量声明为const
```ts
const id= '123456';
let idInt = 123456;
```

### 理解 Type widening
当你使用一个常量初始化一个变量并且没提供类型标注时，
typescript需要为你的变量确定一个类型，这个过程就叫widening
考虑如下代码
```ts
const mixed = ['x', 1]
```
上述代码中的mixed的应该被推导为什么类型
* ('x'|1)[]
* ['x',1]
* [string,number]
* readonly [string,number]
* (string|number) []
* readonly (string|number)[]
* [any,any]
* any[]
上述答案似乎都合理，事实上Typescript只能根据你的使用情况
进行猜测推导，并不能完全满足你的需求。
```ts
const mixed = ['x',1]
//使用方式1
mixed.push(1) //(string|number)[] 更为合理
//使用方式二
function test(a:string,b:number){
}
test(...mixed) // [string,number] 更为合理
//使用方式三
function test2(a:'x',b:1){
}
test2(...mixed) // ['x',1] 更合理
```
我们发现不同的使用场景需要的类型是不同的，事实上Typescript只能根据
大部分使用场景进行类型推断
#### literal widening
当发生literal widening 时，'foo'，1,ColorEnum.RED等unit type会被视为其base type即string,number,
ColorEnum
触发literal widening的条件为
* mutable location会触发（如let)
```ts
let x = 3 // widening,类型为number
const x = 3 // 不触发weidening,类型为3
```
对于primitive type，const能够控制其不会触发widening，但是
对于object和array这些复合对象，const并不能控制属性的widening
```ts
const obj = {
  name: 'yj'
} // 推导类型为 { name: string}

const arr = [1,'x'] // 推导类型为(string|number)[]
```
上述类型推导大部分情况下是合理的
```ts
const obj = {
  name
}
obj.name = 'zrj' // 后续修改props

const arr = [1,'x']
arr.push(3) 
```
但有时候我们需要进一步的控制属性的widening，此时有两种方式
* 显示的类型标注
```ts
const arr1: [1,'x'] = [1,'x'] // 类型为[1,'x']
arr[0] = 2; // check error

const arr: readonly [number, string] = [1, 'x']

arr.push(3); // check error
```
* `as const `
```ts
const arr = [1,'x'] as const
arr.push(3) // check error
```
### 理解Type Narrowing
type narrowing与type widening相反，其负责收窄类型
* 对于大部分类型使用内置的类型收窄即可，支持的类型收窄操作包括
  * Array.isArray
  * instanceof
  * key in object
  * typeof 
  * falsy 判断

* 对于更加复杂的对象则需要使用自定义类型收窄和tagged union来支持类型收窄
  * tagged union 
```ts
interface Point {
  type: 'point',
  x: number,
  y: number
}
interface Radius{
  type: 'radius',
  r: number
}
function distance(p: Point | Radius){
  if(p.type === 'point'){
    return Math.sqrt(p.x*p.x + p.y*p.y)
  }else {
    return p.r
  }
}
```
对于更加的复杂的类型，可以使用自定义类型判断
```ts
function isInputElement(el: HTMLElement): el is HTMLInputElement {
  return 'value' in el;
}
function getElementContent(el: HTMLElement){
  if(isInputElement(el)){
    return el.value // el 为HTMLInputElement类型
  }else {
    return el.textContent // el为HTMLElement类型
  }
}
```

### 一次性的定义好对象
考虑如下代码,虽然是合法的js代码，但是TS仍然会报错
```ts
const pt = {}
pt.x = 3; // check error 
pt.y = 4
```
这是因为pt定义是类型被推导为{}
正确的做法应该是
```
const pt = {x :3, y: 4}
```
如果需要通过一系列对象构造出新对象，应尽量使用spread 操作，
可以保证生成的对象类型安全
```ts
const pt =  { x:3,y:4}
const id = {name: 'point'}
const namedpoint = {}
Object.assign(namedpoint, pt, id)
namedpt.name // check error 
```
正确的做法应该是
```ts
const pt = { x:3, y: 4}
const id = { name: 'point'}
const namedpoint = {...pt, ...id}
namedpoint.name // 正常
```
如果是需要合并部分属性,则需要配合Partial使用
```ts
const pt = { x:3, y: 4}
const id = { name: 'point'}
function merge<T extends object, U extends object>(x: T, y: U): T & Partial<U>  {
  return {...x,...y}
}
const p = merge(pt, id)
p.name // 类型为string | undefined
```
### 使用alias时保持一致
当对变量进行narrowing时，并不会同步的对其alias进行narrowing
```ts
interface Test {
  name?: string;
}
const obj: Test = {}
const name = obj.name
if (obj.name) {
  obj.name.toLowerCase(); // ok
  name.toLowerCase(); // check error
}
```
虽然这里的name和obj.name是一致的但是，name并不受obj.name影响，
因此当使用alias和narrow时得注意保持一致

### 异步处理时使用async函数替换callback
### 充分利用函数库(如lodash)来简化代码里的类型处理，和避免显式的类型标注

## 类型设计
### 避免同时使用多个变量来建模状态，而是使用单一变量来区分不同的状态
考虑下面的组件
```tsx
const App = () =>  {
  const [content,setContent] = useState('')
  const [loading, setLoading] =useState(false);
  const [error, setError] = useState(null);
  function load(){
    setLoading(true);
    try {
      const resp = await fetch(getUrlForPage());
      if(!resp.ok){
        throw new Error('unable to load')
      }
      const text = await resp.text();
      setLoading(false);
      setContent(text);
    }catch(e){
      setError(e);
    }
  }
 
  if(error){
      return 'Error';
    }else if(loading){
      return 'loading'
    }
    return <h1>{content}</h1>
  }
}
```
上面的代码明显存在一些问题
* 请求失败时忘记重置loading状态
* 忘记情况error状态
* 重新拉接口时，状态容易错乱

由于Error, Loading,Content等状态实际上是互斥的，因此可以用一个变量通过tagged union来建模状态
重构代码如下
```tsx
interface RequestPending {
  state: 'pending'
}
interface RequestError {
  state: 'error',
  error: string;
}
interface RequestSuccess {
  state: 'ok',
  content: string;
}
type RequestState = RequestError | RequestPending | RequestSuccess

const App = () =>  {
  const [state, setState] = useState<RequestState>({
    state: 'ok',
    content: ''
  })
  function load(){
    setState({
      state: 'pending'
    })
    try {
      const resp = await fetch(getUrlForPage());
      if(!resp.ok){
        throw new Error('unable to load')
      }
      const text = await resp.text();
      setState({
        state: 'ok',
        content: text
      })
    }catch(error){
      setState({
        state: 'error',
        error
      })
    }
  }
  switch(state.type){
    case 'pending':
        return 'pending',
    case 'error':
        return state.error
    case 'ok':
        return <h1>{state.content}</h1>
  }
}
```
此时就完全避免了上面存在的几个问题，而且后续每次增加新的状态
Typescript都可以帮我们进行类型检查

### 对入参款宽松对出参严格
### 不要在jsdoc里记录类型信息
```ts
/**
 * Return a string with the backgroudColor
 * 
*/
function getBackgroundColor(){
  // return 'red' // 老代码
  return (255,255,255); // 重构后的代码
}
```
重构时会忘记更改文档里的类型信息，导致不一致，对于量纲的信息，
由于难以使用类型进行标记，所以可以在文档里标注
```ts
/**
 * duration: timeMs 表示ms
 *
*/
function sleep(duration: number){

}
```
### 尽量减小null|undefined的影响区域（尽量开启strictNullCheck检查)
考虑下面代码，实现了一个确定数组范围的函数
```ts
function extent(nums: number[]) {
  let min, max;
  for (const num of nums) {
    if (!min) {
      min = num;
      max = num;
    } else {
      min = Math.min(min, num);
      max = Math.max(max, num);
    }
  }
  return [min, max];
}
```
上述代码存在一些问题
* 如果数组里含有0，0会被排查出区间范围(if(!min)的判断导致 0 | null | undefined都被排除，但是0
的排除非我们本意)
* 如果数组为空，结果为[undefined,undefined]
当开启了strictNullCheck下上述代码会报错
```ts
function extent(nums: number[]) {
  let min, max;
  for (const num of nums) {
    if (!min) {
      min = num;
      max = num;
    } else {
      min = Math.min(min, num);// number|undefined is not assignable to 'number'
      max = Math.max(max, num);
    }
  }
  return [min, max];
}
```
重构上述代码如下
```ts
function extent(nums:number[]){
  let result: [number,number] | null = null;
  for(const num of nums){
    if(!result){
      result = [num, num]
    }else {
      result = [Math.min(num,result[0]), Math.max(num,result[1])]
    }
  }
  return result;
}
```
上述代码解决了之前的问题，其最大的区别在于，保证了循环里的
result[0]和result[1]都不含有undefined|null，防止其影响了
正常的代码判断

### 优先使用 union of interface而非 interfaces of unions
考虑下述类型定义
```ts
interface Layer {
  layout: FillLayout | LineLayout | PointLayout;
  paint: FillPaint | LinePaint | PointPaint
}
```
这样设计的类型很难关联layout和对应的paint,重构如下
```ts
interface FillLayer {
  type: 'fill',
  layout: FillLayout,
  paint: FillPaint
}
interface LineLayer {
  type: 'line',
  layout: LineLayout,
  paint: LinePaint
}
interface PointLayer {
  type: 'paint',
  layout: PointLayout,
  paint: PointPaint
}

type Layer = FillLayer | LineLayer |PointLayer
```
这实际上就是tagged union,可以通过type进行narrowing操作
```ts
function drawLayer(layer: Layer) {
  if (layer.type === 'fill') {
    const {paint} = layer;  // Type is FillPaint
    const {layout} = layer;  // Type is FillLayout
  } else if (layer.type === 'line') {
    const {paint} = layer;  // Type is LinePaint
    const {layout} = layer;  // Type is LineLayout
  } else {
    const {paint} = layer;  // Type is PointPaint
    const {layout} = layer;  // Type is PointLayout
  }
}
```
### 使用更细化的string类型，优先考虑使用string literal union
### 相比不准确的类型考虑使用不完备的类型
### 使用brands来模拟nominal typing
考虑下面的case，Point是使用直角坐标表示的点，
而RadiusPoint则是使用极坐标表示的点
```ts
interface Point {
  x: number,
  y: number
}
interface RadiusPoint{
  x: number // radius
  y: number // theta
}
function PointDistance(p:Point){
  return Math.sqrt(p.x**2 + p.y**2)
}
let p1: Point;
let p2: RadiusPoint

PointDistance(p1);
PointDistance(p2); // 应该报错但不报错
```
虽然这里的PointDistance要求类型是Point，但由于是Typescript使用的是structual typing,导致
实际上可以将RadiusPoint类型的变量也可以传递进去，导致计算错误
我们可以通过添加一个brand标记区分两者
```ts
interface Point {
  _brand: 'point',
  x: number,
  y: number
}
interface RadiusPoint{
  _brand: 'radius',
  x: number // radius
  y: number // theta
}
function PointDistance(p:Point){
  return Math.sqrt(p.x**2 + p.y**2)
}

PointDistance(p1);
PointDistance(p2); // 正常报错
```
## 处理any
### 缩小any的影响范围
```ts
function f1(){
  const x: any = expressionReturningFoo(); // 不建议,后续的x都是any了
  processBar(x)
}

function f2(){
  const x = expressionReturningFoo();
  processBar(x as any) // 建议，只有这里是any
}
```
### 使用更细化的any
```ts
function getLengthBad(arr:any){
  return array.length; // 不推荐
}
function getLength(array:any[]){
  return array.length //推荐
}

const numArgsBad = (...args:any) => args.length //Return any 不推荐
const numArgs = (...args: any[]) => args.length // Return number 推荐
```
### 函数签名和实现想分离：安全的签名不安全的实现
有时候不使用any想编写一个完全类型安全的实现并非易事，但是一般对于使用者
并不关心内部的实现是否安全，只关心对外暴露的签名是否安全，此时我们可以将函数签名和
函数实现相分离，以简化内部的类型实现。这个技巧充分利用了当使用重载时，只有函数签名对外可见，
而函数实现对外不可见
use-immer里即使用了该技巧
```ts
// 类型安全的签名
export function useImmer<S = any>(
  initialValue: S | (() => S)
): [S, (f: (draft: Draft<S>) => void | S) => void];
// 没那么安全的实现
export function useImmer(initialValue: any) {
  const [val, updateValue] = useState(initialValue);
  return [
    val,
    useCallback(updater => {
      updateValue(produce(updater));
    }, [])
  ];
}
```
### 理解进化的any
Typescript中的any并不是一成不变的，会随着用户的操作，Typescript会猜测更加合理的类型
```ts
const output = [] // any[]
output.push(1) 
output // number[]
output.push('2')
output // (number|string)[]
```
### 优先使用unknown而非any
考虑下述代码
```ts
function parseYAML(yaml:string):any{

}

const book = parseYAML(`
name: effective typescript
author:yj
`)
console.log(book.title) // no error
book('read') // no error
```
我们发现上述代码在该报错的地方并没有报错，
更加安全的是使用unknown和配合自定义type guide
```ts
function parseYAML(yaml:string):unknown{

}

const book = parseYAML(`name: effective typescript author:yj`)
console.log(book.title) // 报错 
book('read') // 报错
interface Book {
  name: string;
  author: string;
}
function isBook(val:unknown): val is Book {
  return (
    typeof val === 'object' && val !== null && 'name' in val && 'author' in val
  )
}
if(isBook(booke)){
  console.log(book.title)
}
```
同时需要区分{}和object和unknown
* {}: 包含除了null和undefined之外的所有值
* object: 包含了所有的非primitive类型，即不包含12,'test'等基本类型
在引入unknown之前，多使用{},在引入unknown之后，基本上不需要再使用{}类型

### 使用type-coverage测试type的覆盖率
## type声明和@types
### 将@types的依赖放在devDependencies里
### 将公用API里使用的类型也一并导出
### 使用TSDOC去注释导出的函数，class，types
### 为callback提供this的类型
考虑下面函数
```ts
class C {
  vals = [1, 2, 3];
  logSquares() {
    for (const val of this.vals) {
      console.log(val * val);
    }
  }
}

const c = new C();
c.logSquares();
const c2 = new C();
const method = c.logSquares;
method(); // check ok, 但是运行时报错
```
上面的method函数调用Typescript并未检查到其错误使用，导致其在运行时报错，
我们可以为logSquares提供this的类型杜绝错误的使用
```ts
class C {
  vals = [1, 2, 3];
  logSquares(this: C) { // 显示表明要求的this类型
    for (const val of this.vals) {
      console.log(val * val);
    }
  }
}

const c = new C();
c.logSquares();
const c2 = new C();
const method = c.logSquares;
method(); // check ok, 但是运行时报错
```
### 尽量避免用户对@types的依赖，不要强制web用户依赖NodeJS的types

## 编写代码最佳实践
### 优先考虑使用Javascript的语言特性而非Typescript独有的语言特性
Typescript独有的一些语言特性包括
* Enums
```ts
enum Color {
  RED,
  BLUE
}
```
* Parameter Properties
```ts
class Person {
  constructor(public name: string)
}
```
*  Namespaces 和 triple-slash imports
```ts
namespace foo {
  function bar(){}
}
/// <reference path="other.ts">
foo.bar()
```
* Decorators
```ts
class Greeter {
  @logged
  greet(){
    return 'hello'
  }
}
```
### 使用Object.entries去遍历对象
```ts
interface ABC{
  a:string;
  b:string;
  c:string;
}
function foo(abc:ABC){
  for(const [k,v] of Object.entries(abc)){
    console.log(k,v)
  }
}
```

### 理解DOM的层级关系，了解Node,Element,HTMLElement,EventTarget,Event等的区别

### private在运行时并不能阻止外部用户访问
### 使用sourcemap去debug Typescript 程序