---
title: "深入React: 状态管理"
date: "2020-01-12"
---

如今的 react 的状态管理工具基本上分为 redux 和 mobx 两个流派，mobx 基本上大家都是使用官方的 mobx 库，但是对于 redux 却衍生数不胜数的 redux 框架。如`redux-saga`, `dva`, `mirror`, `rematch`等等，这么多 redux 的框架一方面说明 redux 是如此流行，另一方面也表明 redux 自身的先天不足，笔者本人也是从最初的刀耕火种时代一路走来。

## 最原始的 redux

```ts
// action_constant.js
// action_creator.js
// action.js
// reducer.js
// store.js
// 再加上一堆的middleware
```

每次改一点业务动辄就需要改四五个文件，着实令人心累，而且不同业务对 redux 文件的组织方式也不同，用的按照组件进行组织，有的按照功能进行组织，每次看新的业务都得熟悉半天，对异步的支持也基本上就使用 redux-thunk、redux-promise 等，遇到复杂的异步处理，代码十分的晦涩难懂。

## redux duck

后来社区为了避免每次修改都要修改一堆文件和制定文件规范，推出了 ducks-modular-redux 规范，将每个子 module 的文件都放置到一个文件里，这样大大简化了日常开发中一些冗余工作。

```
// widgets.js

// Actions
const LOAD   = 'my-app/widgets/LOAD';
const CREATE = 'my-app/widgets/CREATE';
const UPDATE = 'my-app/widgets/UPDATE';
const REMOVE = 'my-app/widgets/REMOVE';

// Reducer
export default function reducer(state = {}, action = {}) {
  switch (action.type) {
    // do reducer stuff
    default: return state;
  }
}

// Action Creators
export function loadWidgets() {
  return { type: LOAD };
}

export function createWidget(widget) {
  return { type: CREATE, widget };
}

export function updateWidget(widget) {
  return { type: UPDATE, widget };
}

export function removeWidget(widget) {
  return { type: REMOVE, widget };
}

// side effects, only as applicable
// e.g. thunks, epics, etc
export function getWidget () {
  return dispatch => get('/widget').then(widget => dispatch(updateWidget(widget)))
}
```

笔者的之前维护的一个老项目至今仍然采用这种方式。

## rematch | dva

duck modular proposal 虽然一定程度上减小了维护成本，但本质上并没有减小每次开发业务的代码量，异步等问题仍然没有得到解决，因此开始衍生出了一大堆的基于 redux 的框架，重点在于解决简化样板代码量和复杂异步流程的处理。
样板代码简化的思路基本上是一致的。我们发现绝大部分的业务 model 都满足如下性质

```ts
const model = createModel({
  name: // 全局的key
  state:xxx, // 业务状态
  reducers:xxx, // 同步的action
  effects:xxxx, // 异步的action
  computed: xxx // state的衍生数据
}
```

因此绝大部分框架的都采用了类似的定义，区别只在于语法和名称有所不同

- dva

```
// dva.js
export default {
  namespace: 'products',
  state: [],
  reducers: {
    'delete'(state, { payload: id }) {
      return state.filter(item => item.id !== id);
    },
  },
 effects: {
   *add(action, { call, put }) {
      yield call(delay, 1000);
      yield put({ type: 'minus' });
    }
 }
};
```

- rematch

```
export const count = {
  state: 0, // initial state
  reducers: {
    // handle state changes with pure functions
    increment(state, payload) {
      return state + payload
    }
  },
  effects: (dispatch) => ({
    // handle state changes with impure functions.
    // use async/await for async actions
    async incrementAsync(payload, rootState) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      dispatch.count.increment(payload)
    }
  })
}
```

两者的区别主要在于对异步的处理，dva 选择了用 generator，而 rematch 选择了用 async/await。
首先我们回顾一下 redux-thunk 里是如何处理异步流的

```
const fetch_data = url =>  (dispatch, getState) =>{
  dispatch({
    type: 'loading',
    payload: true
  })
  fetch(url).then((response) => {
    dispatch({
      type: 'data',
      payload: response
    })
    dispatch({
      type: 'loading',
      payload: false
    })
  }).catch((err) => {
    dispatch({
      type: 'error',
      payload: err.message
    })
    dispatch({
      type: 'loading',
      payload: false
    })
  })
}
```

