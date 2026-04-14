(function() {
    function initBase64Tool() {
        const rootEl = document.getElementById('base64-tool-root');
        if (!rootEl) return;

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        
        const primaryTabs = document.querySelectorAll('#primary-tabs .tab-item');
        const encodeTypeCards = document.querySelectorAll('#encode-type-selector .style-card');
        
        const encodeControls = document.getElementById('encode-controls');
        const encodeTextContainer = document.getElementById('encode-text-container');
        const encodeFileContainer = document.getElementById('encode-file-container');
        const encodeTextInput = document.getElementById('encode-text-input');
        const encodeFileInput = document.getElementById('encode-file-input');
        const encodeFileName = document.getElementById('encode-file-name');
        
        const mainWorkspace = document.getElementById('main-workspace');
        const decodeInputCol = document.getElementById('decode-input-col');
        const encodePreviewCol = document.getElementById('encode-preview-col');
        const resultCol = document.getElementById('result-col');
        const resultLabel = document.getElementById('result-label'); 
        
        const decodeInput = document.getElementById('decode-input');
        const encodePreviewImg = document.getElementById('encode-preview-img');
        const encodeFileIcon = document.getElementById('encode-file-icon');
        const encodeFileExt = document.getElementById('encode-file-ext');
        const encodePreviewPlaceholder = document.getElementById('encode-preview-placeholder');

        const resultText = document.getElementById('result-text');
        const resultPreviewImg = document.getElementById('result-preview-img');
        const resultFileWrapper = document.getElementById('result-file-wrapper');
        const resultFileExt = document.getElementById('result-file-ext');
        
        const processBtn = document.getElementById('process-btn');
        const btnText = document.getElementById('btn-text');
        const actionBtn = document.getElementById('action-btn');
        const downloadTxtBtn = document.getElementById('download-txt-btn'); 
        const clearBtn = document.getElementById('clear-btn');

        let currentMode = 'encode'; 
        let encodeType = 'text';    
        let targetFile = null;
        let decodeResultData = null; 

        // === 核心工具库 ===

        const getExtensionFromMime = (mime) => {
            const mimeMap = {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'application/vnd.ms-powerpoint': '.ppt',
                'application/pdf': '.pdf',
                'application/zip': '.zip',
                'application/x-zip-compressed': '.zip',
                'application/x-rar-compressed': '.rar',
                'text/plain': '.txt',
                'text/csv': '.csv',
                'application/json': '.json',
                'application/javascript': '.js'
            };
            if (mimeMap[mime]) return mimeMap[mime];
            const match = mime.match(/\/([a-zA-Z0-9.+]+)$/);
            if (match) {
                let ext = match[1];
                if (ext.startsWith('x-')) ext = ext.substring(2);
                return '.' + ext.split('+')[0]; 
            }
            return '.bin';
        };

        const utf8ToBase64 = (str) => {
            const bytes = new TextEncoder().encode(str);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        };

        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file); 
            });
        };

        const base64ToBlob = (b64Data, contentType = '') => {
            const byteCharacters = window.atob(b64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, { type: contentType });
        };

        /**
         * 探测并调用 Butterfly 主题内置的图片预览组件 (兼容 Fancybox)
         * 若当前环境未加载相关插件，则降级为浏览器新标签页打开
         */
        const triggerNativePreview = (src) => {
            if (window.Fancybox) {
                window.Fancybox.show([{ src: src, type: "image" }]);
            } else if (window.ViewImage && window.ViewImage.display) {
                window.ViewImage.display([src]);
            } else {
                window.open(src, '_blank');
            }
        };

        // === UI 状态调度器 ===

        const updateLayout = () => {
            decodeInputCol.style.display = 'none';
            encodePreviewCol.style.display = 'none';
            encodeControls.style.display = 'none';
            mainWorkspace.className = 'layout-grid'; 

            if (currentMode === 'encode') {
                encodeControls.style.display = 'block';
                if (encodeType === 'text') {
                    mainWorkspace.classList.add('grid-1-col');
                    resultCol.className = 'workspace-col col-height-sm';
                } else {
                    mainWorkspace.classList.add('grid-2-col');
                    encodePreviewCol.style.display = 'flex';
                    resultCol.className = 'workspace-col col-height-md';
                }
            } else { 
                mainWorkspace.classList.add('grid-2-col');
                decodeInputCol.style.display = 'flex';
                resultCol.className = 'workspace-col col-height-md';
            }
        };

        const switchResultView = (viewType) => {
            resultText.style.display = 'none';
            resultPreviewImg.style.display = 'none';
            resultFileWrapper.style.display = 'none';
            resultPreviewImg.removeAttribute('src');
            resultPreviewImg.classList.remove('interactive');
            resultPreviewImg.onclick = null;

            if (viewType === 'text') resultText.style.display = 'block';
            if (viewType === 'preview') resultPreviewImg.style.display = 'block';
            if (viewType === 'icon') resultFileWrapper.style.display = 'flex';
        };

        const setActionBtn = (actionType, extension = '') => {
            actionBtn.style.display = 'flex';
            downloadTxtBtn.style.display = 'none'; 
            actionBtn.className = 'btn btn-download'; 
            
            if (actionType === 'copy') {
                actionBtn.textContent = '📋 复制结果';
                actionBtn.onclick = handleCopy;
                if (currentMode === 'encode') {
                    downloadTxtBtn.style.display = 'flex';
                    downloadTxtBtn.onclick = () => handleDownloadTxt(resultText.value);
                }
            } else if (actionType === 'download') {
                actionBtn.textContent = `📥 下载文件 (${extension})`;
                actionBtn.className = 'btn btn-primary'; 
                actionBtn.onclick = () => handleDownload(`decode_result${extension}`);
            }
        };

        primaryTabs.forEach(tab => {
            tab.onclick = () => {
                currentMode = tab.dataset.mode;
                primaryTabs.forEach(t => t.classList.toggle('active', t === tab));
                btnText.textContent = currentMode === 'encode' ? '立即编码' : '立即解码';
                resultLabel.textContent = currentMode === 'encode' ? 'Base64 代码' : '处理结果';
                clearState();
                updateLayout();
            };
        });

        encodeTypeCards.forEach(card => {
            card.onclick = () => {
                encodeType = card.dataset.type;
                encodeTypeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                encodeTextContainer.style.display = encodeType === 'text' ? 'block' : 'none';
                encodeFileContainer.style.display = encodeType === 'file' ? 'flex' : 'none';
                clearState();
                updateLayout();
            };
        });

        const handleFileSelect = (file) => {
            if (!file) return;
            if (file.size > MAX_FILE_SIZE) {
                alert(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)。`);
                encodeFileInput.value = '';
                return;
            }
            targetFile = file;
            encodeFileName.textContent = `已上传: ${file.name}`;
            
            encodePreviewPlaceholder.style.display = 'none';
            encodePreviewImg.style.display = 'none';
            encodeFileIcon.style.display = 'none';
            encodePreviewImg.removeAttribute('src');
            encodePreviewImg.classList.remove('interactive');
            encodePreviewImg.onclick = null;

            if (file.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(file);
                encodePreviewImg.src = objectUrl;
                encodePreviewImg.style.display = 'block';
                // 激活预览交互并绑定原生预览组件
                encodePreviewImg.classList.add('interactive');
                encodePreviewImg.onclick = (e) => {
                    e.preventDefault();     // 阻止默认 a 标签跳转
                    e.stopPropagation();    // 阻断冒泡，屏蔽 Butterfly 默认灯箱拦截
                    triggerNativePreview(objectUrl);
                };
            } else {
                const extMatch = file.name.match(/\.[0-9a-z]+$/i);
                encodeFileExt.textContent = extMatch ? extMatch[0] : '.unknown';
                encodeFileIcon.style.display = 'flex';
            }
        };

        if (encodeFileContainer) {
            encodeFileContainer.onclick = () => encodeFileInput.click();
            encodeFileInput.onchange = (e) => handleFileSelect(e.target.files[0]);
            encodeFileContainer.ondragover = (e) => { e.preventDefault(); encodeFileContainer.style.borderColor = 'var(--qr-primary)'; };
            encodeFileContainer.ondragleave = (e) => { e.preventDefault(); encodeFileContainer.style.borderColor = 'var(--qr-border)'; };
            encodeFileContainer.ondrop = (e) => {
                e.preventDefault();
                encodeFileContainer.style.borderColor = 'var(--qr-border)';
                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
            };
        }

        processBtn.onclick = async () => {
            try {
                if (currentMode === 'encode') {
                    if (encodeType === 'text') {
                        const str = encodeTextInput.value.trim();
                        if (!str) throw new Error("缺少输入内容");
                        switchResultView('text');
                        resultText.value = utf8ToBase64(str);
                        setActionBtn('copy');
                    } else {
                        if (!targetFile) throw new Error("尚未上传文件");
                        const b64Data = await fileToBase64(targetFile);
                        switchResultView('text');
                        resultText.value = b64Data;
                        setActionBtn('copy');
                    }
                } 
                else if (currentMode === 'decode') {
                    const inputStr = decodeInput.value.trim().replace(/\s/g, '');
                    if (!inputStr) throw new Error("缺少解码载荷");
                    const dataUriMatch = inputStr.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+)(;charset=[^;]+)?(;base64)?,(.*)$/);
                    
                    if (dataUriMatch) {
                        const mime = dataUriMatch[1];
                        const b64Data = dataUriMatch[4];
                        if (mime.startsWith('text/') || mime === 'application/json') {
                            const blob = base64ToBlob(b64Data, mime);
                            const textData = await blob.text();
                            switchResultView('text');
                            resultText.value = textData;
                            setActionBtn('copy');
                        } 
                        else if (mime.startsWith('image/')) {
                            switchResultView('preview');
                            resultPreviewImg.src = inputStr; 
                            // 激活预览交互并绑定原生预览组件
                            resultPreviewImg.classList.add('interactive');
                            resultPreviewImg.onclick = (e) => {
                                e.preventDefault();     // 阻止默认行为
                                e.stopPropagation();    // 阻断冒泡，屏蔽 Butterfly 默认灯箱拦截
                                triggerNativePreview(inputStr);
                            };

                            decodeResultData = base64ToBlob(b64Data, mime);
                            const ext = getExtensionFromMime(mime);
                            setActionBtn('download', ext);
                        } 
                        else {
                            switchResultView('icon');
                            const ext = getExtensionFromMime(mime);
                            resultFileExt.textContent = ext;
                            decodeResultData = base64ToBlob(b64Data, mime);
                            setActionBtn('download', ext);
                        }
                        return; 
                    }

                    try {
                        const binaryStr = window.atob(inputStr);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                        const decoder = new TextDecoder('utf-8', { fatal: true });
                        const textResult = decoder.decode(bytes);
                        switchResultView('text');
                        resultText.value = textResult;
                        setActionBtn('copy');
                    } catch (decodeErr) {
                        switchResultView('icon');
                        resultFileExt.textContent = '.bin';
                        decodeResultData = base64ToBlob(inputStr, 'application/octet-stream');
                        setActionBtn('download', '.bin');
                    }
                }
            } catch (err) {
                alert(`处理失败: ${err.message || "无效的数据格式"}`);
            }
        };

        const handleCopy = async () => {
            if (!resultText.value) return;
            try {
                await navigator.clipboard.writeText(resultText.value);
                const prevText = actionBtn.textContent;
                actionBtn.textContent = '✅ 已复制';
                actionBtn.classList.add('btn-success');
                setTimeout(() => {
                    actionBtn.textContent = prevText;
                    actionBtn.classList.remove('btn-success');
                }, 2000);
            } catch (err) { alert('剪贴板操作被拒绝'); }
        };

        const handleDownload = (filename) => {
            if (!decodeResultData) return;
            const url = URL.createObjectURL(decodeResultData);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        };

        const handleDownloadTxt = (textContent) => {
            if (!textContent) return;
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `base64_encoded_${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        };

        const clearState = () => {
            encodeTextInput.value = '';
            decodeInput.value = '';
            encodeFileInput.value = '';
            targetFile = null;
            encodeFileName.textContent = '点击或拖拽上传';
            
            encodePreviewPlaceholder.style.display = 'inline';
            encodePreviewImg.style.display = 'none';
            encodeFileIcon.style.display = 'none';
            encodePreviewImg.removeAttribute('src');
            encodePreviewImg.classList.remove('interactive');
            encodePreviewImg.onclick = null;

            resultText.value = '';
            switchResultView('text');
            actionBtn.style.display = 'none';
            downloadTxtBtn.style.display = 'none'; 
            decodeResultData = null;
        };

        clearBtn.onclick = clearState;
        updateLayout();
    }

    document.addEventListener('DOMContentLoaded', initBase64Tool);
    document.addEventListener('pjax:complete', initBase64Tool);
    if(document.readyState === "complete" || document.readyState === "interactive") { setTimeout(initBase64Tool, 1); }
})();