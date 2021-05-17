#include <emscripten/bind.h>

using namespace emscripten;

float lerp(float a, float b, float t) {
    return (1 - t) * a + t * b;
}

EMSCRIPTEN_BINDINGS(my_module) {
    function("lerp", &lerp);
}


class MyClass {
public:
  MyClass(int x, std::string y)
    : x(x)
    , y(y)
  {}

  void incrementX() {
    ++x;
  }

  int getX() const { return x; }
  void setX(int x_) { x = x_; }

  static std::string getStringFromInstance(const MyClass& instance) {
    return instance.y;
  }

private:
  int x;
  std::string y;
};

// Binding code
EMSCRIPTEN_BINDINGS(my_class_example) {
  class_<MyClass>("MyClass")
    .constructor<int, std::string>()
    .function("incrementX", &MyClass::incrementX)
    .property("x", &MyClass::getX, &MyClass::setX)
    .class_function("getStringFromInstance", &MyClass::getStringFromInstance)
    ;
}


struct Point2f {
    float x;
    float y;
};

struct PersonRecord {
    std::string name;
    int age;
};

    // Array fields are treated as if they were std::array<type,size>
    struct ArrayInStruct {
            int field[2];
    };

PersonRecord findPersonAtLocation(Point2f){
  PersonRecord record = {"hello", 20};
  return record;
}

EMSCRIPTEN_BINDINGS(my_value_example) {
    value_array<Point2f>("Point2f")
        .element(&Point2f::x)
        .element(&Point2f::y)
        ;

    value_object<PersonRecord>("PersonRecord")
        .field("name", &PersonRecord::name)
        .field("age", &PersonRecord::age)
        ;

            value_object<ArrayInStruct>("ArrayInStruct")
                    .field("field", &ArrayInStruct::field) // Need to register the array type
                    ;

            // Register std::array<int, 2> because ArrayInStruct::field is interpreted as such
            value_array<std::array<int, 2>>("array_int_2")
                    .element(emscripten::index<0>())
                    .element(emscripten::index<1>())
                    ;

    function("findPersonAtLocation", &findPersonAtLocation);
}





struct Interface {
    virtual void invoke(const std::string& str) = 0;
};

struct InterfaceWrapper : public wrapper<Interface> {
    EMSCRIPTEN_WRAPPER(InterfaceWrapper);
    void invoke(const std::string& str) {
        return call<void>("invoke", str);
    }
};

EMSCRIPTEN_BINDINGS(interface) {
    class_<Interface>("Interface")
        .function("invoke", &Interface::invoke, pure_virtual())
        .allow_subclass<InterfaceWrapper>("InterfaceWrapper")
        ;
}