一个简单的拉取数据的逻辑就显得如此繁杂，更别提如何将多个异步 action 组合起来构成更加复杂的业务逻辑了（我已经不知道咋写了）
async/await 和 generator 的最大优点在于 1. 其可以使用看似同步的方式组织异步流程 2.各个异步流程能够很容易的组合到一起。具体使用哪一个全看个人喜好了。
如上面同样的逻辑在 rematch 里的写法如下

```ts
const todo = createModel({
  effects: ({ todo }) => ({
    async fetch_data(url) {
      todo.setLoading(true)
      try {
        const response = fetch(url)
        todo.setLoading(false)
      } catch (err) {
        todo.setLoading(false)
        todo.setError(err.message)
      }
    },
    async serial_fetch_data_list(url_list) {
      const result = []
      for (const url of url_list) {
        const resp = await todo.fetch_data(url)
        result.push(resp)
      }
      return result
    },
  }),
})
```

得益于 async/await 的支持，现在无论是异步 action 本身的编写还是多个异步 action 的组合现在都不是问题了。

我们现在的绝大部分新业务，基本上都还是采用 rematch，相比之前纯 redux 的开发体验，得到了很大的改善，但是仍然不是尽善尽美，仍然存在如下一些问题。

## Typescript 支持

9102 年了，Typescript 已经大大普及，稍微上点规模的业务，Typescript 的使用已经是大势所趋，Typescript 的好处就不多赘述，我们基本上所有的业务都是使用 Typescript 进行开发，在日常开发过程中基本上碰到的最大问题就是库的支持。
俗话所说，Typescript 坑不太多（其实也多），库的坑不太多，但是 Typescript 和库结合者使用，坑就很多了。很不幸 Dva 和 Rematch 等都缺乏对 Typescript 的良好支持，对日常业务开发造成了不小的影响，笔者就曾经针对如何修复 Rematch 的类型问题，写过一篇文章https://zhuanlan.zhihu.com/p/78741920 ，但是这仍然是个 hack 的办法，dva 的 ts 支持就更差了，generator 的类型安全在 ts3.6 版本才得以充分支持（还有不少 bug），至今也没看到一个能较完美支持 ts 的 dva 例子。

## Batteries Included

redux 可以说是 Batteries Included 的标准反例了，为了保证自己的纯粹，一方面把异步处理这个脏活，全部交给了中间件，这导致搞出了一堆的第三方的异步处理方案，另一方面其不愿做更高的抽象，导致需要编写一堆的 boilerplate code 还导致了各种写法。因此对于日常的业务开发来讲，一个 Batteries Included 库就足够重要了，即保证了编码规范，也简化了业务方的使用。
Computed State 和 immutable 就是日常开发中非常重要的 feature，但是 rematch 把两个功能都交给插件去完成，导致日常使用不够方便和第三方插件的 TS 支持也不尽如人意。

## 仅支持对 redux 状态的管理

如今 react 的状态和业务逻辑基本上存在于三种形态

- redux： 存放业务领域的状态，同时存放一些业务更新逻辑
- context: 主要存放一些全局配置的信息，较少变动或者不变如，主题、语言等信息
- local: 多存放 UI 相关的状态，如模态框的展示状态，loading 状态等等。在 class 组件里存放于 this.state 中，在 hook 组件中存放于 useState 里
  rematch 对 redux 的状态管理方式基本上做到了最简，但是其仅仅只能用于 redux 状态的管理，对于 local state 的管理却无可奈何。

### local state 的管理

对于大部分的简单业务，local state 的管理并不麻烦，基本上就是控制一些弹窗的展示，loading 的展示，在用 class 组件来控制业务逻辑时，处理方式也较为简单

```
class App extends React.Component {
  state = {
    loading: false,
    data: null,
    err: null
  }
  async componentDidMount() {
    this.setState({loading: true})
    try {
      const result = await service.fetch_data()
      this.setState({
        loading:false
      })
    }catch(err){
      this.setState({loading: false, error: err.message})
    }
  }
  render(){
    if(this.state.loading){
      return <div>loading....</div>
    }else{
      return <div>{this.sstate.data}</div>
    }
  }
}
```

这里的组件其实同时扮演了三个角色

- 状态容器

```
state = {
    loading: false,
    data: null,
    err: null
  }
```

- 状态处理

