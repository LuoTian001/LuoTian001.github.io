(function() {
    let globalPasteHandler = null;

    function initOCRTool() {
        const toolRoot = document.getElementById('ocr-tool-root');
        if (!toolRoot) return;

        // 获取元素 (更新为新的 ID 和 Class)
        const dropzone = document.getElementById('ocr-dropzone');
        const fileInput = document.getElementById('ocr-fileInput');
        const resultCard = document.getElementById('ocr-result-card');
        const latexOutput = document.getElementById('ocr-latex-output');
        const latexRaw = document.getElementById('ocr-latex-raw');
        const confidenceValue = document.getElementById('ocr-confidence-value');
        const callnumValue = document.getElementById('ocr-callnum-value');
        const loadingEl = document.getElementById('ocr-loading');
        const errorEl = document.getElementById('ocr-error-message');
        const copyBtn = document.getElementById('ocr-btn-copy');
        const uploadText = document.getElementById('ocr-upload-text');
        const BASE_URL = 'https://www.luotian.cyou';

        // 核心逻辑
        async function handleImage(eventOrFile) {
            let blob;
            if (eventOrFile instanceof Event) {
                const items = eventOrFile.clipboardData && eventOrFile.clipboardData.items;
                if (items) {
                    for (let item of items) {
                        if (item.type.startsWith('image')) {
                            blob = item.getAsFile();
                            break;
                        }
                    }
                }
            } else {
                blob = eventOrFile;
            }

            if (!blob) return;

            showLoading(true);
            clearError();

            try {
                const formData = new FormData();
                formData.append('image', blob, 'pasted-image.png');

                const response = await fetch(`${BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                    mode: 'cors'
                });

                if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
                
                const jsonResponse = await response.json();
                const { result, error } = jsonResponse;

                if (error) throw new Error(error);
                if (!result || !result.latex) throw new Error('未能识别到公式');

                showResult(result);
            } catch (error) {
                console.error(error);
                showError(error.message || "网络请求失败");
            } finally {
                showLoading(false);
            }
        }

        function showResult({ latex, conf, call_num }) {
            try {
                if (typeof katex !== 'undefined') {
                    katex.render(latex, latexOutput, {
                        throwOnError: false,
                        displayMode: true
                    });
                } else {
                    latexOutput.textContent = latex;
                }

                const cleanedLatex = latex.replace(/\\\\/g, '\\');
                latexRaw.textContent = '$' + cleanedLatex + '$';
                latexRaw.dataset.raw = '$' + cleanedLatex + '$'; 
            } catch (e) {
                latexOutput.textContent = latex;
            }

            if(confidenceValue) confidenceValue.textContent = (conf * 100).toFixed(1) + '%';
            if(callnumValue) callnumValue.textContent = call_num;
            
            resultCard.style.display = 'block';
        }

        function showLoading(show) {
            if (loadingEl) {
                loadingEl.style.display = show ? 'block' : 'none';
            }
            if (uploadText) {
                uploadText.textContent = show ? '⏳ 正在识别中...' : '📁 点击选择图片、拖拽至此或直接粘贴';
                // 识别时禁用点击交互的视觉反馈
                dropzone.style.pointerEvents = show ? 'none' : 'auto'; 
                dropzone.style.opacity = show ? '0.7' : '1';
            }
        }

        function showError(message) {
            if(errorEl) {
                errorEl.textContent = `错误: ${message}`;
                errorEl.style.display = 'block';
            }
        }

        function clearError() {
            if(errorEl) errorEl.style.display = 'none';
        }

        // 事件绑定
        dropzone.onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => {
            if (e.target.files[0]) handleImage(e.target.files[0]);
        };

        copyBtn.onclick = () => {
            const raw = latexRaw.dataset.raw;
            if(!raw) return;
            navigator.clipboard.writeText(raw).then(() => {
                copyBtn.classList.add('copied');
                copyBtn.textContent = '✅ 已复制';
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.textContent = '📋 复制';
                }, 2000);
            }).catch(err => {
                alert('复制失败，请手动复制');
            });
        };
        
        latexRaw.ondblclick = copyBtn.onclick;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                handleImage(files[0]);
            }
        });

        // 全局粘贴
        globalPasteHandler = function(e) {
            if (!document.getElementById('ocr-tool-root')) return;
            handleImage(e);
        };
        document.addEventListener('paste', globalPasteHandler);
    }

    function cleanup() {
        if (globalPasteHandler) {
            document.removeEventListener('paste', globalPasteHandler);
            globalPasteHandler = null;
        }
    }

    document.addEventListener('DOMContentLoaded', initOCRTool);
    document.addEventListener('pjax:complete', initOCRTool);
    document.addEventListener('pjax:send', cleanup);
    
    initOCRTool();
})();