---
title: "深入typescript类型系统: rematch实践"
date: "2020-01-11"
---

本文主要是结合通过修复 rematch 存在 ts 类型问题，讲述 ts 的一些比较高级功能的实际用法，如

- contextual typing
- generic inference
- mapped type && index type && lookup type
- conditional type && extract type
- Assignability check
  问题背景
  由于 rematch 的 api 设计和 react-redux 的 api 有所冲突，主要体现在 react-redux 的 connect 函数要求 mapDispatchToProps 中的里的函数参数是个 action，而 rematch 是将 effect 以及 reducer 的函数名作为 type，运行时构造出一个 action，这导致两者无法直接支持类型兼容，这也导致了 rematch 一堆的类型问题，影响我们平时的业务开发。另 rematch 本身的类型和其实现也存在不一致，且很多的兼容 1.x 的类型代码也导致其类型问题难以修复。
  所以为了修复 rematch 的一堆类型问题，我们重新编写了相关的类型定义，同时介绍一些 ts 类型编程的小技巧。
  rematch 官网的 ts 例子并不能在严格模式下跑通 https://github.com/rematch/rematch/tree/master/examples/ts ，且缺乏很多类型推导的功能。
  rematch 和 redux 的差别
  model 的定义
  通常定义一个 redux 的 model 文件需要包括，
- Store

```ts
  import { createStore, combineReducers } from 'redux'
  default createStore(reducers, initialState, enhancers)
```

- Action Type

```ts
export const COUNT_UP_BY = "COUNT_UP_BY"
```

- Action Creator

```ts
import { COUNT_UP_BY } from "../types/counter"
export const countUpBy = value => ({
  type: COUNT_UP_BY,
  payload: value,
})
```

- Reducer

```ts
import { COUNT_UP_BY } from "../types/counter"
const initialState = 0
export default (state = initialState, action) => {
  switch (action.type) {
    case COUNT_UP_BY:
      return state + action.payload
    default:
      return state
  }
}
```

而在 rematch 中定义一个 model 却十分简单，逻辑也十分清晰

```ts
import { init } from "@rematch/core"
const count = {
  state: 0,
  reducers: {
    upBy: (state, payload) => state + payload,
  },
}
init({
  models: { count },
})
```

view 的使用
rematch 通 redux 一样都是通过 react-redux，将 model 和 react 进行桥接，在 state 的桥接上两者是一致的，但是在 dispatch 的桥接上却有所区别

- redux 支持两种桥接 dispatch 的方式

```ts
import { countUpBy } from "../actions/count"
import { connect } from "react-redux"
// Component
const mapStateToProps = state => ({
  count: state.count,
})
// function form
const mapDispatchToProps = dispatch => {
  return {
    countUpBy: dispatch({ type: "INCREMENT" }),
  }
}
const mapDispatchToProps = dispatch => {
  return bindActionCreators({ countUpBy }, dispatch)
}
connect(mapStateToProps, mapDispatchToProps)
```

第二种写法可以进一步简化为 object shorthand form,直接传入对象，react-redux 会自动帮助做 bingActionCreators 操作

```ts
// object form
connect(mapStateToProps, { countUpBy })(Component)
```

- rematch 则是直接将 model 里的 reducer 和 effect 做 map 即可

```ts
  import { connect } from 'react-redux'
  // Component
  const mapStateToProps = (state) => ({
  count: state.count
  })
  const mapDispatchToProps = (dispatch) => ({
  countUpBy: dispatch.count.countUpBy，
  countUpBy2： dispatch({type: 'count/countUpBy'}) // 兼容 redux 写法，不推荐
  })
  connect(mapStateToProps, mapDispatchToProps)(Component)
```

由于现有的 react-redux 的类型是专门为 redux 设计的，而 rematch 的 model 和 view 与 redux 的差异也导致了没办法和 react-redux 现有类型兼容。
两者的一个主要问题是 rematch 的 action 是在运行时构造出来的很难在编译期进过类型推倒获得，而 redux 的 action 是用户自行定义的，其类型直接即可获取。
一个常见的 rematch 的 model 定义如下

