(function() {
    // 封装初始化逻辑，适配 Pjax 和 首次加载
    function initMTran() {
        const app = document.getElementById('translate-tool-root');
        if (!app) return;

        const srcLang = document.getElementById('tr-srcLang');
        const tgtLang = document.getElementById('tr-tgtLang');
        const inputTxt = document.getElementById('tr-inputTxt');
        const outputTxt = document.getElementById('tr-outputTxt');
        const transBtn = document.getElementById('tr-transBtn');
        const swapBtn = document.getElementById('tr-swapBtn');
        const charCount = document.getElementById('tr-charCount');
        const clearBtn = document.getElementById('tr-clearBtn');
        const copyBtn = document.getElementById('tr-copyBtn');
        const BASE_URL = 'https://api.luotian.cyou/api/translate';

        // 交换语言
        if(swapBtn) {
            swapBtn.onclick = () => {
                const tempLang = srcLang.value;
                srcLang.value = tgtLang.value;
                tgtLang.value = tempLang;
                const tempText = inputTxt.value;
                inputTxt.value = outputTxt.value;
                outputTxt.value = tempText;
                // 更新字符计数
                if(charCount) charCount.textContent = `${inputTxt.value.length} 字符`;
            };
        }

        // 字符计数监听
        if(inputTxt) {
            inputTxt.oninput = () => {
                if(charCount) charCount.textContent = `${inputTxt.value.length} 字符`;
            };
        }

        // 清空内容
        if(clearBtn) {
            clearBtn.onclick = () => {
                inputTxt.value = '';
                outputTxt.value = '';
                if(charCount) charCount.textContent = '0 字符';
                inputTxt.focus();
            };
        }

        // 复制结果
        if(copyBtn) {
            copyBtn.onclick = function() {
                const text = outputTxt.value;
                if (!text) return;
                
                // 暂存按钮引用，防止在 setTimeout 中丢失上下文
                const btn = this; 
                
                navigator.clipboard.writeText(text).then(() => {
                    btn.classList.add('copied');
                    btn.innerHTML = '✅ 已复制';
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.innerHTML = '📋 复制';
                    }, 2000);
                }).catch(err => {
                    alert('复制失败，请手动复制');
                });
            };
        }

        // 翻译逻辑
        if(transBtn) {
            transBtn.onclick = async () => {
                const text = inputTxt.value.trim();
                if (!text) {
                    alert('请输入要翻译的内容');
                    return;
                }

                // UI 状态更新
                transBtn.disabled = true;
                transBtn.textContent = '翻译中...';
                inputTxt.disabled = true;
                outputTxt.value = '正在思考...';

                try {
                    // 调用后端 API (保持原有接口不变)
                    const response = await fetch(BASE_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            q: text,
                            source: srcLang.value,
                            target: tgtLang.value,
                            format: 'text'
                        })
                    });

                    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                    const resData = await response.json();
                    
                    if (resData.data && resData.data.translations) {
                        outputTxt.value = resData.data.translations[0].translatedText;
                    } else {
                        outputTxt.value = '错误: 未能获取翻译结果';
                    }
                } catch (error) {
                    console.error(error);
                    outputTxt.value = '连接超时或服务未启动。\n请检查服务器状态。';
                } finally {
                    // 恢复 UI 状态
                    transBtn.disabled = false;
                    transBtn.textContent = '开始翻译';
                    inputTxt.disabled = false;
                }
            };
        }
    }

    document.addEventListener('DOMContentLoaded', initMTran);
    document.addEventListener('pjax:complete', initMTran);
    initMTran();

})();