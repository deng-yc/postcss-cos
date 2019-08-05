

### 使用

```

.foo{
    background:url('./images/test.png')
}

```
编译后
```
.foo{
    background:url('https://cdn.io/weapp/[hash]')
}
```

### 安装

```
npm install postcss-cos --save-dev

yarn add postcss-cos
```


###配置

> postcss
```
postcss([
  require("postcss-cos")({
    domain: "http://cdn.io"  //自定义cdn域名
    secretId: 'AKxxxxxxxxxxxxxxxxxxxxxx',
    secretKey: 'xxxxxxxxxxxxxxxxxxxxxx',
    bucket: 'xxxx-125000000',
    region: 'ap-chengdu',
    path:""   //上传到cos的路径,默认为weapp
  })
]);

```

> tarojs

```
weapp: {
    module: {
      postcss: {
        autoprefixer: {
          enable: true
        },
        "postcss-assets-urls": {
          enable: true,
          config: {
            domain: "http://cdn.io"  //自定义cdn域名
            secretId: 'AKxxxxxxxxxxxxxxxxxxxxxx',
            secretKey: 'xxxxxxxxxxxxxxxxxxxxxx',
            bucket: 'xxxx-125000000',
            region: 'ap-chengdu',
            path:""   //上传到cos的路径,默认为weapp
          }
        }
      }
    }
  },
```