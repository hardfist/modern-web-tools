---
title: "immutable: 不只是性能优化"
date: "2020-02-02"
---

## reference equality: React 缓存的基石

对于比较复杂的 React 单页应用，性能问题也是我们必须要考虑的问题，大部分的性能问题实际上都和不必要的渲染有关，所以性能优化的关键就在于如何避免不必要的组件渲染。
为了防止后续讨论混乱，先定义一些术语(更详细的解释可参考[C# Programming Guide](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/equality-comparisons))

- 简单类型(primitive type): string | number| boolean| null | undefined 等基本类型，不用区分引用相等还是值相等
- 复合类型(compound type): 由一个或多个简单类型或复合类型构成的类型，区分 reference equal 和 value equal
- reference equality：两个变量指向的是同一个对象即为引用相等，即使用 Javascript 里的===进行判断的结果，对于 primitive type 可将 reference equality 和 value equality 没有区别，比较值相等即可

```tsx
const arr = [
  { text: "yj", done: true },
  { text: "yj", done: true },
]
const x = arr[0]
const y = arr[0]
x === y // true ,这里的 x和y指向的是同一个对象，为引用相等
```

- value shallow equality：虽然 x 和 y 指向的不是同一个对象，但是对象的每个属性都引用相等

```tsx
const arr = [
  { text: "yj", done: true },
  { text: "yj", done: true },
]
const x = arr[0]
const y = arr[1]
x === y // false
shallowEqual(x, y) // true
```

- value deep equality: 虽然 x 和 y 指向的不是同一个对象，但是每个对象的属性都是引用相等或者递归的 deep equal

```tsx
const arr = [
  {
    text: "yj",
    done: true,
    props: {
      color: "red",
    },
  },
  {
    text: "yj",
    done: true,
    props: {
      color: "red",
    },
  },
]
const x = arr[0]
const y = arr[1]
x === y // false
shallowEqual(x, y) // false
deepEqual(x, y) // true
```

接下来我们就可以考察 reference equality 在 React 中的应用
考虑如下代码，我们发现即使 Child 的 props 没有发生变化，但是
每次 Parent 组件重渲染都会导致子组件重渲染。

```tsx
import * as React from "react"
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  return (
    <>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value)
        }}
      />
      <div>counter:{count}</div>
      <Child name={name} />
    </>
  )
}
function Child(props: { name: string }) {
  console.log("child render", props.name)
  return <div>name:{props.name}</div>
}
export default function App() {
  return <Parent />
}
```

问题的关键在于 React 默认对 functional 组件并没有采取任何优化，但是 React 同时
提供 React.memo 这个 api，用于优化，React.memo 保证了只有 props 发生变化时，该组件才会发生重渲染（当然内部 state 和 context 变化也会发生重渲染),我们只要将我们的组件包裹即可

```tsx
import * as React from "react"
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  return (
    <>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value)
        }}
      />
      <div>counter:{count}</div>
      <Child name={name} />
    </>
  )
}
// memo包裹，保证props不变的时候不会重渲染
const Child = React.memo(function Child(props: { name: string }) {
  console.log("child render", props.name)
  return <div>name:{props.name}</div>
})
export default function App() {
  return <Parent />
}
```

似乎事情到此为止了，如果我们的 props 只包含 primitive 类型(string、number)等，那么 React.memo 基本上就足够使用了，但是假如我们的 props 里包含了对象，就没那么简单了，
我们继续为我们的 Child 组件添加新的 Item props,这时候的 props 就变成了 object,问题
也随之而来，即使我们感觉我们的 object 并没有发生变化，但是子组件还是重渲染了。

```tsx
import * as React from "react"
interface Item {
  text: string
  done: boolean
}

function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  console.log("render Parent")
  const item = {
    text: name,
    done: false,
  }
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 5000)
  }, [])
  return (
    <>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value)
        }}
      />
      <div>counter:{count}</div>
      <Child item={item} />
    </>
  )
}
const Child = React.memo(function Child(props: { item: Item }) {
  console.log("render child")
  const { item } = props
  return <div>name:{item.text}</div>
})
export default function App() {
  return <Parent />
}
```

这里的问题问题在于，React.memo 比较前后两次 props 是否相等使用的是浅比较,而 child 每次接受的都是一个新的 literal object,所以导致浅比较返回 false

```tsx
const obj1 = {
  name: "yj",
  done: true,
}
const obj2 = {
  name: "yj",
  done: true,
}
obj1 === obj2 // false
```

解决方式有两种，第一种是使用深比较，第二种则是保证每次传给 Child 的 item 的引用相等。
幸运的是 React.memo 接受第二个参数，用于自定义控制如何比较属性相等，修改 child 组件如下

```tsx
const Child = React.memo(
  function Child(props: { item: Item }) {
    console.log("render child")
    const { item } = props
    return <div>name:{item.text}</div>
  },
  (prev, next) => {
    // 使用深比较比较对象相等
    return deepEqual(prev, next)
  }
)
```

虽然这样能达到效果，但是深比较处理比较复杂的对象时仍然存在较大的性能开销甚至挂掉的风险（如处理循环引用），因此并不建议去使用深比较进行性能优化。

第二种方式则是需要保证如果对象的属性等均相等，我们保证生成对象的引用相等，
这通常分为两种情况
如果对象本身是固定的,则可以通过 useRef 即可以保证每次访问的对象引用相等，修改代码如下

```tsx
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  const item = React.useRef({
    text: name,
    done: false,
  }) // 每次访问的item都是同一个item
  return (
    <>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value)
        }}
      />
      <div>counter:{count}</div>
      <Child item={item.current} />
    </>
  )
}
```

问题也很明显，即使我们的 name 改变了，我们的子组件也不会触发重渲染，
这比重复渲染问题更糟糕。所以 useRef 只能用在常量上面。
那么我们怎么保证 name 不变的时候 item 和上次相等，name 改变的时候才和上次不等。useMemo!
useMemo 可以保证当其 dependency 不变时，依赖 dependency 生成的对象也不变（由于 cache busting 的存在，实际上可能保证不了，异常尴尬），修改代码如下

```tsx
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  const item = React.useMemo(
    () => ({
      text: name,
      done: false,
    }),
    [name]
  ) // 如果name没变化，那么返回的始终是同一个 item
  return (
    <>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value)
        }}
      />
      <div>counter:{count}</div>
      <Child item={item} />
    </>
  )
}
```

至此我们保证了 Parent 组件里 name 之外的 state 或者 props 变化不会重新生成新的 item，借此保证了 Child 组件不会 在 props 不变的时候重新渲染。

然而事情并未到此而止
下面继续扩展我们的应用，此时一个 Parent 里可能包含多个 Child

```tsx
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  const [items, setItems] = React.useState([] as Item[])
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  const handleAdd = () => {
    setItems(items => {
      items.push({
        text: name,
        done: false,
        id: uuid(),
      })
      return items
    })
  }
  return (
    <form onSubmit={handleAdd}>
      <Row>counter:{count}</Row>
      <Row>
        <Input
          width={50}
          size="small"
          value={name}
          onChange={e => {
            setName(e.target.value)
          }}
        />
        <Button onClick={handleAdd}>+</Button>
        {items.map(x => (
          <Child key={x.id} item={x} />
        ))}
      </Row>
    </form>
  )
}
```

当我们点击添加按钮的时候，我们发现下面的列表并没有刷新，等到下次输入的时候，列表才得以刷新。
问题的在于 useState 返回的 setState 的操作和 class 组件里的 setState 的操作意义明显不同了。

- class 的 setState: 即使前后两次的 state 的引用相等，也会使用新的 state 来刷新组件
- hooks 的 setState: 如果前后两次的 props 引用相等，并不会刷新组件，因此需要用户进行保证

hooks 的这个变化意味着即使在组件里修改对象，也必须修改后的对象和之前的对象引用不等（这是以前 redux 里 reducers 的要求，并不是 class 的 setState 的需求）。
修改上述代码如下

```tsx
function Parent() {
  const [count, setCount] = React.useState(0)
  const [name, setName] = React.useState("")
  const [items, setItems] = React.useState([] as Item[])
  React.useEffect(() => {
    setInterval(() => {
      setCount(x => x + 1)
    }, 1000)
  }, [])
  const handleAdd = () => {
    setItems(items => {
      const newItems = [
        ...items,
        {
          text: name,
          done: false,
          id: uuid(),
        },
      ] // 保证每次都生成新的items，这样才能保证组件的刷新
      return items
    })
  }
  return (
    <form onSubmit={handleAdd}>
      <Row>counter:{count}</Row>
      <Row>
        <Input
          width={50}
          size="small"
          value={name}
          onChange={e => {
            setName(e.target.value)
          }}
        />
        <Button onClick={handleAdd}>+</Button>
        {items.map(x => (
          <Child key={x.id} item={x} />
        ))}
      </Row>
    </form>
  )
}
```

这实际要求我们不直接更新老的 state，而是保持老的 state 不变，生成一个新的 state，即 immutable 更新方式，而老的 state 保持不变意味着 state 应该是个 immutable object。
对于上面的 items 做 immutable 更新似乎并不复杂,但对于更加复杂的对象的 immutable 更新就没那么容易了

```tsx
const state = [{name: 'this is good', done: false, article: {
  title: 'this is a good blog',
  id: 5678
}},{name: 'this is good', done: false, article:{
  title: 'this is a good blog',
  id: 1234
}}]

state[0].artile的title = 'new article'

// 如果想要进行上述更新，则需要如下写法
const newState = [{
  {
    ...state[0],
    article: {
      ...state[0].article,
      title: 'new article'
    }
  },
  ...state
}]
```

我们发现相比直接的 mutable 的写法，immutable 的更新非常麻烦且难以理解。我们的代码里充斥着`...`操作，我们可称之为`spread hell`(对，又是一个 hell)。这明显不是我们想要的。

### deep clone is bad

我们的需求很简单

- 一来是需要改变状态
- 二来是需要改变后的状态和之前的状态非引用相等
  一个答案呼之欲出，做深拷贝然后再做 mutable 修改不就可以了

```tsx
const state = [
  {
    name: "this is good",
    done: false,
    article: {
      title: "this is a good blog",
      id: 5678,
    },
  },
  {
    name: "this is good",
    done: false,
    article: {
      title: "this is a good blog",
      id: 1234,
    },
  },
]

const newState = deepCone(state)
state[0].artile的title = "new article"
```

深拷贝有两个明显的缺点就是拷贝的性能和对于循环引用的处理，然而即使有一些库支持了高性能的拷贝，仍然有个致命的缺陷
对 reference equality 的破坏，导致 react 的整个缓存策略失效。
考虑如下代码

```tsx
const a = [{ a: 1 }, { content: { title: 2 } }]
const b = lodash.cloneDeep(a)
a === b // false
a[0] === b[0] // false
a[1].content === b[0].content // false
```

我们发现所有对象的 reference equality 都被破坏，这意味着所有 props 里包含上述对象的组件
即使对象里的属性没变化，也会触发无意义的重渲染,这很可能导致严重的性能问题。
这实际上意味着我们状态更新还有其他的需求，在 react 中更新状态的就几个需求
对于复杂的对象 oldState，在不存在循环引用的情况下，可将其视为一个属性树，如果我们希望改变某个节点的属性，并返回一个新的对象 newState，则要求

- 该节点及其组件节点的引用在新老 state 中不相等：保证 props 发生的组件 UI 状态能够刷新,即保持 model 和 view 的一致性
- 非该节点及其祖先节点的引用在新老 state 中保持引用相等：保证 props 不变进而保证 props 不变的组件不刷新，即保证组件的缓存不失效

很可惜 Javascript 并没有内置对这种 Immutable 数据的支持，更别提对 Immutable 数据更新的支持了，好消息是已存在相关提案，虽然仅仅是 stage1

### immutable record & tuple

我们可以趁此介绍下 immutable record & tuple 的提案
其实 Javascript 虽然不完全支持 Immutable object，但实际上还是能看到 immutable 的踪影的。
事实上所有的 primitive 类型的值都是 immutable 的，考虑如下代码

```ts
const a = "123"
a.test = "test"
a.test // undefined
const a = new String("123")
a.test = "test"
a.test // 'test'
```

从中我们
