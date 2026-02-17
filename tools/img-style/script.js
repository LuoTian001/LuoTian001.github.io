document.addEventListener('DOMContentLoaded', () => {
    // 兼容 Butterfly PJAX：如果页面被 PJAX 重新加载，需要重新绑定事件
    // Butterfly 通常触发 'pjax:complete' 或 'pjax:success'
    initImgStyleTool();
});

// 如果你有使用 PJAX，请确保在 PJAX 完成事件中也调用 initImgStyleTool
document.addEventListener('pjax:complete', initImgStyleTool);

function initImgStyleTool() {
    // 检查元素是否存在，防止在其他页面报错
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;

    // 清理可能存在的旧事件监听器（对于PJAX不是必须，但对于单页应用是好习惯）
    // 这里简单处理，直接重新初始化变量

    const PARAMS_MAP = {
        'mosaic_size': { min: 2, max: 50, inverse: false, isInt: true },
        'ink_blur':    { min: 5, max: 100, inverse: false, isInt: true },
        'ink_gamma':   { min: 0.1, max: 2.0, inverse: true },
        'pencil_s':    { min: 0, max: 200, inverse: false },
        'pencil_r':    { min: 0.01, max: 1.0, inverse: true },
        'pencil_shade':{ min: 0.01, max: 0.1, inverse: true } 
    };

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
    
    let currentFile = null;
    let currentStyle = document.querySelector('.style-card.active')?.dataset.style || 'mosaic';

    // === 事件绑定：滑块数值更新 ===
    const sliders = document.querySelectorAll('.param-slider');
    sliders.forEach(slider => {
        // 移除旧的 oninput，使用监听器
        slider.addEventListener('input', function() {
            this.nextElementSibling.textContent = this.value;
        });
    });

    // === 事件绑定：上传区域点击 ===
    // 避免重复绑定，如果 dropArea 已经有 click 事件 (根据架构而定)，但在 DOM 重绘后通常是安全的
    dropArea.onclick = () => document.getElementById('fileInput').click();

    // === 核心逻辑函数 ===

    function getRealValue(name, uiValue) {
        const config = PARAMS_MAP[name];
        if (!config) return uiValue;
        const percent = (uiValue - 1) / 99;
        
        let result;
        if (config.inverse) {
            result = config.max - (percent * (config.max - config.min));
        } else {
            result = config.min + (percent * (config.max - config.min));
        }

        if (config.isInt) {
            return Math.round(result);
        } else {
            return result.toFixed(3);
        }
    }

    function setLightboxState(linkId, imageUrl, enable) {
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
    }

    // === 风格切换逻辑 ===
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            styleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentStyle = card.dataset.style;
            
            paramPanels.forEach(panel => panel.style.display = 'none');
            
            const targetPanel = currentStyle === 'line' ? 'pencil' : currentStyle;
            const activePanel = document.querySelector(`.params-panel[data-for="${targetPanel}"]`);
            if(activePanel) activePanel.style.display = 'block';
        });
    });

    // === 文件处理逻辑 ===
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

    // 绑定文件输入变更
    fileInput.onchange = (e) => handleFile(e.target.files[0]);
    
    // 绑定拖拽事件
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

    // === 生成处理逻辑 ===
    processBtn.onclick = async function() {
        if (!currentFile) return;

        processBtn.disabled = true;
        spinner.style.display = 'block';
        btnText.textContent = '正在生成中...';
        imgResult.style.opacity = '0.5';

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('style', currentStyle);

        const inputs = document.querySelectorAll('#params-container input');
        inputs.forEach(input => {
            // 注意：这里需要根据当前显示的面板筛选，或者后台全部接收
            // 简单起见，全部发送，后台按需取用
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
                } catch (e) {
                    const text = await response.text();
                    if(text) errorMsg = text.substring(0, 100);
                }
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