// ==UserScript==
// @name         media-source-extract
// @namespace    https://github.com/Momo707577045/media-source-extract
// @version      0.8.2
// @description  https://github.com/Momo707577045/media-source-extract 配套插件
// @author       Momo707577045
// @include      youtube.com
// @exclude      http://blog.luckly-mjw.cn/tool-show/media-source-extract/player/player.html
// @downloadURL	 https://blog.luckly-mjw.cn/tool-show/media-source-extract/media-source-extract.user.js
// @updateURL	   https://blog.luckly-mjw.cn/tool-show/media-source-extract/media-source-extract.user.js
// @grant        none
// @run-at document-start
// ==/UserScript==

(function () {
    'use strict';
    // 中断所有下载操作
    function abortDownloads() {
        _sourceBufferList.forEach(sourceBuffer => {
            sourceBuffer.streamWriter && sourceBuffer.streamWriter.abort();
        });
    }

    function clearBufferListIfZeroBuffer() {
        const videoElements = document.getElementsByTagName('video');
        const bufferedEnd = videoElements[0].buffered.end(0);

        if (bufferedEnd === 0) {
            // 清空已捕获列表
            _sourceBufferList.forEach(sourceBuffer => {
                sourceBuffer.bufferList = [];
            });
            // 重置已捕获片段数
            sumFragment = 0;
            $downloadNum.innerHTML = `已捕获 ${sumFragment} 个片段`;
            $tenRate.innerHTML = '快速跳转捕获';
        }
    }

    // 在页面即将刷新时清空已捕获的片段和文件列表
    window.addEventListener('beforeunload', function (event) {
        // 清空已捕获列表
        _sourceBufferList.forEach(sourceBuffer => {
            sourceBuffer.bufferList = [];
        });
        // 中断所有下载操作
        abortDownloads();
        // 重置已捕获片段数
        sumFragment = 0;
    });

    // 保存当前页面的URL
    let currentURL = window.location.href;
    // 创建 MutationObserver 实例
    const observer = new MutationObserver(function (mutationsList, observer) {
        // 监听到页面内容变化时的处理逻辑
        mutationsList.forEach(mutation => {
            // 检查是否有URL变化
            if (mutation.type === 'childList' && mutation.target.nodeName === 'HEAD') {
                // 获取最新的页面URL
                const newURL = window.location.href;
                // 判断页面URL是否发生变化
                if (newURL !== currentURL) {
                    // 更新当前页面的URL
                    currentURL = newURL;
                    // 清空已捕获列表
                    _sourceBufferList.forEach(sourceBuffer => {
                        sourceBuffer.bufferList = []
                    });
                    // 重置已捕获片段数
                    sumFragment = 0;
                    $downloadNum.innerHTML = `已捕获 ${sumFragment} 个片段`;
                    $tenRate.innerHTML = '快速跳转捕获';
                }
            }
        });
    });

    // 配置 MutationObserver，监视头部元素变化
    const observerConfig = {
        childList: true
    };
    // 开始监视头部元素的变化
    observer.observe(document.querySelector('head'), observerConfig);

    // 获取页面中所有的视频元素
    const videoElements = document.getElementsByTagName('video');

    // 遍历视频元素并为每个元素添加事件监听器
    Array.from(videoElements).forEach(video => {
        video.addEventListener('progress', clearBufferListIfZeroBuffer);
    });


    if (document.getElementById('media-source-extract')) {
        return
    }

    // 复写 call 函数，绕过劫持检查
    Function.prototype.toString.call = function (caller) {
        return `'function ${caller.name}() { [native code] }'`
    }

    // 轮询监听 iframe 的加载
    setInterval(() => {
        try {
            Array.prototype.forEach.call(document.getElementsByTagName('iframe'), (iframe) => {
                // 若 iframe 使用了 sandbox 进行操作约束，删除原有 iframe，拷贝其备份，删除 sandbox 属性，重新载入
                // 若 iframe 已载入，再修改 sandbox 属性，将修改无效。故通过新建 iframe 的方式绕过
                if (iframe.hasAttribute('sandbox')) {
                    const parentNode = iframe.parentNode;
                    const tempIframe = iframe.cloneNode()
                    tempIframe.removeAttribute("sandbox");
                    iframe.remove()
                    parentNode.appendChild(tempIframe);
                }
            })
        } catch (error) {
            console.log(error)
        }
    }, 1000)


    let sumFragment = 0 // 已经捕获的所有片段数
    let isStreamDownload = false // 是否使用流式下载
    let isDownloadClicked = false // 是否点击过下载按钮
    let _sourceBufferList = [] // 媒体轨道
    let $fastCapture = false;
    const $showBtn = document.createElement('div') // 展示按钮
    const $btnDownload = document.createElement('div') // 下载按钮
    const $btnStreamDownload = document.createElement('div') // 流式下载按钮
    const $downloadNum = document.createElement('div') // 已捕获视频片段数
    const $tenRate = document.createElement('div') // 十倍速播放
    const $closeBtn = document.createElement('div') // 关闭
    const $container = document.createElement('div') // 容器
    $closeBtn.innerHTML = `
    <img style="
      padding-top: 4px;
      width: 24px;
      display: inline-block;
      cursor: pointer;
    " src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAAk1BMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////ROyVeAAAAMHRSTlMA1Sq7gPribxkJx6Ey8onMsq+GTe10QF8kqJl5WEcvIBDc0sHAkkk1FgO2ZZ+dj1FHfPqwAAACNElEQVRIx6VW6ZqqMAwtFlEW2Rm3EXEfdZa+/9PdBEvbIVXu9835oW1yjiQlTWQE/iYPuTObOTzMNz4bQFRlY2FgnFXRC/o01mytiafP+BPvQZk56bcLSOXem1jpCy4QgXvRtlEVCARfUP65RM/hp29/+0R7eSbhoHlnffZ8h76e6x1tyw9mxXaJ3nfTVLd89hQr9NfGceJxfLIXmONh6eNNYftNSESRmgkHlEOjmhgBbYcEW08FFQN/ro6dvAczjhgXEdQP76xHEYxM+igQq259gLrCSlwbD3iDtTMy+A4Yuk0B6zV8c+BcO2OgFIp/UvJdG4o/Rp1JQYXeZFflPEFMfvugiFGFXN587YtgX7C8lRGFXPCGGYCCzlkoxJ4xqmi/jrIcdYYh5pwxiwI/gt7lDDFrcLiMKhBJ//W78ENsJgVUsV8wKpjZBXshM6cCW0jbRAilICFxIpgGMmmiWGHSIR6ViY+DPFaqSJCbQ5mbxoZLIlU0Al/cBj6N1uXfFI0okLppi69StmumSFQRP6oIKDedFi3vRDn3j6KozCZlu0DdJb3AupJXNLmqkk9+X9FEHLt1Jq8oi1H5n01AtRlvwQZQl9hmtPY4JEjMDs5ftWJN4Xr4lLrV2OHiUDHCPgvA/Tn/hP4zGUBfjZ3eLJ+NIOfHxi8CMoAQtYfmw93v01O0e7VlqqcCsXML3Vsu94cxnb4c7ML5chG8JIP9b38dENGaj3+x+TpiA/AL/fen8In7H8l3ZjdJQt2TAAAAAElFTkSuQmCC">`
    $showBtn.innerHTML = `
    <img style="
      padding-top: 4px;
      width: 24px;
      display: inline-block;
      cursor: pointer;
    " src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIBAMAAABfdrOtAAAAElBMVEUAAAD///////////////////8+Uq06AAAABXRSTlMA2kCAv5tF5NoAAAErSURBVHja7dzNasJAFIbhz8Tu7R0Eq/vQNHuxzL6YnPu/ldYpAUckxJ8zSnjfdTIPzHrOUawJdqmDJre1S/X7avigbM08kMgMSmt+iPWKbcwTsb3+KswXseOFLb2RnaTgjXTxtpwRq7XMgWz9kZ8cSKcwE6SX+SMGAgICAvJCyHdz2ud0pEx+/BpFaj2kEgQEBAQEBAQEBOT1kXWSkhbvk1vptOLs1LEWNrmVRgIBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBeTayTqpufogxduqM3q2AgICAgICAgICA3IOko4ZXkB/pqOHzhyZBQEBAQLIieVahtDNBDnrLgZT+yC4HUkmtN9JnWUiVZbVWliVhseCJdPqvCH5IV2tQNl4r6Bod+wWq9eeDik+xFQAAAABJRU5ErkJggg==">`

    // 十倍速播放
    function _tenRatePlay() {

        if ($tenRate.innerHTML === '快速跳转捕获') {
            $fastCapture = true;
            $tenRate.innerHTML = '恢复正常播放'
        } else {
            $fastCapture = false;
            $tenRate.innerHTML = '快速跳转捕获'
        }
        jumpToFiveSecondsBefore()
        // const videoElements = document.getElementsByTagName('video');
        // // 遍历视频元素并暂停播放
        // Array.from(videoElements).forEach(video => {
        //     video.pause();
        // });

    }

    function jumpToFiveSecondsBefore() {
        const videoElements = document.getElementsByTagName('video');
        const bufferedTime = videoElements[0].buffered.end(0);
        const currentTime = videoElements[0].currentTime;
        const jumpTime = Math.max(0, bufferedTime - 5); // 确保跳转时间不为负数

        // 计算当前时间与缓冲时间的差值
        const timeDifference = bufferedTime - currentTime;

        // 检查缓冲时间是否发生变化
        if (typeof jumpToFiveSecondsBefore.lastBufferedTime === 'undefined' || jumpToFiveSecondsBefore.lastBufferedTime !== bufferedTime) {
            // 更新上一次的缓冲时间
            jumpToFiveSecondsBefore.lastBufferedTime = bufferedTime;

            // 使用 MediaSource API 将视频跳转到指定时间点
            videoElements[0].currentTime = jumpTime;

            console.log(jumpTime);
        }

        // 如果当前时间与缓冲时间的差值小于5秒，则暂停播放
        if (timeDifference < 3) {
            videoElements[0].pause();
            console.log('视频暂停');
        } else {
            // 否则继续播放
            videoElements[0].play();
            // console.log('视频继续播放');
        }

        if ($tenRate.innerHTML === '恢复正常播放') {
            setTimeout(jumpToFiveSecondsBefore, 300); // 每500毫秒检查一次视频缓冲状态
        }
    }



    // 获取顶部 window title，因可能存在跨域问题，故使用 try catch 进行保护
    function getDocumentTitle() {
        let title = document.title;
        try {
            title = window.top.document.title
        } catch (error) {
            console.log(error)
        }
        return title
    }

    // 流式下载
    function _streamDownload() {
        var _hmt = _hmt || [];
        (function () {
            var hm = document.createElement("script");
            hm.src = "https://hm.baidu.com/hm.js?1f12b0865d866ae1b93514870d93ce89";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
        })();

        // 对应状态未下载结束的媒体轨道
        const remainSourceBufferList = []
        _sourceBufferList.forEach((target) => {
            // 对应的 MSE 状态为已下载完成状态
            if (target.MSEInstance.readyState === 'ended') {
                target.streamWriter.close()
            } else {
                remainSourceBufferList.push(target)
            }
        })
        // 流式下载，释放已下载完成的媒体轨道，回收内存
        _sourceBufferList = remainSourceBufferList
    }

    function _download() {
        var _hmt = _hmt || [];
        (function () {
            var hm = document.createElement("script");
            hm.src = "https://hm.baidu.com/hm.js?1f12b0865d866ae1b93514870d93ce89";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
        })();

        // 用一个 Set 来存储已下载的文件名
        const downloadedFiles = new Set();

        _sourceBufferList.forEach((target) => {
            const mime = target.mime.split(';')[0]
            const type = mime.split('/')[1]
            const fileBlob = new Blob(target.bufferList, {
                type: mime
            }) // 创建一个Blob对象，并设置文件的 MIME 类型
            const file_name = `${getDocumentTitle()}.${type}`;
            console.log(downloadedFiles)

            // 检查文件大小和文件名是否重复
            if (fileBlob.size > 0 && !downloadedFiles.has(file_name)) {
                const a = document.createElement('a')
                a.download = file_name
                a.href = URL.createObjectURL(fileBlob)
                a.style.display = 'none'
                document.body.appendChild(a)
                // 禁止 click 事件冒泡，避免全局拦截
                a.onclick = function (e) {
                    e.stopPropagation();
                }
                a.click()
                a.remove()

                // 将已下载的文件名添加到 Set 中
                downloadedFiles.add(file_name);
            } else {
                console.log('文件已存在或大小为0KB，不进行下载');
            }
        })
    }

    // 监听资源全部录取成功
    let _endOfStream = window.MediaSource.prototype.endOfStream
    window.MediaSource.prototype.endOfStream = function endOfStream() {
        if (isStreamDownload) {
            alert('资源全部捕获成功，即将下载！')
            setTimeout(_streamDownload) // 等待 MediaSource 状态变更
            _endOfStream.call(this)
            return
        }

        if ($fastCapture) {
            _download()
            $tenRate.innerHTML = '快速跳转捕获';
        } else {
            // 不下载资源
        }
        $tenRate.innerHTML = '快速跳转捕获';
        _endOfStream.call(this)
    }

    // 录取资源
    let _addSourceBuffer = window.MediaSource.prototype.addSourceBuffer
    window.MediaSource.prototype.addSourceBuffer = function addSourceBuffer(mime) {
        _appendDom()
        let sourceBuffer = _addSourceBuffer.call(this, mime)
        let _append = sourceBuffer.appendBuffer
        let bufferList = []
        const _sourceBuffer = {
            mime,
            bufferList,
            MSEInstance: this,
        }

        // 如果 streamSaver 已提前加载完成，则初始化对应的 streamWriter
        try {
            if (window.streamSaver) {
                const type = mime.split(';')[0].split('/')[1]
                _sourceBuffer.streamWriter = streamSaver.createWriteStream(`${getDocumentTitle()}.${type}`).getWriter()
            }
        } catch (error) {
            console.error(error)
        }

        _sourceBufferList.push(_sourceBuffer)
        sourceBuffer.appendBuffer = function (buffer) {
            sumFragment++
            $downloadNum.innerHTML = `已捕获 ${sumFragment} 个片段`

            if (isStreamDownload && _sourceBuffer.streamWriter) { // 流式下载
                _sourceBuffer.streamWriter.write(new Uint8Array(buffer));
            } else { // 普通 blob 下载
                bufferList.push(buffer)
            }
            _append.call(this, buffer)
        }
        return sourceBuffer
    }
    window.MediaSource.prototype.addSourceBuffer.toString = function toString() {
        return 'function addSourceBuffer() { [native code] }'
    }

    // 添加操作的 dom
    function _appendDom() {
        if (document.getElementById('media-source-extract')) {
            return
        }
        $container.style = `
      position: fixed;
      top: 50px;
      right: 50px;
      text-align: right;
      z-index: 9999;
      `
        const baseStyle = `
      float:right;
      clear:both;
      margin-top: 10px;
      padding: 0 20px;
      color: white;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      line-height: 40px;
      text-align: center;
      border-radius: 4px;
      background-color: #3498db;
      box-shadow: 0 3px 6px 0 rgba(0, 0, 0, 0.3);
    `
        $tenRate.innerHTML = '快速跳转捕获'
        $downloadNum.innerHTML = '已捕获 0 个片段'
        $btnStreamDownload.innerHTML = '特大视频下载，边下载边保存'
        $btnDownload.innerHTML = '下载已捕获片段'
        $btnDownload.id = 'media-source-extract'
        $tenRate.style = baseStyle
        $downloadNum.style = baseStyle
        $btnDownload.style = baseStyle
        $btnStreamDownload.style = baseStyle
        $btnStreamDownload.style.display = 'none'
        $showBtn.style = `
      float:right;
      clear:both;
      display: none;
      margin-top: 4px;
      height: 34px;
      width: 34px;
      line-height: 34px;
      text-align: center;
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      `
        $closeBtn.style = `
      float:right;
      clear:both;
      margin-top: 10px;
      height: 34px;
      width: 34px;
      line-height: 34px;
      text-align: center;
      display: inline-block;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      `

        $btnDownload.addEventListener('click', function () {
            isDownloadClicked = true;
            _download();
        });
        $tenRate.addEventListener('click', _tenRatePlay)

        // 关闭控制面板
        $closeBtn.addEventListener('click', function () {
            $downloadNum.style.display = 'none'
            $btnStreamDownload.style.display = 'none'
            $btnDownload.style.display = 'none'
            $closeBtn.style.display = 'none'
            $tenRate.style.display = 'none'
            $showBtn.style.display = 'inline-block'
            isClose = true
        })

        // 显示控制面板
        $showBtn.addEventListener('click', function () {
            if (!isStreamDownload) {
                $btnDownload.style.display = 'inline-block'
                $btnStreamDownload.style.display = 'inline-block'
            }
            $downloadNum.style.display = 'inline-block'
            $closeBtn.style.display = 'inline-block'
            $tenRate.style.display = 'inline-block'
            $showBtn.style.display = 'none'
            isClose = false
        })

        // 启动流式下载
        $btnStreamDownload.addEventListener('click', function () {
            (function () {
                var hm = document.createElement("script");
                hm.src = "https://hm.baidu.com/hm.js?1f12b0865d866ae1b93514870d93ce89";
                var s = document.getElementsByTagName("script")[0];
                s.parentNode.insertBefore(hm, s);
            })();
            isStreamDownload = true
            $btnDownload.style.display = 'none'
            $btnStreamDownload.style.display = 'none'
            _sourceBufferList.forEach(sourceBuffer => {
                if (!sourceBuffer.streamWriter) {
                    const type = sourceBuffer.mime.split(';')[0].split('/')[1]
                    sourceBuffer.streamWriter = streamSaver.createWriteStream(`${getDocumentTitle()}.${type}`).getWriter()
                    sourceBuffer.bufferList.forEach(buffer => {
                        sourceBuffer.streamWriter.write(new Uint8Array(buffer));
                    })
                    sourceBuffer.bufferList = []
                }
            })
        })

        document.getElementsByTagName('html')[0].insertBefore($container, document.getElementsByTagName('head')[0]);
        $container.appendChild($btnStreamDownload)
        $container.appendChild($downloadNum)
        $container.appendChild($btnDownload)
        $container.appendChild($tenRate)
        $container.appendChild($closeBtn)
        $container.appendChild($showBtn)
        // 加载 stream 流式下载器
        try {
            let $streamSaver = document.createElement('script')
            $streamSaver.src = 'https://upyun.luckly-mjw.cn/lib/stream-saver.js'
            document.body.appendChild($streamSaver);
            $streamSaver.addEventListener('load', () => {
                $btnStreamDownload.style.display = 'none'
            })
        } catch (error) {
            console.error(error)
        }

        $btnStreamDownload.style.display = 'none'
        $downloadNum.style.display = 'none'
        $btnDownload.style.display = 'none'
        $closeBtn.style.display = 'none'
        $tenRate.style.display = 'none'
        $showBtn.style.display = 'inline-block'

    }
})();
