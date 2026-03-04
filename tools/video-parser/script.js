(function() {
    const initVideoParser = function() {
        const toolRoot = document.getElementById('vp-tool-root');
        if (!toolRoot) return;

        // DOM 元素获取
        const inputElement = document.getElementById('vp-share-input');
        const btnClear = document.getElementById('vp-btn-clear');
        const btnParse = document.getElementById('vp-btn-parse');
        
        const loadingState = document.getElementById('vp-loading');
        const resultArea = document.getElementById('vp-result-area');
        const resultTitle = document.getElementById('vp-result-title');
        
        const videoContainer = document.getElementById('vp-video-container');
        const videoPlayer = document.getElementById('vp-video-player');
        const videoDownloadBtn = document.getElementById('vp-video-download');
        
        const imageContainer = document.getElementById('vp-image-container');
        const imageGrid = document.getElementById('vp-image-grid');

        // 后端 API 地址 (需根据你 Nginx 配置的实际域名或路径调整)
        const API_ENDPOINT = 'www.luotian.cyou/api/videojiexi';

        // 状态重置
        function resetUI() {
            loadingState.style.display = 'none';
            resultArea.style.display = 'none';
            videoContainer.style.display = 'none';
            imageContainer.style.display = 'none';
            videoPlayer.src = '';
            imageGrid.innerHTML = '';
            resultTitle.textContent = '解析结果';
        }

        // 清空按钮
        btnClear.onclick = () => {
            inputElement.value = '';
            inputElement.focus();
            resetUI();
        };

        // 解析按钮逻辑
        btnParse.onclick = async () => {
            const shareText = inputElement.value.trim();
            if (!shareText) {
                alert('请输入有效的分享文案或链接');
                return;
            }

            resetUI();
            loadingState.style.display = 'flex';
            btnParse.disabled = true;

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ share_text: shareText })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `请求失败 (${response.status})`);
                }

                const data = await response.json();
                
                if (data.status !== 'success') {
                    throw new Error('解析接口返回异常状态');
                }

                renderResult(data);

            } catch (error) {
                console.error("解析错误:", error);
                alert(`解析失败: ${error.message}`);
            } finally {
                loadingState.style.display = 'none';
                btnParse.disabled = false;
            }
        };

        // 渲染解析结果
        function renderResult(data) {
            resultTitle.textContent = data.title || '无标题内容';
            resultArea.style.display = 'block';

            if (data.type === 'video') {
                videoContainer.style.display = 'block';
                // 添加防盗链 noreferrer 策略
                videoPlayer.src = data.media_url;
                videoPlayer.poster = data.cover || '';
                
                videoDownloadBtn.href = data.media_url;
            } 
            else if (data.type === 'image') {
                imageContainer.style.display = 'block';
                const images = data.media_url; // 数组
                
                if (Array.isArray(images) && images.length > 0) {
                    images.forEach(imgUrl => {
                        const img = document.createElement('img');
                        img.src = imgUrl;
                        img.className = 'gallery-item no-lightbox';
                        img.setAttribute('referrerpolicy', 'no-referrer'); // 绕过防盗链机制
                        imageGrid.appendChild(img);
                    });
                } else {
                    resultTitle.textContent = '未提取到图集图片';
                }
            }
            
            // 平滑滚动至结果区
            setTimeout(() => resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    };

    // 适配 Hexo/Butterfly 的 Pjax 无刷新加载
    document.addEventListener('DOMContentLoaded', initVideoParser);
    document.addEventListener('pjax:complete', initVideoParser);
    
    // 首次进入页面主动调用
    initVideoParser();
})();