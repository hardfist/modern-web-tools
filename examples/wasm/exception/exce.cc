#include <emscripten/bind.h>
#include <stdio.h>
using namespace emscripten;
int add() { throw "wtf"; }

EMSCRIPTEN_BINDINGS(Bindings) { function("add", &add); };

std::string getExceptionMessage(intptr_t exceptionPtr) {
  return std::string(reinterpret_cast<std::exception *>(exceptionPtr)->what());
}

EMSCRIPTEN_BINDINGS(exe) {
  emscripten::function("getExceptionMessage", &getExceptionMessage);
};