```
async componentDidMount() {
    this.setState({loading: true})
    try {
      const result = await service.fetch_data()
      this.setState({
        loading:false
      })
    }catch(err){
      this.setState({loading: false, error: err.message})
    }
  }
```

- view

```
render(){
    if(this.state.loading){
      return <div>loading....</div>
    }else{
      return <div>{this.sstate.data}</div>
    }
  }
```

这种做法有利有弊，好处在于其足够的 locality,因为状态，状态处理，渲染这几部分是紧密关联的，将它们放在一起，阅读代码的看到这段代码，很自然的就能看懂
但是一个组件放置了太多的功能就导致其复用很困难。
因此衍生出了不同的复用方式

### 容器组件和视图组件分离：视图复用

第一种复用方式就是通过状态容器组件和视图组件将状态&&状态处理与 view 的逻辑进行分离，
容器组件只负责处理状态&&状态处理，视图组件只负责展示的逻辑，这样做法的最大好处在于视图组件的复用极为方便。
UI 组件库可谓是这方面的极致了，我们将一些常用视图组件提取出来构成组件库，大部分的 UI 组件，没有状态，或者一些非受控的组件有一些内部状态。这种组件库极大的简化了日常的 UI 开发。上面的组件可以重构如下

```
// 视图组件
class Loading extends React.Component {
  render(){
    if(this.props.loading){
      return <div>loading....</div>
    }else{
      return <div>{this.props.data}</div>
    }
  }
}
// 容器组件
class LoadingContainer extends React.Component {
  state = {
    loading: false,
    data: null,
    err: null
  }
  async componentDidMount() {
    this.setState({loading: true})
    try {
      const result = await service.fetch_data()
      this.setState({
        loading:false
      })
    }catch(err){
      this.setState({loading: false, error: err.message})
    }
  }
  render(){
     return <Loading {...this.state} /> // 渲染逻辑交给视图组件
  }
}
// app.js
<LoadingContainer>
```

### HOC && renderProps && Hooks: 业务复用

视图组件的复用非常方便，但是容器组件的复用就没那么简单了。社区中衍生出了 HOC 和 renderProps 来解决状态&&状态操作的复用

- HOC

```
// Loading.js
class Loading extends React.Component {
  render(){
    if(this.props.loading){
      return <div>loading....</div>
    }else{
      return <div>{this.props.data}</div>
    }
  }
}
export default withLoading(Loading);

// app.js
<Loading />
```

- renderProps

```
<WithLoading>
  {(props) => {
    <Loading {...props} />
  }}
</WithLoading>
```

