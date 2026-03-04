(function() {
    const initVideoParser = function() {
        const toolRoot = document.getElementById('vp-tool-root');
        if (!toolRoot) return;

        // DOM 获取
        const inputElement = document.getElementById('vp-share-input');
        const btnClear = document.getElementById('vp-btn-clear');
        const btnParse = document.getElementById('vp-btn-parse');
        const loadingState = document.getElementById('vp-loading');
        const resultArea = document.getElementById('vp-result-area');
        const resultTitle = document.getElementById('vp-result-title');
        
        // 视频 DOM
        const videoContainer = document.getElementById('vp-video-container');
        const videoPlayer = document.getElementById('vp-video-player');
        const btnDownloadVideo = document.getElementById('vp-btn-download-video');
        const btnCopyLink = document.getElementById('vp-btn-copy-link');
        
        // 图集 DOM
        const imageContainer = document.getElementById('vp-image-container');
        const imageGrid = document.getElementById('vp-image-grid');
        const btnZipDownload = document.getElementById('vp-btn-zip-download');

        const livephotoContainer = document.getElementById('vp-livephoto-container');
        const livephotoGrid = document.getElementById('vp-livephoto-grid');
        const btnZipLivephoto = document.getElementById('vp-btn-zip-livephoto');

        // 当前解析出的媒体数据缓存
        let currentVideoUrl = '';
        let currentImages = [];
        let currentLivephotos = []; // 缓存当前动态图数据

        // 通用：强制触发浏览器下载机制
        async function forceDownload(url, filename, buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.disabled = true;
            buttonElement.textContent = "⌛ 处理中...";

            try {
                // 尝试拉取 Blob (大概率会被视频 CDN 的 CORS 策略拦截)
                const response = await fetch(url);
                if (!response.ok) throw new Error('网络响应异常');
                const blob = await response.blob();
                
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                a.remove();
                URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.warn("Blob 下载受 CORS 限制拦截，执行无 Referer 降级跳转。");
                // 【核心修复】降级：强制构造无 Referer 的新标签页打开，规避 403 Forbidden
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noreferrer noopener'; // 彻底剥离当前站点的 Referer 头
                document.body.appendChild(a);
                a.click();
                a.remove();
            } finally {
                buttonElement.disabled = false;
                buttonElement.textContent = originalText;
            }
        }

        function resetUI() {
            loadingState.style.display = 'none';
            resultArea.style.display = 'none';
            videoContainer.style.display = 'none';
            imageContainer.style.display = 'none';
            livephotoContainer.style.display = 'none';
            videoPlayer.src = '';
            imageGrid.innerHTML = '';
            livephotoGrid.innerHTML = '';
            currentVideoUrl = '';
            currentImages = [];
            currentLivephotos = [];
            resultTitle.textContent = '解析结果';
        }

        btnClear.onclick = () => {
            inputElement.value = '';
            inputElement.focus();
            resetUI();
        };

        btnParse.onclick = async () => {
            const shareText = inputElement.value.trim();
            if (!shareText) return alert('请输入有效的分享文案或链接');

            resetUI();
            loadingState.style.display = 'flex';
            btnParse.disabled = true;

            try {
                const response = await fetch('/api/videojiexi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ share_text: shareText })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `HTTP ${response.status}`);
                }

                const data = await response.json();
                renderResult(data);

            } catch (error) {
                alert(`解析失败: ${error.message}`);
            } finally {
                loadingState.style.display = 'none';
                btnParse.disabled = false;
            }
        };

        function renderResult(data) {
            resultTitle.textContent = data.title || '解析成功';
            resultArea.style.display = 'block';
            // 优先级 1：判断是否为动态图/多分段视频
            if (Array.isArray(data.livephotos) && data.livephotos.length > 0) {
                livephotoContainer.style.display = 'block';
                currentLivephotos = data.livephotos;
                livephotoGrid.innerHTML = ''; // 清空可能残留的历史节点
                
                currentLivephotos.forEach((item, idx) => {
                    const wrap = document.createElement('div');
                    wrap.className = 'livephoto-item';
                    
                    // 构造视频播放器
                    const vid = document.createElement('video');
                    vid.src = item.video;
                    vid.poster = item.cover || '';
                    vid.controls = true;
                    vid.preload = "metadata"; // 仅预加载元数据，避免多视频并发卡死
                    vid.className = 'no-lightbox';
                    // 【核心修复】强制不发送 Referer，使得前端视频标签可绕过防盗链直接预览
                    vid.setAttribute('referrerpolicy', 'no-referrer');
                    
                    // 构造独立下载控制区
                    const actions = document.createElement('div');
                    actions.className = 'livephoto-actions';
                    
                    const btnDl = document.createElement('button');
                    btnDl.className = 'btn btn-primary';
                    btnDl.textContent = '⬇️ 下载分段 ' + (idx + 1);
                    btnDl.onclick = () => forceDownload(item.video, `livephoto_${idx+1}.mp4`, btnDl);
                    
                    const btnCopy = document.createElement('button');
                    btnCopy.className = 'btn btn-reset';
                    btnCopy.textContent = '📋 复制直链';
                    btnCopy.onclick = async () => {
                        await navigator.clipboard.writeText(item.video);
                        btnCopy.textContent = '✅ 已复制';
                        setTimeout(() => btnCopy.textContent = '📋 复制直链', 2000);
                    };

                    actions.appendChild(btnDl);
                    actions.appendChild(btnCopy);
                    wrap.appendChild(vid);
                    wrap.appendChild(actions);
                    livephotoGrid.appendChild(wrap);
                });
            }
            // 优先级 2：单视频
            else if (data.type === 'video') {
                videoContainer.style.display = 'block';
                currentVideoUrl = data.media_url;
                videoPlayer.src = currentVideoUrl;
                videoPlayer.poster = data.cover || '';
                // 【核心修复】单视频播放器同样需追加防盗链规避
                videoPlayer.setAttribute('referrerpolicy', 'no-referrer');
            }
            // 优先级 3：纯图集
            else if (data.type === 'image') {
                imageContainer.style.display = 'block';
                currentImages = Array.isArray(data.media_url) ? data.media_url : [];
                
                currentImages.forEach((imgUrl, idx) => {
                    const a = document.createElement('a');
                    a.href = imgUrl;
                    a.className = 'vp-fancybox-wrap';
                    a.setAttribute('data-fancybox', 'vp-gallery');
                    a.setAttribute('data-caption', data.title ? `${data.title} - ${idx + 1}` : `图集 - ${idx + 1}`);
                    
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.className = 'gallery-item';
                    img.setAttribute('referrerpolicy', 'no-referrer');
                    
                    a.appendChild(img);
                    imageGrid.appendChild(a);
                });
            }
            setTimeout(() => resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }

        // --- 事件绑定区 ---

        // 视频：点击下载
        btnDownloadVideo.onclick = () => {
            if (!currentVideoUrl) return;
            const timestamp = new Date().getTime();
            forceDownload(currentVideoUrl, `video_${timestamp}.mp4`, btnDownloadVideo);
        };

        // 视频：复制链接
        btnCopyLink.onclick = async () => {
            if (!currentVideoUrl) return;
            try {
                await navigator.clipboard.writeText(currentVideoUrl);
                const oldText = btnCopyLink.textContent;
                btnCopyLink.textContent = "✅ 已复制";
                setTimeout(() => { btnCopyLink.textContent = oldText; }, 2000);
            } catch (err) {
                alert("复制失败，请手动右键复制视频地址。");
            }
        };

        // 图集：一键 ZIP 打包
        btnZipDownload.onclick = async () => {
            if (!currentImages.length) return;
            
            if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
                return alert('环境缺失，依赖库 JSZip 未加载，请刷新页面重试。');
            }

            btnZipDownload.disabled = true;
            btnZipDownload.textContent = "⌛ 打包压缩中...";

            try {
                const zip = new JSZip();
                const folder = zip.folder("images");
                
                // 并发请求所有图片转 Blob
                const fetchPromises = currentImages.map(async (url, index) => {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Image ${index} fetch failed`);
                    const blob = await response.blob();
                    folder.file(`image_${index + 1}.jpg`, blob);
                });

                await Promise.all(fetchPromises);
                
                const content = await zip.generateAsync({ type: "blob" });
                const timestamp = new Date().getTime();
                saveAs(content, `gallery_${timestamp}.zip`);
                
            } catch (error) {
                console.error("打包失败:", error);
                alert("部分图片打包失败。请手动下载图片。");
            } finally {
                btnZipDownload.disabled = false;
                btnZipDownload.textContent = "📦 一键下载图集";
            }
        };

        if(btnZipLivephoto) {
            btnZipLivephoto.onclick = async () => {
                if (!currentLivephotos.length) return;
                if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
                    return alert('环境缺失，依赖库 JSZip 未加载，请刷新页面重试。');
                }

                btnZipLivephoto.disabled = true;
                btnZipLivephoto.textContent = "⌛ 拉取视频中(耗时较长)...";

                try {
                    const zip = new JSZip();
                    const folder = zip.folder("livephotos");
                    
                    const fetchPromises = currentLivephotos.map(async (item, index) => {
                        const response = await fetch(item.video);
                        if (!response.ok) throw new Error(`Video ${index} fetch failed`);
                        const blob = await response.blob();
                        folder.file(`livephoto_${index + 1}.mp4`, blob);
                    });

                    await Promise.all(fetchPromises);
                    
                    btnZipLivephoto.textContent = "⌛ 正在压缩...";
                    const content = await zip.generateAsync({ type: "blob" });
                    const timestamp = new Date().getTime();
                    saveAs(content, `livephotos_${timestamp}.zip`);
                    
                } catch (error) {
                    console.error("视频打包失败:", error);
                    alert("视频打包失败，可能原因：文件过大致浏览器内存溢出，或源站防盗链拦截。请使用单视频下载按钮。");
                } finally {
                    btnZipLivephoto.disabled = false;
                    btnZipLivephoto.textContent = "📦 尝试一键打包全部分段视频";
                }
            };
        }
    };

    document.addEventListener('DOMContentLoaded', initVideoParser);
    document.addEventListener('pjax:complete', initVideoParser);
    initVideoParser();
})();