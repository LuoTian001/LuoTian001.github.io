(function() {
    // 定义初始化函数
    function initImgStyleTool() {
        const uniqueEl = document.getElementById('style-selector');
        if (!uniqueEl) return;
        
        const fileInput = document.getElementById('fileInput');
        const dropArea = document.getElementById('drop-area');
        const imgSource = document.getElementById('img-source');
        const imgResult = document.getElementById('img-result');
        const downloadBtn = document.getElementById('download-btn');
        const downloadLink = document.getElementById('download-link');
        const processBtn = document.getElementById('process-btn');
        const spinner = document.getElementById('spinner');
        const btnText = document.getElementById('btn-text');
        const styleCards = document.querySelectorAll('.style-card');
        const paramPanels = document.querySelectorAll('.params-panel');
        const inputs = document.querySelectorAll('#params-container input');

        let currentFile = null;
        let currentStyle = document.querySelector('.style-card.active')?.dataset.style || 'mosaic';

        const PARAMS_MAP = {
            'mosaic_size': { min: 2, max: 50, inverse: false, isInt: true },
            'ink_blur':    { min: 5, max: 100, inverse: false, isInt: true },
            'ink_gamma':   { min: 0.1, max: 2.0, inverse: true },
            'pencil_s':    { min: 0, max: 200, inverse: false },
            'pencil_r':    { min: 0.01, max: 1.0, inverse: true },
            'pencil_shade':{ min: 0.01, max: 0.1, inverse: true } 
        };

        const getRealValue = (name, uiValue) => {
            const config = PARAMS_MAP[name];
            if (!config) return uiValue;
            const percent = (uiValue - 1) / 99;
            
            let result;
            if (config.inverse) {
                result = config.max - (percent * (config.max - config.min));
            } else {
                result = config.min + (percent * (config.max - config.min));
            }

            return config.isInt ? Math.round(result) : result.toFixed(3);
        };

        const setLightboxState = (linkId, imageUrl, enable) => {
            const link = document.getElementById(linkId);
            if(!link) return;
            if (enable && imageUrl) {
                link.href = imageUrl;
                link.setAttribute('data-fancybox', 'gallery');
                link.classList.add('active'); 
            } else {
                link.removeAttribute('href');
                link.removeAttribute('data-fancybox');
                link.classList.remove('active');
            }
        };

        // 处理文件上传逻辑
        const handleFile = (file) => {
            if (!file || !file.type.startsWith('image/')) {
                alert('请上传有效的图片文件');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('图片过大，请上传 10MB 以内的图片');
                return;
            }

            currentFile = file;
            document.getElementById('file-name-display').textContent = file.name;
            
            const url = URL.createObjectURL(file);
            // 此时 imgSource 一定是有效的，因为是在 init 内部获取的
            imgSource.src = url;
            imgSource.style.display = 'block';
            
            setLightboxState('link-source', url, true);
            
            document.getElementById('placeholder-text').style.display = 'none';
            processBtn.disabled = false;
            
            imgResult.style.display = 'none';
            imgResult.src = '';
            setLightboxState('link-result', null, false);
            
            downloadBtn.style.display = 'none';
            document.getElementById('result-placeholder').style.display = 'block';
        };

        inputs.forEach(slider => {
            slider.oninput = function() {
                this.nextElementSibling.textContent = this.value;
            };
        });

        // 绑定文件输入
        fileInput.onchange = (e) => handleFile(e.target.files[0]);

        // 绑定点击上传区域
        dropArea.onclick = () => fileInput.click();
        
        // 绑定拖拽
        dropArea.ondragover = (e) => {
            e.preventDefault();
            dropArea.style.borderColor = 'var(--primary-color)';
            dropArea.style.background = 'rgba(33, 150, 243, 0.05)';
        };
        dropArea.ondragleave = (e) => {
            e.preventDefault();
            dropArea.style.borderColor = 'var(--border-color)';
            dropArea.style.background = 'var(--panel-bg)';
        };
        dropArea.ondrop = (e) => {
            e.preventDefault();
            dropArea.style.borderColor = 'var(--border-color)';
            dropArea.style.background = 'var(--panel-bg)';
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        };

        // 绑定风格切换
        styleCards.forEach(card => {
            card.onclick = () => {
                styleCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentStyle = card.dataset.style;
                
                paramPanels.forEach(panel => panel.style.display = 'none');
                const targetPanel = currentStyle === 'line' ? 'pencil' : currentStyle;
                const activePanel = document.querySelector(`.params-panel[data-for="${targetPanel}"]`);
                if(activePanel) activePanel.style.display = 'block';
            };
        });

        // 绑定处理按钮
        processBtn.onclick = async function() {
            if (!currentFile) return;

            processBtn.disabled = true;
            spinner.style.display = 'block';
            btnText.textContent = '正在生成中...';
            imgResult.style.opacity = '0.5';

            const formData = new FormData();
            formData.append('file', currentFile);
            formData.append('style', currentStyle);

            inputs.forEach(input => {
                const uiValue = parseInt(input.value);
                const realValue = getRealValue(input.name, uiValue);
                formData.append(input.name, realValue);
            });

            try {
                const response = await fetch('/api/style/imgprocess', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    let errorMsg = '服务器内部错误';
                    try {
                        const errData = await response.json();
                        if (Array.isArray(errData.detail)) {
                            errorMsg = errData.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join('\n');
                        } else if (typeof errData.detail === 'string') {
                            errorMsg = errData.detail;
                        } else if (errData.message) {
                            errorMsg = errData.message;
                        }
                    } catch (e) { errorMsg = "未知错误"; }
                    throw new Error(errorMsg);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                imgResult.src = url;
                imgResult.style.display = 'block';
                imgResult.style.opacity = '1';
                setLightboxState('link-result', url, true);

                document.getElementById('result-placeholder').style.display = 'none';
                
                const fileNameNoExt = currentFile.name.replace(/\.[^/.]+$/, "");
                downloadLink.href = url;
                downloadLink.download = `${fileNameNoExt}_${currentStyle}.jpg`;
                downloadBtn.style.display = 'inline-flex';

            } catch (err) {
                alert('生成失败: ' + err.message);
                console.error(err);
            } finally {
                processBtn.disabled = false;
                spinner.style.display = 'none';
                btnText.textContent = '再次生成';
            }
        };
    }

    document.addEventListener('DOMContentLoaded', initImgStyleTool);

    document.addEventListener('pjax:complete', initImgStyleTool);

    initImgStyleTool();

})();