/* 风叶穿行 页面引导脚本（由 backups/leaves-in-wind/js/background.js 整理而来）
 * 职责：实例化游戏、加载层控制、工具栏（返回/全屏）、键盘聚焦、pjax 防护与清理 */
(function () {
    'use strict';

    var game = null;
    var started = false;

    /* 直接整页跳回来源博客页，而不是 history.back()：
       history.back() 会触发博客侧 pjax 的 popstate 恢复逻辑，
       在独立页与主题壳 DOM 不一致时报 "Pjax switch fail" 控制台错误 */
    function backToBlog() {
        var ref = document.referrer;
        var fromBlog = ref && (ref.indexOf('luotian.cyou') !== -1 || ref.indexOf('luotian001.github.io') !== -1);
        window.location.href = fromBlog ? ref : 'https://www.luotian.cyou/';
    }

    /* 全屏/窗口尺寸变化时，同步 .banner-game 外层 div 的高度：
       游戏内部只在挂载时计算一次 div 高度，全屏后会与画布/覆盖层错位 */
    function syncGameSize() {
        var banner = document.getElementById('banner');
        var bg = banner && banner.querySelector('.banner-game');
        if (!banner || !bg) return;
        bg.style.height = (banner.clientWidth * 3 / 16) + 'px';
    }
    window.addEventListener('resize', syncGameSize);
    window.addEventListener('fullscreenchange', syncGameSize);
    window.addEventListener('webkitfullscreenchange', syncGameSize);

    function exitHandler() {
        var fsBtn = document.getElementById('fullscreen');
        if (!fsBtn) return;
        var isFull = document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement;
        fsBtn.innerText = isFull ? '退出全屏' : '全屏显示';
    }

    function bindToolbar() {
        var fsBtn = document.getElementById('fullscreen');
        var backBtn = document.getElementById('goback');
        if (fsBtn) {
            fsBtn.onclick = function () {
                var isFull = document.fullscreenElement || document.webkitFullscreenElement ||
                    document.mozFullScreenElement || document.msFullscreenElement;
                if (isFull) {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    else if (document.msExitFullscreen) document.msExitFullscreen();
                } else {
                    var el = document.documentElement;
                    if (el.requestFullscreen) el.requestFullscreen();
                    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
                    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
                    else if (el.msRequestFullscreen) el.msRequestFullscreen();
                }
            };
        }
        if (backBtn) backBtn.onclick = backToBlog;
        document.addEventListener('fullscreenchange', exitHandler);
        document.addEventListener('webkitfullscreenchange', exitHandler);
        document.addEventListener('mozfullscreenchange', exitHandler);
        document.addEventListener('MSFullscreenChange', exitHandler);
    }

    function hideLoading() {
        var el = document.getElementById('liw-loading');
        if (!el) return;
        el.classList.add('liw-hidden');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 600);
    }

    function showError(msg) {
        var el = document.getElementById('liw-loading');
        if (!el) return;
        var img = el.querySelector('img');
        if (img) img.style.display = 'none';
        var p = el.querySelector('p');
        if (p) {
            p.textContent = msg;
            p.style.color = '#ffb3b3';
        }
        el.classList.remove('liw-hidden');
    }

    function init() {
        var banner = document.getElementById('banner');
        if (!banner || started) return;
        started = true;
        bindToolbar();

        var Ctor = window.BannerGameSpring2022;
        if (typeof Ctor !== 'function') {
            showError('游戏脚本加载失败，请刷新页面重试。');
            return;
        }
        try {
            game = new Ctor(banner);
        } catch (e) {
            game = null;
            showError('游戏初始化失败，请使用支持 WebGL2 的现代浏览器（Chrome / Edge / Firefox）。');
            return;
        }

        game.init().then(function () {
            hideLoading();
            game.showGuide();
            syncGameSize();
            var bg = banner.querySelector('.banner-game');
            if (bg && bg.focus) bg.focus({ preventScroll: true });
            // 游戏键盘监听绑定在 .banner-game 上，点击游戏区域时重新聚焦
            banner.addEventListener('click', function () {
                var el = banner.querySelector('.banner-game');
                if (el && el.focus && document.activeElement !== el) el.focus({ preventScroll: true });
            });
        }).catch(function (err) {
            console.error('[leaves-in-wind] init failed:', err);
            showError('游戏资源加载失败，请检查网络后刷新页面重试。');
        });
    }

    function destroy() {
        started = false;
        if (game) {
            try { game.destroy(); } catch (e) { /* ignore */ }
            game = null;
        }
    }

    /* 独立页被 pjax 嵌入博客主题壳时（出现主题侧栏/页头），强制整页跳转 */
    function guardStandalone() {
        var embedded = document.getElementById('banner') &&
            (document.getElementById('page-header') || document.getElementById('sidebar') || document.getElementById('web_bg'));
        if (embedded) window.location.replace('/game/leaves-in-wind/');
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);
    document.addEventListener('pjax:send', destroy);
    guardStandalone();
    if (document.readyState === 'interactive' || document.readyState === 'complete') init();
})();
