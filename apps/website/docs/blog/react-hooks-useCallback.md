---
title: "深入React: hooks useCallback 问题"
date: "2020-01-12"
---

很早总结的 hooks 的问题文章，内部讨论一直没想到啥最优解，发出来看看有没有人有更好的解法

最近 rxjs 作者 ben lesh 发了条推 https:// twitter.com/benlesh/sta
tus/1195504467707355136?s=21

如此推所示，useCallback 问题非常严重，社区也讨论了很多做法，但仍然有很多问题。

useCallback 问题缘由

先回顾下 hook 之前组件的写法

class 组件

    export class ClassProfilePage extends React.Component<any,any> {
      showMessage = () => {
        alert('Followed ' + this.props.user);
      };



      handleClick = () => {
        setTimeout(this.showMessage, 3000);
      };



      render() {
     return <button onClick={this.handleClick}>Follow</button>;
      }
    }

functional 组件

    export function FunctionProfilePage(props) {
     const showMessage = () => {
        alert('Followed ' + props.user);
      };



     const handleClick = () => {
        setTimeout(showMessage, 3000);
      };



     return (
        <button onClick={handleClick}>Follow</button>
      );
    }

点击按钮，同时将 user 由 A 切换到 B 时，class 组件显示的是 B 而 function 组件显示的是 A，这两个行为难以说谁更加合理

    import React, { useState} from "react";
    import ReactDOM from "react-dom";

    import { FunctionProfilePage, ClassProfilePage  } from './profile'



    import "./styles.css";



    function App() {
      const [state,setState] = useState(1);
     return (
        <div className="App">
          <button onClick={() => {
            setState(x => x+x);
          }}>double</button>
          <div>state:{state}</div>
          <FunctionProfilePage user={state} /> // 点击始终显示的是快照值
          <ClassProfilePage user={state} /> // 点击始终显示的是最新值
        </div>
      );
    }



    const rootElement = document.getElementById("root");
    ReactDOM.render(<App />, rootElement);

https:// codesandbox.io/s/dreamy -water-wkoeg

当你的应用里同时存在 Functional 组件和 class 组件时，你就面临着 UI 的不一致性，虽然 react 官方说 function 组件是为了保障 UI 的一致性，但这是建立在所有组件都是 functional 组件，事实上这假设几乎不成立，如果你都采用 class 组件也可能保证 UI 的一致性（都显示最新值），一旦你页面里混用了 class 组件和 functional
组件（使用 useref 暂存状态也视为 class 组件），就存在的 UI 不一致性的可能

快照 or 最新值

所以 function 和 class 最大区别只在于默认情况不同，两者可以相互转换,快照合理还是最新值合理，这完全取决于你的业务场景，不能一概而论

事实上在 class 里也可以拿到快照值，在 function 里也可以拿到最新值

class 里通过触发异步之前保存快照即可

    export class ClassProfilePage extends React.Component<any,any> {
      showMessage = (message) => {
        alert('Followed ' +message);
      };



      handleClick = () => {
     const message = this.props.user // 在触发异步函数之前保存快照
        setTimeout(() =>showMessage(message)), 3000);
      };



      render() {
     return <button onClick={this.handleClick}>Follow</button>;
      }
    }

function 里通过 ref 容器存取最新值

    export function FunctionProfilePage(props) {
     const ref = useRef("");
      useEffect(() => {
        ref.current = props.user;
      });
     const showMessage = () => {
     console.log('ref:',ref)
        alert("Followed " + props.user +',' + ref.current);
      };



     const handleClick = () => {
        setTimeout(showMessage, 3000);
      };



     return <button onClick={handleClick}>function Follow</button>;
    }

其实就是个经典的函数闭包问题

- 在异步函数执行前可以对闭包访问的自由变量进行快照捕获：实现快照功能
- 在异步函数执行中可以通过 ref 读取最新的值
  for(var i=0;i<10;i++){
  setTimeout(() => console.log('val:',i)) // 拿到的是最新值
  }
  for(var i=0;i<10;i++){
  setTimeout(((val) => console.log('val:',val)).bind(null,i)); // 拿到的是快照
  }
  const ref = {current: null}
  for(var i=0;i<10;i++){
  ref.current = i;
  setTimeout(((val) => console.log('val:',ref.current)).bind(null,ref)); // 拿到的是最新值
  }
  for (var i = 0; i < 10; i++) { // 拿到的是快照
  let t = i;
  setTimeout(() => {
  console.log("t:", t);
  });
  }

重渲染机制

虽然 functional 和 class 组件在快照处理方式不一致，但是两者的重渲染机制，并没有大的区别

class 重渲染触发条件,此处暂时不考虑采用 shouldComponentUpdate 和 pureComponent 优化

- this.setState : 无条件重渲染，不进行新旧比较
- this.forceUpdate: 无条件重渲染，不进行新旧比较
- 父组件 render 带动子组件 render： 无条件，和 props 是否更新无关
- 祖先组件 context 变动： 不做 props 变动假设

