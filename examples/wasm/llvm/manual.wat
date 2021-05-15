(module
  (func (result i32)
    (i32.const 42)
  )
  (func (param $p0 i32) (param $p1 i32) (result i32)
    global.get $max
    local.get $p1
    i32.add
  )
  (export "helloWorld" (func 0))
  (export "add" (func 1))
  (global $max i32 (i32.const 1024))
  (global $total (mut i32) (i32.const 1025))
)