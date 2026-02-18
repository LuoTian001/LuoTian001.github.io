(function() {
    function initQRCodeTool() {
    const rootEl = document.getElementById('qrcode-tool-root');
        if (!rootEl) return;

        // === DOM Elements ===
        const tabs = document.querySelectorAll('.tab-item');
        const panels = document.querySelectorAll('.mode-panel');
        const processBtn = document.getElementById('process-btn');
        const spinner = document.getElementById('spinner');
        const btnText = document.getElementById('btn-text');
        
        // Generate Elements
        const qrContent = document.getElementById('qr-content');
        const styleCards = document.querySelectorAll('.style-card');
        const boxSize = document.getElementById('box-size');
        const borderSize = document.getElementById('border-size');
        const fillColor = document.getElementById('fill-color');
        const backColor = document.getElementById('back-color');
        const genResultImg = document.getElementById('gen-result-img');
        const downloadBtn = document.getElementById('download-btn');
        const downloadLink = document.getElementById('download-link');

        // Parse Elements
        const fileInput = document.getElementById('fileInput');
        const dropArea = document.getElementById('drop-area');
        const parseSourceImg = document.getElementById('parse-source-img');
        const parseResultText = document.getElementById('parse-result-text');
        const copyBtn = document.getElementById('copy-btn');
        const fileNameDisplay = document.getElementById('file-name-display');

        // Common Elements
        const genTextIcon = document.getElementById('gen-text-icon');
        const resultPlaceholder = document.getElementById('result-placeholder');
        const leftBox = document.getElementById('left-box');

        // State
        let currentMode = 'generate'; // 'generate' | 'parse'
        let currentStyle = 'standard';
        let parseFile = null;

        // === Helper Functions ===
        const toggleUI = (mode) => {
            currentMode = mode;
            // Tab Styles
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
            // Panel Visibility
            panels.forEach(p => p.classList.toggle('active', p.id === `panel-${mode}`));
            
            // Button Text
            btnText.textContent = mode === 'generate' ? '立即生成' : '开始解析';
            
            // Result Area Reset
            genResultImg.style.display = 'none';
            parseResultText.style.display = 'none';
            downloadBtn.style.display = 'none';
            copyBtn.style.display = 'none';
            resultPlaceholder.style.display = 'block';

            // Left Box Logic
            if (mode === 'generate') {
                parseSourceImg.style.display = 'none';
                genTextIcon.style.display = 'block';
            } else {
                genTextIcon.style.display = 'none';
                parseSourceImg.style.display = parseFile ? 'block' : 'none';
            }
        };

        const handleFileSelect = (file) => {
            if (!file || !file.type.startsWith('image/')) {
                alert('请上传有效的图片文件');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('图片大小不能超过 5MB');
                return;
            }
            parseFile = file;
            fileNameDisplay.textContent = file.name;
            
            const url = URL.createObjectURL(file);
            parseSourceImg.src = url;
            parseSourceImg.style.display = 'block';
            genTextIcon.style.display = 'none';
        };

        // === Event Listeners ===

        // 1. Tab Switching
        tabs.forEach(tab => {
            tab.onclick = () => toggleUI(tab.dataset.tab);
        });

        // 2. Style Cards (Generate)
        styleCards.forEach(card => {
            card.onclick = () => {
                styleCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentStyle = card.dataset.style;
            };
        });

        // 3. Sliders & Colors (Generate)
        const sliders = [boxSize, borderSize];
        sliders.forEach(input => {
            if (input) { // 必须判空
                input.oninput = function() { 
                    if(this.nextElementSibling) {
                        this.nextElementSibling.textContent = this.value; 
                    }
                };
            }
        });

        const colorPickers = [fillColor, backColor];
        colorPickers.forEach(input => {
            if (input) { // 必须判空
                input.onchange = function() { 
                    if(this.nextElementSibling) {
                        this.nextElementSibling.textContent = this.value; 
                    }
                };
            }
        });

        // 4. File Upload (Parse)
        dropArea.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleFileSelect(e.target.files[0]);
        
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
            if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
        };

        // 5. Copy Text (Parse)
        copyBtn.onclick = () => {
            parseResultText.select();
            document.execCommand('copy');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '已复制！';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        };

        // 6. Main Process Logic
        processBtn.onclick = async () => {
            processBtn.disabled = true;
            spinner.style.display = 'block';
            btnText.textContent = '处理中...';
            resultPlaceholder.style.display = 'none';

            try {
                if (currentMode === 'generate') {
                    // === Generate Logic ===
                    const content = qrContent.value.trim();
                    if (!content) throw new Error("请输入二维码内容");

                    const payload = {
                        content: content,
                        box_size: parseInt(boxSize.value),
                        border: parseInt(borderSize.value),
                        fill_color: fillColor.value,
                        back_color: backColor.value,
                        style: currentStyle
                    };

                    const res = await fetch('/api/qrcode/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) throw new Error("生成失败，请检查参数");
                    
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    
                    genResultImg.src = url;
                    genResultImg.style.display = 'block';
                    parseResultText.style.display = 'none';
                    
                    // Setup Download
                    downloadLink.href = url;
                    downloadLink.download = `qrcode_${Date.now()}.png`;
                    downloadBtn.style.display = 'inline-flex';
                    copyBtn.style.display = 'none';

                    // Lightbox for result
                    const linkResult = document.getElementById('link-result');
                    if(linkResult) {
                        linkResult.href = url;
                        linkResult.setAttribute('data-fancybox', 'gallery');
                    }

                } else {
                    // === Parse Logic ===
                    if (!parseFile) throw new Error("请先上传二维码图片");

                    const formData = new FormData();
                    formData.append('file', parseFile);

                    const res = await fetch('/api/qrcode/parse', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || "无法识别二维码");

                    parseResultText.value = data.content;
                    parseResultText.style.display = 'block';
                    genResultImg.style.display = 'none';
                    
                    copyBtn.style.display = 'inline-flex';
                    downloadBtn.style.display = 'none';
                }

            } catch (err) {
                alert(err.message);
                resultPlaceholder.style.display = 'block';
                resultPlaceholder.textContent = '出错: ' + err.message;
            } finally {
                processBtn.disabled = false;
                spinner.style.display = 'none';
                btnText.textContent = currentMode === 'generate' ? '再次生成' : '再次解析';
            }
        };
    }

    // Hexo/Butterfly Compatibility
    document.addEventListener('DOMContentLoaded', initQRCodeTool);
    document.addEventListener('pjax:complete', initQRCodeTool);
    
    // Initial Run
    initQRCodeTool();
})();