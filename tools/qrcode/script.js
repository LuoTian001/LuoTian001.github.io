(function() {
    function initQRCodeTool() {
        const rootEl = document.getElementById('qrcode-tool-root');
        if (!rootEl) return;

        // === DOM Elements ===
        const qrContent = document.getElementById('qr-content');
        const boxSize = document.getElementById('box-size');
        const borderSize = document.getElementById('border-size');
        
        // Colors
        const fillColor = document.getElementById('fill-color');
        const backColor = document.getElementById('back-color');
        const valFill = document.getElementById('val-fill');
        const valBack = document.getElementById('val-back');
        const fillPreview = document.getElementById('fill-preview');
        const backPreview = document.getElementById('back-preview');

        // Layout Elements
        const tabs = document.querySelectorAll('.tab-item');
        const panels = document.querySelectorAll('.mode-panel');
        const btnText = document.getElementById('btn-text');
        const leftBoxLabel = document.getElementById('left-box-label');
        
        // Logo Elements
        const genLogoArea = document.getElementById('gen-logo-area');
        const genLogoPreview = document.getElementById('gen-logo-preview');
        const genLogoPlaceholder = document.getElementById('gen-logo-placeholder');
        const btnTriggerLogo = document.getElementById('btn-trigger-logo');
        const logoInput = document.getElementById('logoInput');

        // Cropper Elements
        const cropModal = document.getElementById('crop-modal');
        const cropTargetImg = document.getElementById('crop-target-img');
        const btnCropConfirm = document.getElementById('btn-crop-confirm');
        const btnCropCancel = document.getElementById('btn-crop-cancel');

        // Result Elements
        const processBtn = document.getElementById('process-btn');
        const genResultImg = document.getElementById('gen-result-img');
        const downloadBtn = document.getElementById('download-btn');
        const downloadLink = document.getElementById('download-link');
        const spinner = document.getElementById('spinner');
        const resultPlaceholder = document.getElementById('result-placeholder');
        const copyBtn = document.getElementById('copy-btn');
        const parseResultText = document.getElementById('parse-result-text');
        const parseSourceImg = document.getElementById('parse-source-img');
        const fileInput = document.getElementById('fileInput');
        const dropArea = document.getElementById('drop-area');
        const fileNameDisplay = document.getElementById('file-name-display');

        // State
        let currentMode = 'generate'; 
        let currentStyle = 'standard';
        let parseFile = null;
        let logoFile = null; 
        let cropper = null;

        // === 1. 颜色同步 ===
        const syncColor = (input, label, preview) => {
            input.oninput = () => {
                label.textContent = input.value;
                if(preview) preview.style.backgroundColor = input.value;
            };
        };
        if(fillColor && valFill) syncColor(fillColor, valFill, fillPreview);
        if(backColor && valBack) syncColor(backColor, valBack, backPreview);

        // === 2. Textarea 自适应 ===
        if (qrContent) {
            qrContent.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        // === 3. Logo 上传与裁剪 ===
        if (btnTriggerLogo) btnTriggerLogo.onclick = () => logoInput.click();

        // 额外的安全措施：防止图片拖拽
        if (cropTargetImg) cropTargetImg.ondragstart = () => false;

        if (logoInput) {
            logoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                
                logoInput.value = '';

                const url = URL.createObjectURL(file);
                
                cropModal.style.display = 'flex';

                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }

                const img = document.getElementById('crop-target-img');
                
                // 重置状态
                img.style.opacity = '0'; 
                img.src = url;

                img.onload = () => {
                    img.style.opacity = '1';
                    cropper = new Cropper(img, {
                        aspectRatio: 1 / 1,
                        viewMode: 1,      
                        dragMode: 'move', 
                        autoCropArea: 0.8,
                        guides: false,
                        center: true,
                        highlight: false,
                        cropBoxMovable: false,   
                        cropBoxResizable: true,  
                        toggleDragModeOnDblclick: false,
                        background: false,       
                        minContainerHeight: 300,
                        minContainerWidth: 300,
                        checkCrossOrigin: false,
                    });
                };

                img.onerror = () => {
                    console.log("Image load warning (suppressed)");
                };
            };
        }

        if (btnCropConfirm) {
            btnCropConfirm.onclick = () => {
                if (!cropper) return;
                cropper.getCroppedCanvas({
                    width: 300, height: 300, imageSmoothingQuality: 'high'
                }).toBlob((blob) => {
                    logoFile = blob;
                    const url = URL.createObjectURL(blob);
                    genLogoPreview.src = url;
                    genLogoPreview.style.display = 'block';
                    if(genLogoPlaceholder) genLogoPlaceholder.style.display = 'none';
                    if(btnTriggerLogo) btnTriggerLogo.textContent = "✅ 已选择";
                    closeModal();
                }, 'image/png');
            };
        }

        if (btnCropCancel) btnCropCancel.onclick = closeModal;

        function closeModal() {
            cropModal.style.display = 'none';
            if (cropper) { 
                cropper.destroy(); 
                cropper = null; 
            }
            if(cropTargetImg) cropTargetImg.src = '';
        }

        // === 4. 模式切换 ===
        const toggleUI = (mode) => {
            currentMode = mode;
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
            panels.forEach(p => p.classList.toggle('active', p.id === `panel-${mode}`));
            btnText.textContent = mode === 'generate' ? '立即生成' : '开始解析';
            
            genResultImg.style.display = 'none';
            parseResultText.style.display = 'none';
            downloadBtn.style.display = 'none';
            copyBtn.style.display = 'none';
            resultPlaceholder.style.display = 'block';

            if (mode === 'generate') {
                leftBoxLabel.textContent = "Logo 预览";
                parseSourceImg.style.display = 'none';
                genLogoArea.style.display = 'flex';
            } else {
                leftBoxLabel.textContent = "输入图片";
                genLogoArea.style.display = 'none';
                parseSourceImg.style.display = parseFile ? 'block' : 'none';
            }
        };
        tabs.forEach(tab => tab.onclick = () => toggleUI(tab.dataset.tab));

        // === 5. 风格切换 ===
        const styleCards = document.querySelectorAll('.style-card');
        styleCards.forEach(card => {
            card.onclick = () => {
                styleCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentStyle = card.dataset.style;
            };
        });

        // === 6. 解析模式文件上传 ===
        const handleFileSelect = (file) => {
            if (!file || !file.type.startsWith('image/')) {
                alert('请上传有效的图片文件');
                return;
            }
            parseFile = file;
            if(fileNameDisplay) fileNameDisplay.textContent = file.name;
            
            if (parseSourceImg) {
                const url = URL.createObjectURL(file);
                parseSourceImg.src = url;
                parseSourceImg.style.display = 'block';
            }
        };

        if (dropArea && fileInput) {
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
        }

        // === 7. 复制按钮 ===
        if (copyBtn) {
            copyBtn.onclick = async () => {
                const text = parseResultText.value;
                if (!text) return;
                try {
                    await navigator.clipboard.writeText(text);
                    const originalText = "📋 复制文本";
                    copyBtn.textContent = '✅ 已复制';
                    copyBtn.classList.add('btn-success');
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.classList.remove('btn-success');
                    }, 2000);
                } catch (err) { alert('复制失败'); }
            };
        }

        // === 8. 主流程 ===
        if (processBtn) {
            processBtn.onclick = async () => {
                processBtn.disabled = true;
                spinner.style.display = 'block';
                resultPlaceholder.style.display = 'none';

                try {
                    if (currentMode === 'generate') {
                        const content = qrContent.value.trim();
                        if (!content) throw new Error("请输入内容");

                        const formData = new FormData();
                        formData.append('content', content);
                        formData.append('box_size', boxSize.value);
                        formData.append('border', borderSize.value);
                        formData.append('fill_color', fillColor.value);
                        formData.append('back_color', backColor.value);
                        formData.append('style', currentStyle);
                        if (logoFile) formData.append('logo_file', logoFile, "logo.png");

                        const res = await fetch('/api/qrcode/generate', { method: 'POST', body: formData });
                        if (!res.ok) throw new Error("生成失败");
                        
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        genResultImg.src = url;
                        genResultImg.style.display = 'block';
                        
                        downloadLink.href = url;
                        downloadLink.download = `qrcode_${Date.now()}.png`;
                        downloadBtn.style.display = 'inline-flex';

                    } else { // Parse Mode
                        if (!parseFile) throw new Error("请上传图片");
                        const formData = new FormData();
                        formData.append('file', parseFile);

                        const res = await fetch('/api/qrcode/parse', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || "无法识别");

                        parseResultText.value = data.content;
                        parseResultText.style.display = 'block';
                        copyBtn.style.display = 'inline-flex';
                    }
                } catch (err) {
                    alert(err.message);
                    resultPlaceholder.style.display = 'block';
                } finally {
                    processBtn.disabled = false;
                    spinner.style.display = 'none';
                }
            };
        }

        // Sliders Text Update
        [boxSize, borderSize].forEach(el => {
            if(el) el.oninput = function() { this.nextElementSibling.textContent = this.value; };
        });
    }

    document.addEventListener('DOMContentLoaded', initQRCodeTool);
    document.addEventListener('pjax:complete', initQRCodeTool);
    initQRCodeTool();
})();