```ts
// model/user.ts
export const user = {
  state: initialState,
  reducers: {
    add(state: userState, payload: number) {
      return {
        ...state,
        count: state.count + payload,
      }
    },
  },
  effects: (dispatch: RootDispatch) => ({
    async addAsync(payload: number, rootState: RootState) {
      await delay(1000)
      dispatch.user.add(payload)
      return rootState
    },
  }),
}
```

业务中使用方式如下

```ts
// user.ts
handleAdd = async () => {
  const result = await this.props.add(1) // 区别于一般的 redux 的 action，rematch 的 reducer 和 effect 都是返回 promise，所以需要通过 await 拿到返回值（不知道为啥这样设计)
  console.log("result:", result) // rematch 的 reducer 返回值为 action
}
```

下面是 add 这个 reducer 的返回值（返回这个都没啥子用。。。）

我们可以看出 rematch 将${model}/${reducer_function_name}作为 action 的 type，将函数参数作为 action 的 payload。
现存问题
rematch 的 ts 支持程度有限，在如下几个方面 ts 支持存在问题，以官方例子为例
model 定义里的 rootState 和 rootDispatch 缺乏类型推倒，当 reducer 复杂或者存在跨 model 调用 effect 的场景下，显得更加力不从心
以官方例子为例：

- model 里 effect 的 dispatch 和 rootState 都无法获得类型，也没法办法做自动补全和类型检查 rematch model

* 应用里从 connect 里获取到的 dispatch 的类型也不正确，无法进行自动补全和类型检查 rematch app

- 不支持 select 的类型的类型推倒

解决方式
简化使用场景
rematch 包含了丰富的功能，但是对于平时的业务开发，绝大部分功能使用不到，且对这些额外功能的支持，大大增加了类型支持的难度，因此我们只针对日常常见的使用场景进行类型支持，其他复杂场景暂时不做支持，如果有业务需要，再考虑额外支持。
我们以 todo_list 为例，介绍一个常见的应用所需要依赖的 rematch 功能， 实际代码见https://github.com/hardfist/hardfist_tools/tree/master/packages/spa

- model 定义 https://github.com/hardfist/hardfist_tools/blob/master/packages/spa/src/models/app.tsx

```ts
import { RootDispatch, RootState } from "store"
import { get_todo_list } from "service/app"
import { delay } from "utils"
let nextTodoId = 0
type FILTER_TYPE = "SHOW_ALL" | "SHOW_COMPLETED" | "SHOW_ACTIVE"
type Item = {
  id: number
  text: string
  completed: boolean
}
const initialState = {
  todo_list: [] as Item[],
  filter: "SHOW_ALL" as FILTER_TYPE,
}
export type appState = typeof initialState
```

```ts
export const app = {
  state: initialState,
  reducers: {
    init(state: appState, init: Item[]) {
      state.todo_list.push(...init)
    },
    addTodo(state: appState, text: string) {
      state.todo_list.push({
        id: nextTodoId++,
        text,
        completed: false,
      })
    },
    setFilter(state: appState, filter: FILTER_TYPE) {
      state.filter = filter
    },
    toggleTodo(state: appState, id: number) {
      const item = state.todo_list.filter(x => x.id === id)[0]
      item.completed = !item.completed
    },
  },
  effects: (dispatch: RootDispatch) => ({
    async addTodoAsync(text: string) {
      await delay(1000)
      await dispatch.app.addTodo(text)
    },
    async fetchTodo() {
      const {
        data: { todo_list },
      } = await get_todo_list()
      dispatch.app.init(todo_list)
    },
  }),
  selectors: () => ({
    visible_todo() {
      return ({ app: { filter, todo_list } }: RootState) => {
        return todo_list.filter(x => {
          if (filter === "SHOW_ALL") {
            return true
          } else if (filter === "SHOW_COMPLETED") {
            return x.completed
          } else {
            return !x.completed
          }
        })
      }
    },
  }),
}
```

- connnect 到组件使用 https://github.com/hardfist/hardfist_tools/blob/master/packages/spa/src/pages/home/index.tsx

