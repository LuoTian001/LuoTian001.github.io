(function() {
    const BG_CONFIG = {
        LIGHT_AM: 'https://cdn.luotian.cyou/blog-img/bkgnd1.webp', // 00:00 - 12:00
        LIGHT_PM: 'https://cdn.luotian.cyou/blog-img/bkgnd2.webp', // 12:00 - 24:00
        DARK:     'https://cdn.luotian.cyou/blog-img/bkgnd3.webp'  // 黑夜
    };

    const CACHE_NAME = 'butterfly-bg-cache-v1';
    let currentObjectUrl = null; // 用于内存回收

    function getTargetBg() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (currentTheme === 'dark') return BG_CONFIG.DARK;
        return new Date().getHours() < 12 ? BG_CONFIG.LIGHT_AM : BG_CONFIG.LIGHT_PM;
    }

    /**
     * 核心缓存引擎 (Cache Engine)
     * @param {string} url 原始 CDN 地址
     * @returns {Promise<string>} 内存对象 URL 或原始 URL (降级)
     */
    async function loadFromCacheOrNetwork(url) {
        if (!('caches' in window)) return url; // 浏览器不支持 Cache API 的降级方案

        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(url);

            // 1. 缓存命中 (Cache Hit)
            if (cachedResponse) {
                const blob = await cachedResponse.blob();
                return URL.createObjectURL(blob);
            }

            // 2. 缓存未命中 (Cache Miss)，发起网络请求
            const networkResponse = await fetch(url, { mode: 'cors' }); // 强制声明跨域
            if (networkResponse.ok) {
                // 将响应流克隆一份存入缓存
                await cache.put(url, networkResponse.clone());
                const blob = await networkResponse.blob();
                return URL.createObjectURL(blob);
            }
        } catch (error) {
            console.error('[BG Cache Engine] 请求异常，回退至网络直连:', error);
        }

        return url; // 任何异常均平滑降级为原生 URL
    }

    /**
     * 渲染与平滑过渡系统
     */
    async function performBgSwitch(targetUrl, isInitial = false) {
        const webBg = document.getElementById('web_bg');
        
        // 状态拦截：使用 dataset 记录原始 targetUrl 防止冗余执行
        if (!webBg || webBg.dataset.sourceUrl === targetUrl) return;
        webBg.dataset.sourceUrl = targetUrl;

        // 获取缓存或真实网络资源
        const renderUrl = await loadFromCacheOrNetwork(targetUrl);

        if (isInitial) {
            webBg.style.backgroundImage = `url('${renderUrl}')`;
            if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = renderUrl.startsWith('blob:') ? renderUrl : null;
            return;
        }

        const loader = new Image();
        loader.src = renderUrl;
        loader.onload = () => {
            let buffer = document.getElementById('web_bg_buffer');
            if (!buffer) {
                buffer = document.createElement('div');
                buffer.id = 'web_bg_buffer';
                document.body.appendChild(buffer);
            }
            buffer.style.backgroundImage = `url('${renderUrl}')`;
            buffer.getBoundingClientRect(); 
            buffer.style.opacity = '1';

            setTimeout(() => {
                webBg.style.backgroundImage = `url('${renderUrl}')`;
                buffer.style.opacity = '0';
                
                // 内存回收机制 (Garbage Collection): 释放旧的 ObjectURL
                if (currentObjectUrl && currentObjectUrl !== renderUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                }
                currentObjectUrl = renderUrl.startsWith('blob:') ? renderUrl : null;
            }, 1500);
        };
    }

    function getMsUntilNextNode() {
        const now = new Date();
        const nextHour = now.getHours() < 12 ? 12 : 24;
        const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour % 24, 0, 0, 0);
        if (nextHour === 24) nextDate.setDate(nextDate.getDate() + 1);
        return nextDate.getTime() - now.getTime();
    }

    function schedule() {
        setTimeout(() => {
            performBgSwitch(getTargetBg());
            schedule(); 
        }, getMsUntilNextNode());
    }

    function init() {
        performBgSwitch(getTargetBg(), true);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    performBgSwitch(getTargetBg());
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        schedule();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();