我们发现 react 默认的重渲染机制压根没有对 props 做任何假设，性能优化完全交给框架去做，react-redux 基于 shouldComponent,
mobx-react 基于 this.forceUpdatehooks 来做一些性能优化

带来的问题

我们发现即使不用 hooks 本身 functional 组件和 class 组件表现就存在较大差异，由于 hook 目前只能在 function 组件里使用，这导致了一些本来是 functional 组件编程思维的问题反映到了 hooks 上。

hooks 的使用引入了两条强假设，导致了编程思维的巨大变动

- 只能在 functional 组件里使用： 导致我们需要处理最新值的问题
- 副作用（包括 rerender 和 effect）基于新旧值的 reference equality : 强制我们使用 immutable 进行编程

上述两条带来了很大的心智负担

Stale closure 与 infinite loop

这两个问题是硬币的两面，通常为了解决一个问题，可能导致另外一个问题

一个最简单的 case 就是一个组件依赖了父组件的 callback，同时内部 useffect 依赖了这个 callback

如下是一个典型的搜索场景

    function Child(props){
     console.log('rerender:')
     const [result,setResult] = useState('')
     const { fetchData } = props;
      useEffect(() => {
        fetchData().then(result => {
          setResult(result);
        })
      },[fetchData])
     return (
        <div>query:{props.query}</div>
        <div>result:{result}</div>
      )
    }
    export function Parent(){
     const [query,setQuery] = useState('react');
     const fetchData = () => {
     const url = 'https://hn.algolia.com/api/v1/search?query=' + query
     return fetch(url).then(x => x.text())
     }
     return (
        <div>
        <input onChange={e => setQuery(e.target.value)} value={query} />
        <Child fetchData={fetchData} query={query}/>
        </div>
      )
    }

上述代码存在的一个问题就是，每次 Parent 重渲染都会生成一个新的 fetchData，因为 fetchData 是 Child 的 useEffect 的 dep，每次 fetchData 变动都会导致子组件重新触发 effect，一方面这会导致性能问题，假如 effect 不是幂等的这也会导致业务问题（如果在 effect 里上报埋点怎么办）

解决思路 1：

不再 useEffect 里监听 fetchData: 导致 stale closure 问题 和页面 UI 不一致

      useEffect(() => {
        fetchData().then(result => {
          setResult(result);
        })
      },[]) // 去掉fetchData依赖

此时一方面父组件 query 更新，但是子组件的搜索并未更新但是子组件的 query 显示却更新了，这导致了子组件的 UI 不一致

解决思路 2：

在思路 1 的基础上加强刷 token

    // child
    useEffect(() => {
     fetchData().then(result => {
          setResult(result);
        })
    },[refreshToken]);




    // parent
    <Child fetchData={fetchData} query={query} refreshToken={query} />

问题：

- 如果子组件的 effect 较多，需要建立 refreshToken 和 effect 的映射关系
- 触发 eslint-hook 的 warning，进一步的可能触发 eslint-hook 的 auto fix 功能，导致 bug
- fetchData 仍然可能获取的是旧的闭包？

为了更好的语义化和避免 eslint 的报错，可以自定义封装 useDep 来解决

    useDepChange(() =>
      fetchData().then(result => {
          setResult(result);
        })
      },[fetchData])
    },[queryToken]); // 只在dep变动的时候触发，约等于componentWillReceiveProps了

- 实际上是放弃了 eslint-hook 的 exhaustive 检查，可能会导致忘记添加某些依赖，需要写代码时非常仔细了

解决思路 3：

useCallback 包裹 fetchData, 这实际上是把 effect 强刷的控制逻辑从 callee 转移到了 caller

    // parent
    const fetchData = useCallback(() => {
     const url = 'https://hn.algolia.com/api/v1/search?query=' + query
     return fetch(url).then(x => x.text())
      },[query]);

    // child
      useEffect(() => {
        fetchData().then(result => {
          setResult(result);
        })
      },[fetchData])

问题：

- 如果 child 的 useEffect 里依赖了较多的 callback，需要所有的 callback 都需要进行 useCallback 包装，一旦有一个没用 useCallback 包装，就前功尽弃
- props 的不可控制，Parent 的 fetchData 很可能是从其他组件里获取的，自己并没有控制 fetchData 不可变的权限，这导致千里之外的一个祖先组件改变了 fetchData，导致 Child 最近疯狂刷新 effect,这就需要将 callback 做层层 useCallback 处理才能避免该问题
- 官方说 useCallback 不能做语义保障，而且存在 cache busting 的风险
- 组件 API 的设计：我们发现此时设计组件时需要关心传进来的组件是否是可变的了，但是在接口上并不会反馈这种依赖

  `<Button onClick={clickHandler} />` // onClick 改变会触发 Button 的 effect 吗？

解决思路 4：

