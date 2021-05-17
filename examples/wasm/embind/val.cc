
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <iostream>

using namespace emscripten;

void add(int a, int b, emscripten::val cb) { cb(a + b); }
typedef struct Point {
  int x;
  int y;
} Point;
typedef Point (*Fn)();
struct Test {
public:
  Test() {}
  Fn cb = nullptr;
  void setCb(emscripten::val _cb) {
    val addFunction = val::module_property("addFunction");
    val f_ptr = addFunction(_cb);
    int f_ptr_int = f_ptr.as<int>();
    cb = reinterpret_cast<Fn>(f_ptr_int);
  }
  val getGlobal() { return val::module_property("addFunction"); }
  int getCb() { return 0; }
  Point callCb() { 
    Point pb = cb(); 
    std::cout<<"pb"<<pb.x<<pb.y<<std::endl;
    return pb;
  }
};

EMSCRIPTEN_BINDINGS(fn) { function("add", &add); }

EMSCRIPTEN_BINDINGS(cls) {
  class_<Test>("Test")
      .constructor<>()
      .function("setCb", &Test::setCb)
      .function("getCb", &Test::getCb)
      .function("getGlobal", &Test::getGlobal)
      .function("callCb", &Test::callCb);
  value_object<Point>("PersonRecord")
      .field("x", &Point::x)
      .field("y", &Point::y);
}