```ts
export const Home: React.FC = () => {
  const [input, setInput] = useState("")
  const { visible_todo, filter } = useSelector((state: RootState) => {
    return { ...state.app, ...selection(state) }
  })
  const {
    app: { addTodo, setFilter, toggleTodo, fetchTodo },
  } = useDispatch() as RootDispatch
  useEffect(() => {
    fetchTodo()
  }, [fetchTodo])
  return (
    <>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!input.trim()) {
            return
          }
          setInput("")
          addTodo(input)
        }}
      >
        <input
          value={input}
          onChange={e => {
            setInput(e.target.value)
          }}
        />
        <button type="submit">Add Todo</button>
      </form>
      <ul>
        {visible_todo.map(x => {
          return (
            <Item
              key={x.id}
              onClick={() => toggleTodo(x.id)}
              completed={x.completed}
            >
              {x.text}
            </Item>
          )
        })}
      </ul>
      <div>
        <span>Show: </span>
        <FilterLink
          disabled={filter === "SHOW_ALL"}
          onClick={() => setFilter("SHOW_ALL")}
        >
          All
        </FilterLink>
        <FilterLink
          disabled={filter === "SHOW_ACTIVE"}
          onClick={() => setFilter("SHOW_ACTIVE")}
        >
          Active
        </FilterLink>
        <FilterLink
          disabled={filter === "SHOW_COMPLETED"}
          onClick={() => setFilter("SHOW_COMPLETED")}
        >
          Completed
        </FilterLink>
      </div>
    </>
  )
}
```

这个场景覆盖了 90%以上的业务场景，我们目前目标是保证该场景的类型安全，最终达到如下效果

rematch 内置类型
rematch 本身内置了一堆的类型，但是平时业务中常用的类型只有如下三种，其他类型虽然暴露，但多用于内部实现
createModel
用于帮助用户进行类型校验&类型推倒，实际实现非常简单
function createModel(model){
return model
}
那为什么要定义这样一个函数呢为啥不是直接使用 model，主要还是为了类型校验和自动补全
这里涉及了 TS 里的两个功能
context typing
ts 里的绝大部分类型推倒都是自下而上的，如

```ts
let a = 1 + 2
```

推倒方式如下 `1 => number, 2 => number 推倒 1 + 2 => number，进而推导 a 也是 number`
但是 ts 也支持自上而下的进行类型推倒，一个典型的用途就是函数重载。

我们看到下面的$('string', x=> x)可以自动推断出x的类型为string，这里就是用了contextual typing的功能。
$('string', xxx) 可以根据 tag 为 string，查询重载定义，推断出 callback 的类型为 (a:string) => void ，进而进一步推导出 x 的类型为 string
我们发现上述推倒规则是自上而下的，这就是 contextual typing 的作用，其实 contextual typing 更为简单的应用就是根据对象的显示类型标注做自动补全和类型检查,这在和后端的协作中以及代码重构中扮演了极大的作用。
如已知后端的 api 响应格式如下

```ts
declare namespace com.hardfist.spa {
  export interface BaseResponse<T = any> {
    code: number
    message: string
    data: T
  }
  export interface TodoItem {
    id: number
    completed: boolean
    text: string
  }
  export interface TodoListRequest {
    from: number // 起始区间
    to: number
  }
  export interface TodoListResponse {
    code: number
    message: string
    data: {
      todo_list: TodoItem[]
    }
  }
}
```

该定义可以直接根据后端定义的 thrift 格式根据工具自动生成，这样后期后端如果需要修改数据格式，只需要使用工具同步格式即可。
这样我们使用的时候即可这样,直接享受到 contextual typing 带来的自动补全功能

generic inference
ts 的 generic 可以帮助我们减少重复的代码如

```ts
function first(arr: string[]): string {
  return arr[0]
}
function first(arr: number[]): number {
  return arr[0]
}
```

可以简化为

```ts
function first<T>(arr: T[]): T {
  return arr[0]
}
```

generic 不仅可以用来避免重复编写类型声明，还可以用来做类型推断
如下述代码，函数调用的时候并不需要显示的指明 E 和 O 的具体类型，ts 可以自动的根据参数推倒出 n 的类型

推导过程如下
["1","2","3"] 为 number[] => arr 为 number[] => E 为 number[] => arg 为 number => n 为 number
合理的利用类型 generic inference 可以大大简化我们的工作,配合 generic constrain 可以进一步对传入参数进行类型检查

