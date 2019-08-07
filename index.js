const postcss = require('postcss')
const path = require("path");
const fs = require("fs");
const md5File = require('md5-file');
const COS = require('cos-nodejs-sdk-v5');
const ora = require('ora');


const tip = (src, dest) => {
    return `上传文件[${src} - > ${dest}]`;
};

// 创建实例

module.exports = postcss.plugin('postcss-cos', opts => {
    opts = opts || {}
    const cos = new COS({
        SecretId: opts.secretId,
        SecretKey: opts.secretKey
    });
    const bucket = opts.bucket,
        region = opts.region;

    async function headFile(key) {
        return new Promise((resolve, reject) => {
            cos.headObject({
                Bucket: bucket,
                Region: region,
                Key: key,
            }, (err, data) => {
                if (err) {
                    if (err.statusCode == 404) {
                        resolve(false)
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(true)
                }
            })
        })

    }
    async function uploadFile(key, file, retry) {
        var exists = await headFile(key);
        if (exists) {
            return;
        }
        var state = fs.statSync(file);
        return new Promise((resolve, reject) => {
            let spinner = ora({
                text: tip(file, key),
                color: 'green'
            }).start();
            cos.putObject({
                Bucket: bucket,
                Region: region,
                Key: key,
                ContentLength: state.size,
                Body: fs.createReadStream(file)
            }, (err, data) => {
                spinner.succeed();
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
            var matchs = decl.value.match(/url\(['|"](.+)['|"]\)/i);
            if (matchs) {
                var target_file = matchs[1];
                var source_dirname = path.dirname(root.source.input.file);
                var full_path = path.resolve(source_dirname, target_file);
                const hash = md5File.sync(full_path);
                var key = `${opts.path || 'weapp'}/${hash}`;
                uploadList.push(uploadFile(key, full_path, 3));
                var url = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
                if (opts.cdnDomain) {
                    url = `${opts.cdnDomain}/` + key
                }
                decl.value = `url("${url}")`;
            }
        })
        return Promise.all(uploadList)
    }
})