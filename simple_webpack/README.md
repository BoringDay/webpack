## 造一个simple_webpack的轮子

## 命令
```
npm run start //生成文件
npm run build //执行生成代码
```

## 生成最终模块原理
```
// 最终生成模板调用原理

(function (modules) {
  function require (id) {
    const [fn, mapping] = modules[id]

    // 提供一个查找模板的方法
    function localRequire (relativePath) {
      return modules[mapping[relativePath]]
    }
    
    // 定义一个默认模块输出对象，执行fn方法的时候把其他export到当前export上面去
    const module = { exports: {} }

    // 执行每个模块的代码
    fn(localRequire, module, module.exports)

    return module.exports
  }

  // 执行入口文件
  require(0)
})(
  { 0: [function (require, modele, exports) {
    var _name = require('./name.js')
    console.log(_name._name)
  }, { './name.js': 1 }],
  1: [function (require, modele, exports) {
    exports.name = '嘻嘻嘻'
  }]
  }
)

```

## 参考https://github.com/dykily/simple_webpack