```ts
function id<T>(arg: T): T // 可以保障返回的类型和传入的类型一致
function id2<T extends string>(arg: T): T // 可以对传入的类型进行类型检查
id2("hello") // work
id2(234) // check error
function id3<T extends string = string>(arg: T): T // 泛型参数也支持默认类型
```

说了那么多，那么 createModel 是怎么利用这两个功能的呢
首先看下 createModel 的类型声明如下

```ts
export function createModel<S = any>(model: ModelConfig<S>): ModelConfig<S>
```

这里主要有如下几个作用

1. 对参数进行类型检查： 如果传入的 model 不能 `extends ModelConfig<S>`,则报错
2. 实现对参数的 contextual typing,实现自动补全功能
3. 自动推断出返回的类型等于传入的类型

上述的 ModelConfig 定义如下

```ts
export interface ModelConfig<S = any, SS = S> {
  name?: string
  state: S
  baseReducer?: (state: SS, action: Action) => SS
  reducers?: ModelReducers<S>
  effects?:
    | ModelEffects<any>
    | ((dispatch: RematchDispatch) => ModelEffects<any>)
}
```

但是也这里存在一些问题，如 dispatch 无法根据类型推导而来，导致无法实现 dispatch 的自动补全。以官网例子为例，这里的 dispatch 没有类型推倒，更别提的 increment 的参数类型校验。

原因是这里实际上存在一定程度上的循环依赖
如 user 这个 model 里的 effect 里的 dispatch 是 rootDispatch，参数也是 rootState，然而 rootDispatch 和 rootState 类型又依赖 user 这个 model，这导致没办法完全依赖自动类型推断。

循环依赖

当 TS 碰到这种循环依赖时，会自动将其推断为 any 类型，导致类型信息丢失，因此在需要循环引用的地方，我们需要显示的标注 model 里的某些类型，不能完全依赖于类型推断。好在 model 只需要一处定义，需要手动标注的地方很少。因为 createModel 会导致循环引用将返回值推断为 any 类型，故此我们不使用 createModel，而是直接采用类型标注的办法来实现 contextual typing,所幸需要标注的地方很少。
其中 RootDispatch 和 RootState 的实现，后面详述

```ts
export const app: ModelConfig = {
  effects: (dispatch: RootDispatch) => ({
    async addTodoAsync(text: string, rootState: RootState) {
      await delay(1000)
      await dispatch.app.addTodo(text)
    },
    async fetchTodo() {
      const {
        data: { todo_list },
      } = await get_todo_list()
      dispatch.app.init(todo_list)
    },
  }),
}
```

这样可以享受类型推导和检测了

RematchRootState
其作用是根据 models，将各个 models 的 state 合并到一个 namespace 下，实现没啥问题，通过简单的 mapped types 和 index types 即可

```ts
export type RematchRootState<M extends Models> = {
[modelKey in keyof M]: M[modelKey]["state"]
};
mapped type && index type 等都比较简单不再赘述，可查看 advanced type
```

RematchRootDispatch
作用和 RematchRootState 类似，将各个 model 下的 reducers 和 effects 进行合并，区别之处在于 effects 和 reducers 的类型和业务中想要使用的 props 的类型不一致，因此需要转换
我们先看看业务中和 model 中的 reducer 类型
model

```ts

reducers: {
  add(state: userState, payload: number) {

      return {
        ...state,
        count: state.count + payload
      };
    }

},
```

```ts
function Demo() {
  const user = useSelector((rootState: RootState) => rootState.user)
  const dispatch: RootDispatch = useDispatch()
  const { add, addAsync } = mapDispatch(dispatch)
  return (
    <>
      <div>{user.count}</div>
      <button onClick={() => add(1)}>add </button>
      <button onClick={() => addAsync(22)}>add async</button>
    </>
  )
}
```

我们发现在 model 中的 add 类型为
(state:userState, payload: number) => userState
而在 props 中使用的 add 类型为
(payload: number) => { type: string, payload: number}

- 因此需要做一个转换简单将原来参数的 state 去掉，并且修改返回类型，我们通过 infer 可以很容易做到这点
  type alias && extends && infer && recusive type
  这几个功能的结合使得 ts 的类型系统发生了脱胎换骨的变化，使得其具有了对类型进行编程的能力本身也是图灵完全的，简单介绍该功能
