const fs = require("fs");
const COS = require('cos-nodejs-sdk-v5');
// 创建实例

module.exports = postcss.plugin('postcss-cos', opts => {
    opts = opts || {}
    const cos = new COS({
        SecretId: opts.secretId, // 'AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        SecretKey: opts.secretKey //'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const appId = opts.appId,
        bucket = opts.bucket,
        region = opts.region;

    async function uploadFile(key, file, retry) {
        var state = fs.statSync(file);
        return new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: bucket + '-' + appId,
                Region: region,
                Key: key,
                ContentLength: state.size,
                Body: fs.createReadStream(file),
                onProgress: function onProgress(progressData) {
                    console.log("正在上传", key, progressData);
                }
            }, (err, data) => {
                if (err) {
                    console.error("上传文件出错", err);
                    reject()
                }
                if (data && +data.statusCode === 200) {
                    var url = data.url;
                    resolve(url);
                } else if (retry) {
                    uploadFile(file, key, retry - 1).then(resolve, reject);
                } else {
                    reject()
                }
            })

        });
    }
    // Work with options here
    return function (root) {
        let uploadList = []
        root.walkDecls(/background/, decl => {
            decl.value = decl.value.replace(/.+(png|svg|jpg|gif)/, match => {

                console.log(match);

                let file = path.join(process.cwd(), match)
                let hash = md5File.sync(file, match)
                // let upload = uploadFile(hash, file, 3);
                // uploadList.push(upload)
                return [opts.baseUrl || '', hash].join('/')
            })
        })
        return Promise.all(uploadList)
    }
})