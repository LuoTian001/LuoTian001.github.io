(function() {
    // 存储全局粘贴事件处理函数引用，以便卸载
    let globalPasteHandler = null;

    function initOCRTool() {
        const toolRoot = document.getElementById('ocr-tool-root');
        if (!toolRoot) return;

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

        const BASE_URL = 'https://www.luotian.cyou';

        async function handleImage(eventOrFile) {
            let blob;
            // 区分是 Paste Event 还是 File 对象
            if (eventOrFile instanceof Event) {
                // ClipboardEvent
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
                // File Object
                blob = eventOrFile;
            }

            if (!blob) return;

            showLoading(true);
            clearError();

            try {
                const formData = new FormData();
                formData.append('image', blob, 'pasted-image.png');

                // 调用 API
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
                // 检查 KaTeX 是否加载
                if (typeof katex !== 'undefined') {
                    katex.render(latex, latexOutput, {
                        throwOnError: false,
                        displayMode: true
                    });
                } else {
                    latexOutput.textContent = latex;
                    console.warn('KaTeX library not loaded.');
                }

                // 处理转义字符
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
            if(loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
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

        // 点击上传
        dropzone.onclick = () => fileInput.click();
        
        // 文件选择
        fileInput.onchange = (e) => {
            if (e.target.files[0]) handleImage(e.target.files[0]);
        };

        // 复制功能
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
        // 双击代码块也可以复制
        latexRaw.ondblclick = copyBtn.onclick;

        // 拖拽处理
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

        // 定义粘贴处理函数
        globalPasteHandler = function(e) {
            // 再次检查当前是否在工具页，双重保险
            if (!document.getElementById('ocr-tool-root')) return;
            handleImage(e);
        };

        // 绑定到 document
        document.addEventListener('paste', globalPasteHandler);
    }
    // 清理函数：在页面跳转前移除全局事件监听
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