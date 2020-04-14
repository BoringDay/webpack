
const fs = require('fs')
const path = require('path')
const babylon = require('@babel/parser') // ES6 的代码转成 ast
const traverse = require('@babel/traverse').default // 拿到ast信息
const babel = require('@babel/core') // ES6 的代码转成 ES5

let ModuleID = 0

// 单个文件输出文件信息
function createAsset (fileName) {
  // 获取文件内容
  const content = fs.readFileSync(fileName, 'utf-8')
  // 获取文件内容语法树
  const ast = babylon.parse(content, {
    sourceType: 'module'
  })

  // 遍历当前ast拿到依赖项（抽象语法树）
  const dependencies = []
  traverse(ast, {
    // 找到有 import语法 的对应节点
    ImportDeclaration: ({ node }) => {
      /**
       * 把当前依赖的模块加入到数组中，其实这存的是字符串，
       * 例如 如果当前js文件 有一句 import message from './message.js'
       * './message.js' === node.source.value
      */
      dependencies.push(node.source.value)
    }
  })

  // 将es6转换成es5
  const { code } = babel.transformFromAstSync(ast, null, {
    presets: ['@babel/preset-env']
  })

  return {
    id: ModuleID++,
    fileName,
    code,
    dependencies
  }
}

// 生成文件关系索引
function createGraph (entry) {
  const mainAsset = createAsset(entry)
  const queue = [mainAsset]

  // 用for广度遍历：数组会跟进数据动态变化而去继续遍历
  for (const asset of queue) {
    const dirname = path.dirname(asset.fileName)
    asset.mapping = {}

    asset.dependencies.forEach(relativePath => {
      const absolutePath = path.join(dirname, relativePath)
      const subAsset = createAsset(absolutePath)
      asset.mapping[relativePath] = subAsset.id
      queue.push(subAsset)
    })
  }

  return queue
}

// 根据依赖项合并生成最终代码
function bundle (graph) {
  let modules = ''
  graph.forEach(asset => {
    modules += `${asset.id}: [function (require, modele, exports) {
      ${asset.code}
    },${JSON.stringify(asset.mapping)}],`
  })

  const result = `
    (function(modules){
      //创建require函数， 它接受一个模块ID（这个模块id是数字0，1，2） ，它会在我们上面定义 modules 中找到对应是模块.
      function require(id){
        const [fn, mapping] = modules[id];
        function localRequire(relativePath){
          //根据模块的路径在mapping中找到对应的模块id
          return require(mapping[relativePath]);
        }
        const module = {exports:{}};
        //执行每个模块的代码。
        fn(localRequire,module,module.exports);
        return module.exports;
      }
      //执行入口文件，
      require(0);
    })({${modules}})
  `

  return result
}

const graph = createGraph('./src/entry.js')
const result = bundle(graph)

// 打包生成文件
fs.writeFileSync('./dist/bundle.js', result)
