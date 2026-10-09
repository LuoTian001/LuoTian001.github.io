(function() {
    let globalPasteHandler = null;
    let isQuotaExhausted = false;

    function initOCRTool() {
        const toolRoot = document.getElementById('ocr-tool-root');
        if (!toolRoot) return;

        // 获取元素 (更新为新的 ID 和 Class)
        const dropzone = document.getElementById('ocr-dropzone');
        const fileInput = document.getElementById('ocr-fileInput');
        const resultCard = document.getElementById('ocr-result-card');
        const latexOutput = document.getElementById('ocr-latex-output');
        const latexRaw = document.getElementById('ocr-latex-raw');
        const engineValue = document.getElementById('ocr-engine-value');
        const elapsedValue = document.getElementById('ocr-elapsed-value');
        const callnumValue = document.getElementById('ocr-callnum-value');
        const loadingEl = document.getElementById('ocr-loading');
        const errorEl = document.getElementById('ocr-error-message');
        const copyBtn = document.getElementById('ocr-btn-copy');

        const BASE_URL = 'https://api.luotian.cyou/api/ocrlatex';

        async function fetchStatus() {
            try {
                const response = await fetch(`${BASE_URL}/status`);
                if (response.ok) {
                    const data = await response.json();
                    if (callnumValue) callnumValue.textContent = `${data.current}/${data.max}`;
                    if (data.is_exhausted) {
                        isQuotaExhausted = true;
                        showError("今日免费识别额度已耗尽，请明日再试。");
                        dropzone.style.cursor = 'not-allowed';
                    }
                }
            } catch (e) {
                console.warn("无法获取调用量状态", e);
            }
        }

        // 核心逻辑
        async function handleImage(eventOrFile) {
            if (isQuotaExhausted) {
                showError("今日免费识别额度已耗尽，请明日再试。");
                return;
            }
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

                const response = await fetch(BASE_URL, {
                    method: 'POST',
                    body: formData,
                    mode: 'cors'
                });

                if (!response.ok) {
                    let errorMsg = `HTTP 错误! 状态码: ${response.status}`;
                    let errJson = null;
                    try { errJson = await response.json(); } catch (e) {}
                    if (errJson && errJson.error) errorMsg = errJson.error;
                    // 仅全局每日额度耗尽时才锁定界面；IP 限流等可稍后重试
                    if (response.status === 429 && errorMsg.indexOf('今日') !== -1) {
                        isQuotaExhausted = true;
                    }
                    throw new Error(errorMsg);
                }

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

        function showResult({ latex, engine, elapsed, call_num, cached }) {
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

            if (engineValue) {
                engineValue.textContent = engine ? (cached ? engine + '（缓存）' : engine) : '--';
            }
            if (elapsedValue) {
                elapsedValue.textContent = (elapsed === null || elapsed === undefined) ? '--' : elapsed + 's';
            }
            if (callnumValue) callnumValue.textContent = call_num;

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

        fetchStatus();
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
