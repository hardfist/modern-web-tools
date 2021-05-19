
#include <emscripten/bind.h>
#include <iostream>
using namespace emscripten;
struct Array10 {
  int &get2(size_t index) { return data[index]; }
  int data[10];
};

val Array10_get(Array10 &arr, size_t index) {
  if (index < 10) {
    return val(arr.get2(index));
  } else {
    return val::undefined();
  }
}

EMSCRIPTEN_BINDINGS(non_member_functions) {
  class_<Array10>("Array10")
      .function("get", &Array10_get)
      .constructor<>()
      .function("get2", &Array10::get2);
}
class MyClass {
public:
  void someFunction() {}
};
MyClass *makeMyClass(int, float) { return new MyClass(); } // Factory function.

EMSCRIPTEN_BINDINGS(external_constructors) {
  class_<MyClass>("MyClass")
      .constructor(&makeMyClass, allow_raw_pointers())
      .function("someFunction", &MyClass::someFunction);
}

class C {
public:
  C() { printf("C\n"); }
  ~C() { printf("~C\n"); }
};
C *passThrough(C *ptr) { return ptr; };
EMSCRIPTEN_BINDINGS(raw_pointers) {
  class_<C>("C").constructor<>();
  emscripten::function("passThrough", &passThrough, allow_raw_pointers());
};
typedef struct Point {
  int x;
  int y;
} Point;
typedef Point (*Fn)();
typedef double (*FnWeb)();
struct Callback {
  virtual Point callback() = 0;
};
struct CallbackWrapper : public emscripten::wrapper<Callback> {
  EMSCRIPTEN_WRAPPER(CallbackWrapper);
  Point callback() { return call<Point>("callback"); }
};
struct Test {
public:
  int cnt = 0;
  Test() {}
  ~Test() { printf("destructor\n"); }
  Fn cb = nullptr;
  FnWeb webCb = nullptr;
  std::unique_ptr<Callback> m_callback;
  void add() { this->cnt++; }
  void dec() { this->cnt--; }
  int getCnt() { return this->cnt; }
  Point realCb() {
    double x = webCb();
    std::cout << "x" << x << std::endl;
    auto p = Point{.x = 10, .y = 1000};
    return p;
  }
  void setCb(emscripten::val _cb) {
    val addFunction = val::module_property("addFunction");
    val f_ptr = addFunction(_cb, std::string("d"));
    int f_ptr_int = f_ptr.as<int>();
    webCb = reinterpret_cast<FnWeb>(f_ptr_int);
  }
  void setCallback(Callback *callback) { m_callback.reset(callback); }
  Point callCallback() { return m_callback->callback(); }
  val getGlobal() { return val::module_property("addFunction"); }
  int getCb() { return 0; }
  Point callCb() {
    Point pb = realCb();
    std::cout << "pb" << pb.x << pb.y << std::endl;
    return pb;
  }
};

EMSCRIPTEN_BINDINGS(cls) {
  class_<Test>("Test")
      .constructor<>()
      .function("add", &Test::add)
      .function("dec", &Test::dec)
      .function("getCnt", &Test::getCnt)
      .function("setCb", &Test::setCb)
      .function("getCb", &Test::getCb)
      .function("getGlobal", &Test::getGlobal)
      .function("callCb", &Test::callCb)
      .function("setCallback", &Test::setCallback, allow_raw_pointers())
      .function("callCallback", &Test::callCallback, allow_raw_pointers());
  value_object<Point>("PersonRecord")
      .field("x", &Point::x)
      .field("y", &Point::y);
  class_<Callback>("Callback")
      .function("callback", &Callback::callback, pure_virtual())
      .allow_subclass<CallbackWrapper>("CallbackWrapper");
}

std::vector<int> returnVectorData() {
  std::vector<int> v(10, 1);
  return v;
}

std::map<int, std::string> returnMapData() {
  std::map<int, std::string> m;
  m.insert(std::pair<int, std::string>(10, "This is a string."));
  return m;
}

EMSCRIPTEN_BINDINGS(module) {
  function("returnVectorData", &returnVectorData);
  function("returnMapData", &returnMapData);

  // register bindings for std::vector<int> and std::map<int, std::string>.
  register_vector<int>("vector<int>");
  register_map<int, std::string>("map<int, string>");
}