---
title: "深入React: Coroutine"
date: "2020-01-11"
description: "讲一下关于协程的事情"
---

**![image.png](https://cdn.nlark.com/yuque/0/2019/png/103463/1577496514917-4020914c-0d93-40e9-aea9-38ba0899ac8c.png#align=left&display=inline&height=194&name=image.png&originHeight=387&originWidth=611&size=43010&status=done&style=none&width=306)**<br />**<br />按照 andrew clark 在** \*\*[https://reactpodcast.com/70](https://reactpodcast.com/70)  所述，react hooks 即使说不上是百分百为了 concurrent mode 设计，也绝大部分是为了 concurrent mode 设计，这样保证一旦 concurrent mode 落地，大家用 react hooks 编写的代码都已经是并发安全的了，至于其他的逻辑复用等特性都只是副作用而已，在脱离并发语境下是难以理解 react hooks 的设计的，本文主要讨论下一下 react 的并发设计。<br />Javascript 虽然是单线程语言，但是其仍然可以进行并发，比如 node.js 里日常使用的各种异步 api，都能帮我们编写并发的代码。如下面一个简单的 http echo 服务器就支持多个请求并发处理

```typescript
const net = require("net")
const server = net.createServer(function(socket) {
  socket.on("data", function(data) {
    socket.write(data)
  })
  socket.on("end", function() {
    socket.end()
  })
})
server.listen(8124, function() {
  console.log("server bound")
})
```

除了宿主环境提供的异步 IO，Javascript 还提供了一个另一个常被忽略的并发原语： 协程(**Coroutine)**

<a name="QAESo"></a>

# 上下文切换

在讲协程之前简单的回顾一下各种上下文切换技术，简单定义一下上下文相关的术语

- 上下文：程序运行中的一个状态
- 上下文切换：从一个上下文切换到另一个上下文的技术
- 调度：决定哪个上下文可以获得 cpu 时间片的方法

那么我们有哪些上下文切换的方式呢
<a name="4UDB1"></a>

## 进程

进程是最传统的上下文系统，每个进程都有独立的地址空间和资源句柄，每次新建进程时都需要分配新的地址空间和资源句柄（可以通过写时赋值进行节省），其好处是进程间相互隔离，一个进程 crash 通常不会影响另一个进程，坏处是开销太大<br />进程主要分为三个状态： 就绪态、运行态、睡眠态，就绪和运行状态切换就是通过调度来实现，就绪态获取时间片则切换到运行态，运行态时间片到期或者主动让出时间片(sched_yield)就会切换到就绪态，当运行态等待某系条件（典型的就是 IO 或者锁）就会陷入睡眠态，条件达成就切换到就绪态。
<a name="X5OF0"></a>

## 线程

线程是一种轻量级别的进程（linux 里甚至不区分进程和线程），和进程的区别主要在于，线程不会创建新的地址空间和资源描述符表，这样带来的好处就是开销明显减小，但是坏处就是因为公用了地址空间，可能会造成一个线程会污染另一个线程的地址空间，即一个线程 crash 掉，很可能造成同一进程下其他线程也 crash 掉
<a name="OUT8e"></a>

### 并发(concurrency)和并行(Parallelism）

[https://www.youtube.com/watch?v=cN_DpYBzKso](https://www.youtube.com/watch?v=cN_DpYBzKso)  如 rob pike 演讲所述，并发并不等于并行，并行需要多核的支持，并发却不需要。线程和进程即支持并发也支持并行。<br />并行强调的是充分发挥多核的计算优势，而并发更加强调的是任务间的协作，如 webpack 里的 uglify 操作是明显的 CPU 密集任务，在多核场景下使用并行有巨大的优势，而 n 个不同的生产者和 n 个不同消费者之间的协作，更强调的是并发。实际上我们绝大部分都是把线程和进程当做并发原语而非并行原语使用。
<a name="5CS2f"></a>

## 网络模型

在 Python 没引入 asycio 支持前，绝大部分 python 应用编写网络应用都是使用多线程|多进程模型,如考察下面简单的 echo server 实现。

```python
import socket
from _thread import *
import threading
def threaded(c):
	while True:
		data = c.recv(1024)
		if not data:
			print('Bye')
			break
		c.send(data)
	c.close()
def Main():
	host = ""
	port = 12345
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.bind((host, port))
	print("socket binded to port", port)
	s.listen(5)
	print("socket is listening")
	# a forever loop until client wants to exit
	while True:
		c, addr = s.accept()
		print('Connected to :', addr[0], ':', addr[1])
		start_new_thread(threaded, (c,))
	s.close()
if __name__ == '__main__':
	Main()
```

我们发现我们这里虽然使用了多线程，但是这里的多线程更多的是用于并发而非并行，其实我们的任务绝大部分时间都是耗在了 IO 等待上面，这时候你是单核还是多核对系统的吞吐率影响其实不大。<br />由于多进程内存开销较大，在 C10k 的时候，其创建和关闭的内存开销已基本不可接受，而多线程虽然内存开销较多进程小了不少，但是却存在另一个性能瓶颈：**调度**<br />linux 在使用 CFS 调度器的情况下，其调度开销大约为 O(logm),其中 m 为活跃上下文数，其大约等同于活跃的客户端数，因此每次线程遇到 IO 阻塞时，都会进行调度从而产生 O(logm)的开销。这在 QPS 较大的情况下是一笔不小的开销。
<a name="a91yp"></a>

### 非阻塞 IO 和事件驱动

我们发现上面多线程网络模型的开销是由两个原因导致的：

- IO 阻塞读写 socket 导致触发调度：调度频繁
- 活跃上下文数目较大导致调度开销较大：调度效率低

如果想要突破 C10k 问题，我们就需要降低调度频率和减小调度开销。我们进一步发现这两个原因甚至是紧密关联的<br />由于使用了阻塞 IO 进行读写 socket，这导致了我们一个线程只能同时阻塞在一个 IO 上，这导致了我们只能为每个 socket 分配一个线程。即阻塞 IO 即导致了我们调度频繁也导致了我们创建了过多的上下文。<br />所以我们考虑使用非阻塞 IO 去读写 socket。<br />一旦使用了非阻塞 IO 去读写 socket，就面临读 socket 的时候，没就绪该如何处理，最粗暴的方式当然是暴力重试，事实上 socket 大部分时间都是属于未就绪状态，这实际上造成了巨大的 cpu 浪费。<br />这时候就有其他两种方式就绪事件通知和异步 IO，linux 下的主流方案就是就绪事件通知，我们可以通过一个特殊的句柄来通知我们我们关心的 socket 是否就绪，我们只要将我们关心的 socket 事件注册在这个特殊句柄上，然后我们就可以通过轮训这个句柄来获取我们关心的 socket 是否就绪的信息了，这个方式区别于暴力重试 socket 句柄的方式在于，对 socket 直接进行重试，当 socket 未就绪的时候，由于是非阻塞的，会直接进入下次循环，这样一直循环下去浪费 cpu，但是对特殊句柄进行重试，如果句柄上注册是事件没有就绪，该句柄本身是会阻塞的，这样就不会浪费 cpu 了，在 linux 上这个特殊句柄就是大名鼎鼎的 epoll。使用 epoll 的好处是一方面由于避免直接使用阻塞 IO 对 socket 进行读写，降低了触发调度的频率，现在的上下文切换并不是在不同线程之间进行上下文切换，而是在不同的事件回调里进行上下文切换，这时的 epoll 处理事件回调上下文切换的复杂度是 O(1)的，所以这大大提高了调度效率。但是 epoll 在处理上下文的注册和删除时的复杂度是 O(logn),但对于大部分应用都是读写事件远大于注册事件的，当然对于那些超短链接，可能带来的开销也不小。<br />我们发现使用 epoll 进行开发 server 编程的风格如下

```python
import socket;
import select;
#开启一个Socket
HOST = '';
PORT = 1987
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind((HOST, 1987));
sock.listen(1);

#初始化Epoll
epoll = select.epoll();
epoll.register(sock.fileno(), select.EPOLLIN);

#连接和接受数据
conns = {};
recvs = {};

try:
    while True:
        #等待事件发生
        events = epoll.poll(1);
        #事件循环
        for fd, event in events:
            #如果监听的Socket有时间则接受新连接
            if fd == sock.fileno():
                client, addr = sock.accept();
                client.setblocking(0);
                #注册新连接的输入时间
                epoll.register(client.fileno(), select.EPOLLIN);
                conns[client.fileno()] = client;
                recvs[client.fileno()] = '';
            elif event & select.EPOLLIN:
                #读取数据
                while True:
                    try:
                        buff = conns[fd].recv(1024);
                        if len(buff) == 0:
                            break;
                    except:
                        break;
                    recvs[fd] += buff;
                #调整输出事件
                if len(buff) != 0:
                    epoll.modify(fd, select.EPOLLOUT);
                else:
                #如果数据为空则连接已断开
                    epoll.modify(fd, select.EPOLLHUP);
            elif event & select.EPOLLOUT:
                #发送数据
                try:
                    n = conns[fd].send(recvs[fd]);
                    recvs[fd] = '';
                    #重新调整为接收数据
                    epoll.modify(fd, select.EPOLLIN);
                except:
                    epoll.modify(fd, select.EPOLLHUP);
            elif event & select.EPOLLHUP:
                #关闭清理连接
                epoll.unregister(fd);
                conns[fd].close();
                del conns[fd];
                del recvs[fd];
finally:
    epoll.unregister(sock.fileno());
    epoll.close();
    sock.close();
```

我们发现实际上我们的业务逻辑被拆分为一系列的事件处理，而且我们发现绝大部分的网络服务基本都是这种模式，<br />那是不是可以进一步的将这种模式进行封装。epoll 其实还存在一些细节问题，如并不能直接用于普通文件，这导致使用 epoll 方案时，一旦去读写文件仍然会陷入阻塞，因此我们需要对文件读写进行特殊处理（pipe + 线程池），对于其他的异步事件如定时器，信号等也没办法通过 epoll 直接进行处理，都需要自行封装。

我们发现直接使用 epoll 进行编程时还是会需要处理大量的细节问题，而且这些细节问题几乎都是和业务无关的，我们其实不太关心内部是怎么注册 socket 事件|文件事件|定时器事件等，我们关心的其实就是一系列的事件。所以我们可以进一步的将 epoll 进行封装，只给用户提供一些事件的注册和回调触发即可。这其实就是 libuv 或者更进一步 nodejs 干的事情。<br />我们日常使用 nodejs 开发代码的风格是这样的

```javascript
var net = require("net")
var client = net.connect({ port: 8124 }, function() {
  //'connect' listener
  console.log("client connected")
  client.write("world!\r\n")
})
client.on("data", function(data) {
  console.log(data.toString())
  client.end()
})
client.on("end", function() {
  console.log("client disconnected")
})
```

此时使用事件驱动编程虽然极大的解决了服务器在 C10k 下的性能问题，但是却带来了另外的问题。

<a name="cAiEi"></a>

## 协程(coroutine)

使用事件驱动编程时碰到的一个问题是，我们的业务逻辑被拆散为一个个的 callback 上下文，且借助于闭包的性质，我们可以方便的在各个 callback 之间传递状态，然后由 runtime(比如 node.js 或者 nginx 等）根据事件的触发来执行上下文切换。<br />我们为什么需要将业务拆散为多个回调，只提供一个函数不行吗?<br />问题在于每次回调的逻辑是不一致的，如果封装成一个函数，因为普通函数只有一个 entry point，所以这实际要求函数实现里需要维护一个状态机来记录所处回调的位置。当然可以这样去实现一个函数，但是这样这个函数的可读性会很差。<br />假如我们的函数支持多个入口，这样就可以将上次回调的记过自然的保存在函数闭包里，从下个入口进入这个函数可以自然的通过闭包访问上次回调执行的状态，即我们需要一个可唤醒可中断的对象，这个可唤醒可中断的对象就是 coroutine。

我没找到 coroutine 的精确定义，而且不同语言的 coroutine 实现也各有不同，但基本上来说 coroutine 具有如下两个重要性质

- 可唤醒可中断的函数
- 不可抢占

这里我们可以将其和函数和线程对比

- 相比函数：其是可唤醒可中断，有多个入口
- 相比线程：其是不可抢占的，不需要对临界区进行加锁处理

回忆一下我们的 js 里是否有对象满足这两个性质呢，很明显因为 JS 是单线程的，所以不可抢占这个性质天然满足，我们只需要考虑第一个性质即可，答案已经很明显了，Generator 和 Async/Await 就是 coroutine 的一种实现。

<a name="KtiNx"></a>

### Generator: 半协程

如此文所示[https://zhuanlan.zhihu.com/p/98745778](https://zhuanlan.zhihu.com/p/98745778)， Generator 刚开始只是作为简化 Iterableiterator 的实现，后来渐渐的在此之上加上了 coroutine 的功能。<br />虽然 Javascript 里 Generator 对 coroutine 的支持是一步到位的，但是 Python 里 generator 对 coroutine 的支持却是慢慢演进的，感兴趣的可以看看 Python 里的 Generator 是如何演变为 Coroutine 的([https://www.python.org/dev/peps/pep-0255/](https://www.python.org/dev/peps/pep-0255/), [https://www.python.org/dev/peps/pep-0289/](https://www.python.org/dev/peps/pep-0289/), [https://www.python.org/dev/peps/pep-0342/](https://www.python.org/dev/peps/pep-0342/)  等等)<br />我们的 Generator 可以同时作为生产者和消费者使用<br />作为生产者的 generator

```typescript
function* range(lo, hi) {
  while (lo < hi) {
    yield lo++
  }
}

console.log([...range(0, 5)]) // 输出 0,1,2,3,4,5
```

作为消费者的 Generator

```typescript
function* consumer() {
  let count = 0
  try {
    while (true) {
      const x = yield
      count += x
      console.log("consume:", x)
    }
  } finally {
    console.log("end sum:", count)
  }
}
const co = consumer()
co.next()
for (const x of range(1, 5)) {
  co.next(x)
}
co.return()
/*
输出结果
produce: 1
consume: 1
produce: 2
consume: 2
produce: 3
consume: 3
produce: 4
consume: 4
end sum: 10
*/
```

如果熟悉 RXJS 的同学，RXJS 里也有个对象可以同时作为生产者和消费者即 Subject，这实际上使得我们可以将 Generator 进一步的作为管道或者 delegator 来使用，Generator 通过 yield \* 更进一步的支持了该用法而且还可以在递归场景下使用。<br />如下我们可以通过 yield from 支持将一个数组打平

```typescript
function* flatten(arr) {
  for (const x of arr) {
    if (Array.isArray(x)) {
      yield* flatten(x)
    } else {
      yield x
    }
  }
}

console.log([...flatten([1, [2, 3], [[4, 5, 6]]])])
```

此做法相比于传统的递归实现，在于其可以处理无限深度的元素（传统递归在这里就挂掉了）

上面的 Generator 更多的在于将其当做一种支持多值返回的函数使用，然而假如我们将每个 generator 都当做一个 task 使用的话，将会发现更多威力。如笔者之前的文章里[https://zhuanlan.zhihu.com/p/24737272](https://zhuanlan.zhihu.com/p/24737272)，可以用 generator 来进行 OS 的模拟,Generator 在离散事件仿真领域发挥了重大作用（自己用 generator 来实现个排序动画试试）。<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/103463/1577525286471-adb282c9-52ec-4544-90bc-0b337d4bfbf6.png#align=left&display=inline&height=95&name=image.png&originHeight=190&originWidth=1354&size=59304&status=done&style=none&width=677)<br />generator 虽然具有上述功能，但还是有个很大的局限。观察下述代码

```typescript
function caller() {
  const co = callee()
  co.next()
  co.next("step1")
  co.next("step2")
}
function* callee() {
  // do something
  step1 = yield
  console.log("step1:", step1)
  step2 = yield
  console.log("step2:", step2)
}
caller()
```

我么发现虽然我们的 callee 可以主动的让出时间片，但是下一个调度的对象并不是随机选择的，下一个调度的对象必然是 caller，这是一个很大的局限，这里意味着 caller 可以决定任意 callee 的调度，但是 callee 却只能调度 caller，这里存在明显的不对称性，因此 Generator 也被称为非对称协程或者叫半协程（在 python 里叫 Simple Coroutine)，虽然我们可以通过[https://en.wikipedia.org/wiki/Trampoline\_(computing)](<https://en.wikipedia.org/wiki/Trampoline_(computing)>)  来自己封装一个 scheduler 来决定下一个任务（实际上 co 就是个 Trampoline 实现）实现任意任务的跳转，但是我们还是期望有个真正的协程。

<a name="aUF91"></a>

### Async/Await: 协程 + 异步 = 支持异步任务调度的协程

上面讲到 Generator 的最大限制在于 coroutine 只能 yield 给 caller，这在实际应用中存在较大的局限，例如一般的调度器是根据优先级进行调度，这个优先级可能是任务的触发顺序也有可能是任务本身手动指定的优先级，考虑到大部分的 web|server 应用，绝大部分场景都是处理异步任务，所以如果能内置异步任务的自动调度，那么基本上可以满足大部分的需求。

```typescript
const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })
async function task1() {
  while (true) {
    await sleep(Math.random() * 1000)
    console.log("task1")
  }
}
async function task2() {
  while (true) {
    await sleep(Math.random() * 1000)
    console.log("task2")
  }
}
async function task3() {
  while (true) {
    await sleep(Math.random() * 1000)
    console.log("task3")
  }
}

function main() {
  task1()
  task2()
  task3()
  console.log("start task")
}
main()
```

此时我们发现我们能够进行任意任务之间的跳转，如 task1 调度到 task2 后，然后 task2 又调度到 task3，此时的调度行为完全由内置的调度器根据异步事件的触发顺序来决定的。虽然 async/await 异常方便，但是仍然存在诸多限制

- 必须在 async 函数里才能使用 yield(await), async 函数存在向上的传染性，导致自顶向上都需要改成 async 函数，可参考[https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)
- 不支持优先级调度：其调度规则是内置的按照事件触发顺序进行调度，实际应用中可能需要根据优先级进行调度

<a name="WSI3Q"></a>

### React Fiber： 框架层控制的支持同步任务和优先级的协程

事实上 React Fiber 是另一种协程的实现方式，事实上 React 的 coroutine 的实现经历过几次变动<br />如[https://github.com/facebook/react/pull/8840](https://github.com/facebook/react/pull/8840)，fiber 大部分情况下和 coroutine 的功能相同均支持[cooperative multitasking](https://en.wikipedia.org/wiki/Cooperative_multitasking)，主要的区别在于 fiber 更多的是系统级别的，而 coroutine 则更多的是 userland 级别的，由于 React 并没有直接暴露操作 suspend 和 resume 的操作，更多的是在框架级别进行 coroutine 的调度，因此叫 fiber 可能更为合理（但估计更合理的名字来源于 ocaml 的 algebraic effect 是通过 fiber 实现的）。<br />React 之所以没有直接利用 js 提供的 coroutine 原语即 async|await 和 generator，其主要原因在于<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/103463/1577536516731-410cf62e-c00a-4505-b492-885ef88af795.png#align=left&display=inline&height=788&name=image.png&originHeight=1576&originWidth=1388&size=272798&status=done&style=none&width=694)

没使用 Async|await 的原因也与此类似，为了更加细粒度的进行任务调度，react 通过 fiber 实现了自己协程。

<a name="SyPPY"></a>

## React Hooks: For Concurrency !!!

<a name="S8eok"></a>

### 单线程非抢占： 无锁的世界

react 通过 fiber 迈入了并发的世界，然而并发世界充满了各种陷阱，接触过多线程编程的同学可能都知道编写一个线程安全的函数是多么困难(试着用 c++写一个线程安全的单例试试），那么 react 为什么非要进入这个泥淖呢。<br />很幸运的是，由于 Javascript 是单线程的，我们天然的避免了多线程并行的各种 edge case，实际上我们只需要处理好并发安全即可。

- 单线程非抢占：意味着我们上下文切换之间的代码是天然临界区，我们并需要使用锁来保护临界区，其天然是线程安全的。

在多线程环境下，任意的共享变量的修改，都需要使用锁去保护，否则就不是线程安全的。<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/103463/1577537506680-7090c5ce-e6e2-4e7d-b17d-a23013425549.png#align=left&display=inline&height=451&name=image.png&originHeight=902&originWidth=2042&size=605694&status=done&style=none&width=1021)

而下述代码始终是线程安全的

```typescript
class Count {
  count = 0
  add() {
    this.count++
  }
}
```

<a name="rHLff"></a>

### 可重入性：shared mutable state is the root of all evil

然而单线程并不是万能灵药，即使我们拜托了并行可抢占带来的问题，但是可重入的问题，仍然需要我们解决。<br />可重入性是指一个函数可以安全的支持并发调用，在单线程的 Javascript 里似乎并不存在同时调用一个函数的情形，实际并非如此，最最常见的递归就是一个函数被并发调用,如上面提到的 flatten 函数(即使非递归也可能存在可重入）

```typescript
function* flatten(arr) {
  for (const x of arr) {
    if (Array.isArray(x)) {
      yield* flatten(x)
    } else {
      yield x
    }
  }
}

console.log([...flatten([1, [2, 3], [[4, 5, 6]]])])
```

例如我们传入 arr = [[1]]，其调用链如下

```typescript
flatten([[[1]]])
 // flatten start
 => flatten([[1]])
   =>  flatten([1]) // 这里实际同时存在了三个flatten的调用
```

一个常见的非可重入安全函数如下

```typescript
const state = {
  name: "yj",
}
function test() {
  console.log("state:", state.name.toUpperCase())
  state.name = null
}
test()
test() // crash
```

我们发现第二次的调用是由于第一次调用偷偷修改了 state 的导致，而 test 前后两次调用共享了外部的 state，大家肯定回想，一般肯定不会犯这个错误，于是将代码修改如下

```typescript
const state = {
  name: "yj",
}

function test(props) {
  console.log("state:", state.name.toUpperCase())
  state.name = null
}
test(state)
test(state) // state
```

虽然此时我们摆脱了全局变量，但是由于前后两个 props 实际上指向的仍然是同一个对象，我们的代码仍然 crash 掉，实际上不仅仅是 crash 是个问题，下述代码在某些场景下依然存在问题

```typescript
function* app() {
  const btn1 = Button();
  yield; // 插入点
  const btn2 = Button();
  yield [btn1, btn2];
}
function* app2() {
  yield Alert();
}
let state = {
  color: "red"
};
function useRef(init) {
  return {
    current: init
  };
}

function Button() {
  const stateRef = useRef(state);
  return stateRef.current.color;
}
function Alert() {
  const stateRef = useRef(state);
  stateRef.current.color = "blue";
  return stateRef.current.color;
}
function main() {
  const co = app();
  const co2 = app2();
  co.next();
  co2.next();
  co2.next();
  console.log(co.next());
}

main();
// 输出结果
{ value: [ 'red', 'blue' ], done: false }
```

此时我们发现我们的打印结果，虽然使用了同一个 button，但是结果是不一致的，这基本上可以对应如下的 React 代码

```typescript
function App2(){
  return (
    <>
    <Button />
    <Yield /> // 相当于插入了个yield
    <Button />
    </>
   )
}
function App2(){
   return (
     <Alert />
   )
}
function Button(){
  const state = useContext(stateContext);
  return state.color
}
function Alert(){
   const state = useContext(stateContext);
   state.color = 'blue';
   return state.color;
}
function App(){
  return (
    <App1/>
    <Yield/> // 相当于插入了个yield
    <App2/>
   );
}

ReactDOM.render(
  <StateProvider value={store}>
     <App/>
 </StateProvider>);
```

在 ConcurrentMode 下，相当于每个相邻的 Fiber node 之间都插入了 yield 语句，这使得我们的组件必须要保证组件是重入安全的，否则就可能造成页面 UI 的不一致，更严重的会造成页面 crash，这里出现问题的主要原因在于

- Alert 和 Button 访问了共享的 State 变量
- Alert 在 render 期间且修改了 State 变量

所以 React 官方要求用户在 render 期间禁止做任何副作用。