这两种方式都存在一定的问题
对于高阶组件，存在很多需要注意的地方，如https://zh-hans.reactjs.org/docs/higher-order-components.html#caveats ，带来不小的心智负担，对于新手并不友好，另一个问题在于 HOC 对于 Typescript 的支持并不友好，实现一个 TS 友好的 HOC 组件有相当大的难度可参考https://www.zhihu.com/question/279911703/answer/410372076，在日常使用第三方的支持高阶组件库也经常会碰到各种TS的问题。
而 renderProps 虽然一定程度上拜托了 HOC 存在的问题，但是其会造成 render props callback hell,当我们需要同时使用多个 renderprops 的时候,就会编写出如下代码
![image](https://user-images.githubusercontent.com/8898718/65375044-80d9c680-dcc3-11e9-8acd-ee3c983cc36f.png)
这种代码无论是对代码的阅读者，还是调试 element 结构的时候，都会带来不小的影响。

- Hooks
  官方为了解决状态复用的问题，推出了 react hooks，且解决了 renderProps 和 HOC 带来的问题，上面组件用 hooks 重写如下

```
// hooks.js
function useLoading(){
  const [loading, setLoading] = useState(false);
  const [ error, setError] = useState(null);
  const [ data,setData] = useState(null);
  useEffect(() => {
    setLoading(true);
    fetch_data().then(resp => {
      setLoading(false);
      setData(resp);
    }).catch(err => {
      setLoading(false);
      setError(err.message)
    })
  })
}
// Loading.js
function Loading(){
  const [loading, error, data ] = useLoading();

    if(loading){
      return <div>loading....</div>
    }else{
      return <div>{data}</div>
    }

}
```

hooks 的复用性特别强，事实上社区上已经积攒了很多的 hook 可以直接使用，如可以直接使用https://github.com/alex-cory/use-http这个hooks来简化代码

```
function Loading(){
   const { error, loading, data} = useHttp(url);
     if(loading){
      return <div>loading....</div>
    }else{
      return <div>{data}</div>
    }
}
```

hooks 几乎完美解决了状态复用的问题，但是 hooks 本身也带来了一些问题，
hooks 的心智负担并不比 HOC 要少，https://zh-hans.reactjs.org/docs/hooks-faq.html FAQ 的长度可见一斑，另一个问题是 hook 只能使用在 function 里，这意味着我们需要在 function 里组织业务代码了

### Function && Class 谁更适合业务逻辑

刚刚从 class 组件转移到 hook 组件时，大部分人最先碰到的问题就是如何组织业务逻辑
class 里的 method 天然的帮我们做好了业务隔离

```ts
import React from "react"
class App extends React.Component {
  biz1 = () => {}
  biz2 = () => {
    this.biz3()
  }
  biz3 = () => {}
  render() {
    return (
      <div>
        <button onClick={() => this.biz1()}>dobiz1</button>
        <button onClick={() => this.biz2()}>dobiz2</button>
      </div>
    )
  }
}
```

但是到了 function 里，已经缺乏 method 的这个抽象来帮我们做业务隔离了，很有可能写成如下这种代码

```ts
function App() {
  const [state1, setState] = useState()
  function biz1() {}
  biz1()
  const [state2, setState2] = useState()
  const biz2 = useCallback(() => {
    biz3()
  }, [state1, state2])
  biz2()
  return (
    <div>
      <button onClick={() => biz1()}>dobiz1</button>
      <button onClick={() => biz2()}>dobiz2</button>
    </div>
  )
  function biz3() {}
}
```

基本上是你想怎么来就怎么来，可以有无数种写法，自己写的还好，其他读代码的人就是一头雾水了，想理清一段业务逻辑，就得反复横跳了。

当然也可以指定一些编写 hook 的规范如

```
function APP(){
  // 这里放各种hook
 // 同步的业务逻辑
 // render逻辑
 // 业务逻辑定义
}
```

按照这种规范，上述代码如下

```
function App (){
  const [state1, setState] = useState();
  const [state2, setState2] = useState();
  biz0();
  return (
      <div>
        <button onClick={() => biz2()}>dobiz1</button>
        <button onClick={() => biz2()}>dobiz2</button>
      </div>
    )
  function biz0(){
    // 同步代码
  }
  function biz1(){
    // 异步代码
  }
  function biz2(){
    // 异步代码
    biz3()
  }
  function biz3(){
    // utilty
  }
}
```

这样组织代码的可读性就好很多，但是这只是认为约定，也没有对应的 eslint 做保证，而且 biz 的定义也没法使用 useCallback 等工具了，仍然存在问题。

### 编写 local state 存在的问题

上面的讨论我们可以看出，尽管 hooks 解决了状态复用的问题，但是其代码的组织和维护存在较多问题，如何解决 hooks 代码的维护问题就成了个问题

#### 状态全放在 rematch 里

rematch 的状态管理比较规整，我们因此可以考虑将 local state 的状态管理页存放到全局的 redux 里，但这样会带来一些问题

- 有些状态本身不太适合放在全局，如 A 页面的一些 UI 状态切换到 B 页面时，我们期望丢弃掉 A 页面的状态，如果状态放置到 A 的组件里，随着 A 组件的卸载，状态自然而然丢弃掉，而如果放置到全局，则需要手动的进行清理
- 全局状态的泛滥：将一些局部状态放置到全局会造成全局状态的泛滥，导致难以辨别核心的业务逻辑
- 违反了局部性的原则：业务逻辑放在全局，导致阅读组件代码时，需要频繁的在组件和全局状态内进行切换

#### model 和 view 的分离

我们虽然不能将状态放在全局，我们仍然可以效仿 rematch 的方式，将组件拆分为 view 和 model，view 负责纯渲染，model 里存放业务逻辑，借助于 hooks，比较容易实现该效果，大致代码结构如下

```ts
// models.ts
const model = {
  state:{
    data: null,
    err: null,
    loading: false
  },
  setState: action((state,new_state) => {
     Object.assign(state,new_state)
  }),
  fetch_data: effects(async (actions) => {
     const { setState } = actions;
     setState({loading: true});
     try {
       const resp = await fetch();
       setState({
	       loading: false,
           data:resp
       })
     }catch(err){
	     setState({
	     loading: false,
	     err: err.mssage
	  })
    }
  })
}

// hooks.ts
import model from './model';
export const useLoading = createLocalStore(model);

// loading/ index.ts
import {useLoading} from './hooks';
export default () => {
  const [state, actions] = useLoading();
  return (<Loading {...state} {...actions} />)
}
const Loading = ({
   err,
   data,
   loading,
   fetch_data
}) => {
  if(loading) return (<div>loading...</div)
  if(err) return (<div>error:{err}</div>)
  return <div onClick={fetch_data}>data:{data}</div>
}
```

代码主要有三部分组成
model: 业务逻辑（状态及状态变化）
hooks: 根据 model 生成 useLoding hooks，实际控制的是从何处去获取状态
view: 使用根据 useLoading hooks 的返回的 state 和 action 进行渲染

这样我们的代码组织就比较清晰，不太可能出现之前 hook 出现的混乱的情况了

#### 重要的是 model 而非 local 或者全局

我们发现至此我们组件无论是 local state 还是全局 state，写法几乎一致了，都是划分为了 modle 和 view，区别只在于状态是存在全局还是 local，如果我们全局和 local 的 model 定义完全一致，那么将很容易实现状态全局和 local 的切换，这实际上在业务中也比较常见，尤其是在 spa 里，刚开始某个页面里的状态是 local 的，但是后来新加了个页面，需要和这个页面共享状态，我们就需要将这个状态和新页面共享，这里可以先将状态提升至两个页面的公共父页面里（通过 Context）,或者直接提取到全局。所以此时对于组件，差别仅仅在于我们的状态从何读取而已。
我们通过 hook 就隔离了这种区别，当我们需要将状态切换至全局或者 context 或者 local 时并不需要修改 model，仅仅需修改读取的 hook 即可

```ts
// hook.ts
import model from "./model"
const useLocaleLoading = createLocaleStore(model) // 从locale读取状态
const useConextLoading = createContext(model) // 从context读取状态
const useGlobalLoading = createStore(model) // 从redux里读取状态

// loading.ts
export default () => {
  const [state, actions] = useLocaleLoading() // 这里可以选用从何处读取状态
  return <Loading {...state} {...actions} />
}
```

此时我们的组件无论是状态复用、UI 复用、还是代码组织上都达到了比较合理的水平，mobx 里实际上已经采用了类似做法

#### 依赖注入

我们在编写 model 的过程中，effects 里不可避免的需要调用 service 来获取数据，这导致了我们的 model 直接依赖了 service，这一般不会出现问题，但是当我们做同构时就会出现问题。
因为浏览器端和服务端的 service 差别很大，如浏览器端的 service 通常是 http 请求，而服务端的 service 则有可能是 rpc 服务，且调用过程中需要打日志和一些 trace 信息。这导致了如果 model 直接依赖于 service 将无法构建通用于服务端和浏览器端的 model，更好的处理方式应该是将 service 通过依赖注入的方式注入到 model，在创建 strore 的时候将 service 实际的进行注入

上面说的这些问题包括 Typescript 支持、Batteries Included、localStore 的支持、依赖注入的支持等，rematch| dva 等库受限于历史原因，都不太可能支持，很幸运的是https://github.com/ctrlplusb/easy-peasy 对上述均做了很好的支持。具体例子可参考 https://github.com/hardfist/hardfist_tools/tree/master/packages/spa/src/components/counter

#### easy-peasy 简介

disclaimer: 我和这库没啥关系，只是发现很符合我的需求，所以推荐一下
easy-peasy 的使用方式和 rematch 相似，但区别于 rematch 缺乏对 hook 的内置支持（虽然也能支持 react-redux 的 hook 用法），且需要兼容 react-redux 的写法，
easy-peasy 内置了对 hook 的支持且并不依赖 react-redux，而仅仅是对 react-redux 的用法做简单兼容，导致了其可以摆脱 rematch 现存的种种问题。

#### typescript 的 first class 支持

9102 年了，对 typescript 的支持对于一个库应该成了基本需求，easy-peasy 很好的做到了这一点，其专门为 TS 设计了一套 API，用于解决 TS 的支持问题(内部使用了 ts-boolbelt 来解决类型推断问题)，简单的使用 TS 定义一个 model 如下

```ts
export interface TodosModel {
  todo_list: Item[] // state
  filter: FILTER_TYPE // 同上
  init: Action<TodosModel, Item[]> // 同步action
  addTodo: Action<TodosModel, string> // 同上
  setFilter: Action<TodosModel, FILTER_TYPE> // 同上
  toggleTodo: Action<TodosModel, number>
  addTodoAsync: Thunk<TodosModel, string> // 异步
  fetchTodo: Thunk<TodosModel, undefined, Injections> // 异步并进行service的依赖注入
  visible_todo: Computed<TodosModel, Item[]> // computed state
}
```

定义好 model 的结构后，我们在编写 model 时借助于 contextual typing 可以享受到自动补全和类型检查的功能了
![image](https://user-images.githubusercontent.com/8898718/65380630-cf15b680-dd11-11e9-9397-96d6de2cd4dd.png)

业务中使用 model 也不再是通过 HOC 的方式通过 connect 来读取 state 和 action，而是直接通过内置的 hook 来解决状态读取问题，避免了对 connect 的类型兼容问题（rematch 对这里的兼容很坑爹),且保证了类型安全
![image](https://user-images.githubusercontent.com/8898718/65380692-0769c480-dd13-11e9-89f8-9eec04d35fc8.png)

#### 内置 computed 和 immer

区别于 rematch，easy-peasy 通过 immer 实现了对 immutable 的支持，同时内置了对 computed state 的支持，简化了我们业务的编写

```
export const todo: TodosModel = {
  todo_list: [
    {
      text: 'learn easy',
      id: nextTodoId++,
      completed: false
    }
  ],
  filter: 'SHOW_ALL' as FILTER_TYPE,
  init: action((state, init) => {
    state.todo_list = init;
  }),
  addTodo: action((state, text) => {
    // 看似mutable，实际是immutable，通过immer实现了通过mutable的写法，来实现了immutable结构
    state.todo_list.push({
      text,
      id: nextTodoId++,
      completed: false
    });
  }),
  setFilter: action((state, filter) => {
    state.filter = filter;
  }),
  toggleTodo: action((state, id) => {
    const item = state.todo_list.filter(x => x.id === id)[0];
    item.completed = !item.completed;
  }),
  addTodoAsync: thunk(async (actions, text) => {
    await delay(1000);
    actions.addTodo(text);
  }),
  fetchTodo: thunk(async function test(actions, payload, { injections }) {
    const { get_todo_list } = injections;
    const {
      data: { todo_list }
    } = await get_todo_list();
    actions.init(todo_list);
  }),
  // 内置对computed的支持
  visible_todo: computed(({ todo_list, filter }) => {
    return todo_list.filter(x => {
      if (filter === 'SHOW_ALL') {
        return true;
      } else if (filter === 'SHOW_COMPLETED') {
        return x.completed;
      } else {
        return !x.completed;
      }
    });
  })
};
```

#### 同样的方式编写 local 和全局的 state

easy peasy 的 model 定义不仅适用于全局，也适用于 context 和 local，只需要通过 hook 进行切换即可

```ts
export const ContextCounter = () => {
  const [state, actions] = useContextCounter()
  return renderCounter(state, actions)
}
export const LocalCounter = () => {
  const [state, actions] = useLocalCounter()
  return renderCounter(state, actions)
}
export const ReduxCounter = () => {
  const [state, actions] = useReduxCounter()
  return renderCounter(state, actions)
}
```

#### 依赖注入支持

easy peasy 同时通过 thunk 实现了依赖注入，且保证了依赖注入的类型安全

- 构造 store 时注入 service

```ts
// src/store/index.ts
import { get_todo_list } from "service"
export interface Injections {
  get_todo_list: typeof get_todo_list
} //定义注入的类型，供后续使用

export const store = createStore(models, {
  injections: {
    // 注入service
    get_todo_list,
  },
})
```

- 定义 model 时，声明要注入的类型

```
import { Injections } from '../store';
// 导入需要注入的类型

export interface TodosModel {
  items: string[];
  addTodo: Action<TodosModel, string>;
  saveTodo: Thunk<TodosModel, string, Injections>; // 类型注入
}
```

- 使用注入的 service
