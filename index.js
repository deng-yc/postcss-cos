const postcss = require('postcss')
const path = require("path");
const fs = require("fs");
const md5File = require('md5-file');
const COS = require('cos-nodejs-sdk-v5');
const ora = require('ora');


const tip = (uploaded, total, file) => {
    let percentage = total == 0 ? 0 : Math.round((uploaded / total) * 100);
    return `Uploading to Tencent COS[${file}]: ${percentage == 0 ? '' : percentage + '% '}${uploaded}/${total} files uploaded`;
};

// 创建实例

module.exports = postcss.plugin('postcss-cos', opts => {
    opts = opts || {}
    const cos = new COS({
        SecretId: opts.secretId, // 'AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        SecretKey: opts.secretKey //'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const bucket = opts.bucket,
        region = opts.region;
    async function uploadFile(key, file, retry) {
        var state = fs.statSync(file);
        return new Promise((resolve, reject) => {
            let spinner = ora({
                text: tip(0, 0, key),
                color: 'green'
            }).start();
            cos.putObject({
                Bucket: bucket,
                Region: region,
                Key: key,
                ContentLength: state.size,
                Body: fs.createReadStream(file),
                onProgress: function onProgress(progressData) {
                    if (progressData) {
                        const { loaded, total } = progressData;
                        spinner.text = tip(loaded, total, key);
                    }
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
            var matchs = decl.value.match(/url\(['|"](.+)['|"]\)/i);
            if (matchs) {
                var target_file = matchs[1];
                var source_dirname = path.dirname(root.source.input.file);
                var full_path = path.resolve(source_dirname, target_file);
                const hash = md5File.sync(full_path);
                var key = `${opts.path || 'weapp'}/${hash}`;
                uploadList.push(uploadFile(key, full_path, 3));
                var url = `https://${bucket}.cos-website.${region}.myqcloud.com/${key}`;
                if (opts.cdnDomain) {
                    url = `${opts.cdnDomain}/` + key
                }
                decl.value = `url("${url}")`;
            }
        })
        return Promise.all(uploadList)
    }
})