- type alias
  type alias 不仅仅用于简单的类型别名
  type ID = string;
  其更主要的功能是类似于 haskell 的 type 充当类型构造器用来构造更加复杂的类型,类似于 js 的函数，可以当做类型的函数，只不过其输入是一个 type，输出也是一个 type
  type isEqual<A,B> = B extends A ? A extends B : true : false
  如上我们可以定义一个判断类型是否相容的类型函数
  ts 甚至提供了 type constraint 和 default generic type variable 来简化类型函数的编写，其类似于函数的参数的类型检查和默认参数。
- extends
  我们可以将其视为 js 的 ===,这样通过三目运算 T extends Condition ? X : Y 即可实现了对类型的控制流操作，一般称作 condition type

```ts
type isTrue<T> = T extends true ? true : false
```

- infer
  我们可以将其视为类型变量，可以用于保存我们想要保存的中间类型，我们可以将其用来从已有的类中提取我们想要的类型,如下可以获取函数的返回类型

```ts
type ReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any
```

- recursive type
  recursive 可以视为 js 函数里的递归操作，有了 recursive 几乎可以保证我们可以实现任意我们想要的类型（语义等价）,我们甚至可以通过 recursive 来实现编译时计算(由于暂时 ts 不支持类型上的运算，以及递归深度的限制，还是有些受限的）

```ts
type Last<T extends any[]> = {
  0: Last<Tail<T>>
  1: Head<T>
}[HasTail<T> extends true ? 0 : 1]
```

有了 infer 的支持我们可以简单实现如下

```ts
type Reducer2connect<R extends Function> = R extends (
  state: infer S,
  ...payload: infer P
) => any
  ? (...payload: P) => S
  : () => void
```

其实现效果如下,符合我们的需求

有了这个转换再结合 mapped types，就可以实现 rematch 的转换

```ts
export type ReducerFromModel<R> = {
  [reducerKey in keyof R]: Reducer2connect<R[reducerKey]>
}
```

同理对于 effect 可以类似的做法
model 中的 addAsync 定义如下

```ts
effects: (dispatch: RootDispatch) => ({
  async addAsync(payload: number, rootState: RootState) {
    await delay(1000)
    dispatch.user.add(1)
    return rootState
  },
})
```

add async 类型为

```ts
addAsync: (payload: number, rootState: RootState) : Promise<RootState>
```

而业务中使用的 addAsync 定义如下

```ts
addAsync: (payload:number) => Promise<RootState>
```

我们先定义 Effect2connect 实现转换

```ts
type Effect2connect<E extends Function> = E extends (
  payload: infer P,
  ...args: any[]
) => infer S
  ? (payload: P) => Promise<S>
  : () => Promise<any>
```

测试一下结果，没啥问题

接下来就可以实现 EffectFromModels

```ts
export type EffectFromModel<E> = {
  [effectKey in keyof E]: Effect2connect<E[effectKey]>
}
```

有了 EffectFromModel 和 EffectFromReducer 我们就可以接着将各个子 model 的 reducer 和 effect 合并到一起了

```ts
export type RematchRootDispatch<M extends Models> = {
  [modelKey in keyof M]: ReducerFromModel<M[modelKey]["reducers"]> &
    EffectFromModel<ReturnType<M[modelKey]["effects"]>>
}
```

RematchRootSelect
select 的支持和 effect 以及 reducer 没有本质区别，主要做的就是类型的转换,不对赘述可参考
https://github.com/hardfist/hardfist_tools/blob/master/packages/rematch/index.d.ts
示例
代码见 https://github.com/hardfist/hardfist_tools/tree/master/packages/spa
推荐实践， 不要使用任何@rematch/core 里的类型，而是使用@hardfist/rematch 里的 rematch 类型定义,即 RematchRootState, RematchRootDispatch, RematchRootSelect
子 model 定义

```ts
import { RootDispatch, RootState } from "store"
import { get_todo_list } from "service/app"
import { delay } from "utils"
let nextTodoId = 0
type FILTER_TYPE = "SHOW_ALL" | "SHOW_COMPLETED" | "SHOW_ACTIVE"
type Item = {
  id: number
  text: string
  completed: boolean
}
const initialState = {
  todo_list: [] as Item[],
  filter: "SHOW_ALL" as FILTER_TYPE,
}
export type appState = typeof initialState

export const app = {
  state: initialState,
  reducers: {
    init(state: appState, init: Item[]) {
      state.todo * list.push(...init)
    },
    addTodo(state: appState, text: string) {
      state.todo_list.push({
        id: nextTodoId++,
        text,
        completed: false,
      })
    },
    setFilter(state: appState, filter: FILTER_TYPE) {
      state.filter = filter
    },
    toggleTodo(state: appState, id: number) {
      const item = state.todo_list.filter(x => x.id === id)[0]
      item.completed = !item.completed
    },
  },
  effects: (dispatch: RootDispatch) => ({
    async addTodoAsync(text: string) {
      await delay(1000)
      await dispatch.app.addTodo(text)
    },
    async fetchTodo() {
      const {
        data: { todo_list },
      } = await get_todo_list()
      dispatch.app.init(todo_list)
    },
  }),
  selectors: () => ({
    visible_todo() {
      return ({ app: { filter, todo_list } }: RootState) => {
        return todo_list.filter(x => {
          if (filter === "SHOW_ALL") {
            return true
          } else if (filter === "SHOW_COMPLETED") {
            return x.completed
          } else {
            return !x.completed
          }
        })
      }
    },
  }),
}
```

根 model 定义
直接导出各子 model 即可

```ts
export \* from './app';
export \_ from './other';
store 定义(这里接入 immer 和 select 插件）
import { init } from '@rematch/core';
import immerPlugin from '@rematch/immer';
import selectPlugin from '@rematch/select';
import {
RematchRootDispatch,
RematchRootState,
RematchRootSelect
} from '@hardfist/rematch';
import \* as models from 'models';
export const store: Store = init({
models,
plugins: [immerPlugin(), selectPlugin()]
});
const { select } = store;

export { select };

export type RootState = RematchRootState<typeof models>;

export type RootDispatch = RematchRootDispatch<typeof models>;
export type RootSelect = RematchRootSelect<typeof models>;

export type Store = {
select: <T>(
calback: (select: RootSelect) => T
) => (rootState: RootState) => T;
name: string;
dispatch: RootDispatch;
getState(): RootState;
};
```

业务使用

```ts
export const Home: React.FC = () => {
  const [input, setInput] = useState("")
  const { visible_todo, filter } = useSelector((state: RootState) => {
    return { ...state.app, ...selection(state) }
  })
  const {
    app: { addTodo, setFilter, toggleTodo, fetchTodo },
  } = useDispatch() as RootDispatch
  useEffect(() => {
    fetchTodo()
  }, [fetchTodo])
  return (
    <>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!input.trim()) {
            return
          }
          setInput("")
          addTodo(input)
        }}
      >
        <input
          value={input}
          onChange={e => {
            setInput(e.target.value)
          }}
        />
        <button type="submit">Add Todo</button>
      </form>
      <ul>
        {visible_todo.map(x => {
          return (
            <Item
              key={x.id}
              onClick={() => toggleTodo(x.id)}
              completed={x.completed}
            >
              {x.text}
            </Item>
          )
        })}
      </ul>
      <div>
        <span>Show: </span>
        <FilterLink
          disabled={filter === "SHOW_ALL"}
          onClick={() => setFilter("SHOW_ALL")}
        >
          All
        </FilterLink>
        <FilterLink
          disabled={filter === "SHOW_ACTIVE"}
          onClick={() => setFilter("SHOW_ACTIVE")}
        >
          Active
        </FilterLink>
        <FilterLink
          disabled={filter === "SHOW_COMPLETED"}
          onClick={() => setFilter("SHOW_COMPLETED")}
        >
          Completed
        </FilterLink>
      </div>
    </>
  )
}
```

happy coding!

参考资料

- https://github.com/microsoft/TypeScript-New-Handbook/blob/master/reference/Assignability.md
- https://microsoft.github.io/TypeScript-New-Handbook/everything/#inference