使用 useEventCallback 作为逃生舱，这也是官方文档给出的一种用法 useEventCallback

     // child
    useEventCallback(() => {
      fetchData().then(result => {
         setResult(result);
      });
    },[fetchData]);
    function useEventCallback(fn, dependencies) {
      const ref = useRef(() => {
        throw new Error('Cannot call an event handler while rendering.');
      });

      useEffect(() => {
        ref.current = fn;
      }, [fn, ...dependencies]);

      return useCallback(() => {
        const fn = ref.current;
        return fn();
      }, [ref]);
    }

这仍然存在问题，

解决思路 5：

拥抱 mutable，实际上这种做法就是放弃 react 的快照功能（变相放弃了 concurrent mode )，达到类似 vue3 的编码风格

实际上我们发现 hook + mobx === vue3, vue3 后期的 api 实际上能用 mobx + hook 进行模拟

问题就是： 可能放弃了 concurrent mode (concurrent mode 更加关注的是 UX，对于一般业务开发效率和可维护性可能更加重要）

调用者约定：

- 父组件传递给子组件的 callback: 永远获取到的是父组件的最新 state （通过 useObservable|useRef）

被调用者约定

- 不要把 callback 作为 useEffect 的依赖：因为我们已经限定了 callback 永远是最新的，实际上避免了陈旧闭包问题，所以不需要把 callback 作为 depdency
- 代码里禁止直接使用 useEffect：只能使用自定义封装的 hook，（因为 useEffect 会触发 eslint-hook 的 warning，每次都禁止不好，且 useEffect 没有那么语义化）如可以使用如下 hook
  - useMount： 只在 mount 触发（更新不触发）
  - useUpdateEffect: 只在更新时触发（mount 不触发）
  - useDepChange: dep 改变时触发，功能和 useEffect 类似，不会触发 wanring
```tsx
    // parent.js
    export observer(function VueParent(){
    const [state] = useState(observable({
    query: 'reqct'
    }))
    const fetchData = () => {
    const url = 'https://hn.algolia.com/api/v1/search?query=' + state.query
    return fetch(url).then(x => x.text())
    }
    return (
    <div>
    <input onChange={e => state.query = e.target.value} value={state.query} />
    <Child fetchData={fetchData} query={state.query}  />
    </div>
    )
    })
    // child.js
    export function observer(VueChild(props){
    const [result,setResult] = useState('')
    useMount(() => {
    props.fetchData().then(result => {
    setResult(result);
    })
    })
    useUpdateEffect(() => {
    props.fetchData().then(result => {
    setResult(result);
    })
    },[props.query])
    /_ 或者使用 useDepChange
    useUpdateEffect(() => {
    props.fetchData().then(result => {
    setResult(result);
    })
    },[props.query])
    _/
    return (
    <div>
    <div>query: {props.query}</div>
    <div>result:{result}</div>
    </div>
    )
    })
```
解决思路 6

useReducer 这也是官方推荐的较为正统的做法

我们仔细看看我们的代码，parent 里的 fetchData 为什么每次都改变，因为我们父组件每次 render 都会生成新的函数，为什每次都会生成新的函数，我们依赖了 query 导致没法提取到组件外，除了使用 useCallback 我们还可以将 fetchData 的逻辑移动至 useReducer 里。因为 useReducer 返回的 dispatch 永远是不变的，我们只需要将 dispatch 传递给子组件即可，然而 react 的 useReducer 并没有内置对异步的处理，所以需要我们自行封装处理,幸好有一些社区封装可以直接拿来使用，比如 zustand,
这也是我目前觉得较好的方案，尤其是 callback 依赖了多个状态的时候。 https:// codesandbox.io/s/github
/hardfist/hooks-problem/tree/master/

    function Child(props) {
      const [result, setResult] = useState("");
      const { fetchData } = props;
      useEffect(() => {
        console.log("trigger effect");
        fetchData().then(result => {
          setResult(result);
        });
      }, [props.query, fetchData]);
      return (
        <>
          <div>query:{props.query}</div>
          <div>result:{result}</div>
        </>
      );
    }
    const [useStore] = create((set, get) => ({
      query: "react",
      setQuery(query) {
        set(state => ({
          ...state,
          query
        }));
      },
      fetchData: async () => {
        const url = "https://hn.algolia.com/api/v1/search?query=" + get().query;
        const x = await (await fetch(url)).text();
        return x;
      }
    }));
    export function Parent() {
      const store = useStore();
      const forceUpdate = useForceUpdate();
      console.log("parent rerender");
      useEffect(() => {
        setInterval(() => {
          forceUpdate({});
        }, 1000);
      }, [forceUpdate]);
      return (
        <div>
          <input
            onChange={e => store.setQuery(e.target.value)}
            value={store.query}
          />
          <Child fetchData={store.fetchData} query={store.query} />
        </div>
      );
    }

解决思路 7：

这也是我觉得可能的最佳解法了，核心问题还是在于 js 语言对于并发|immutable|函数式编程的羸弱支持如（thread local object |
mutable, immutable 标记| algebraic effects
支持），导致 react 官方强行在框架层面对语言设施进行各种 hack，引起了各种违反直觉的东西，换一门语言做 react 可能是更好的方案（如 reasonml)。
