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

        // 当前解析出的媒体数据缓存
        let currentVideoUrl = '';
        let currentImages = [];

        // 通用：强制触发浏览器下载机制
        async function forceDownload(url, filename, buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.disabled = true;
            buttonElement.textContent = "⌛ 下载中...";

            try {
                // 将远程文件拉取为 Blob 以规避 <a> 标签跨域下载失效问题
                const response = await fetch(url);
                if (!response.ok) throw new Error('网络响应异常');
                const blob = await response.blob();
                
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                // 内存清理
                a.remove();
                URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.error("Blob 下载失败, 触发降级策略:", error);
                // 降级：若源站禁止 CORS，强制打开新标签页让用户手动保存
                window.open(url, '_blank');
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
            videoPlayer.src = '';
            imageGrid.innerHTML = '';
            currentVideoUrl = '';
            currentImages = [];
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

            if (data.type === 'video') {
                videoContainer.style.display = 'block';
                currentVideoUrl = data.media_url;
                videoPlayer.src = currentVideoUrl;
                videoPlayer.poster = data.cover || '';
            } 
            else if (data.type === 'image') {
                imageContainer.style.display = 'block';
                currentImages = Array.isArray(data.media_url) ? data.media_url : [];
                
                currentImages.forEach((imgUrl, idx) => {
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.className = 'gallery-item no-lightbox';
                    img.setAttribute('referrerpolicy', 'no-referrer');
                    imageGrid.appendChild(img);
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
    };

    document.addEventListener('DOMContentLoaded', initVideoParser);
    document.addEventListener('pjax:complete', initVideoParser);
    initVideoParser();
})();