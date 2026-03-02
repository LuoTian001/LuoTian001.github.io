(function() {
    let metaResizeObserver = null;

    const initMetaSync = () => {
        const postInfo = document.getElementById('post-info');
        const layoutContainer = document.querySelector('#body-wrap .layout');
        if (!postInfo || !layoutContainer) {
            if (metaResizeObserver) {
                metaResizeObserver.disconnect();
                metaResizeObserver = null;
            }
            return;
        }

        const syncMetaCardWidth = () => {
            const layoutStyle = window.getComputedStyle(layoutContainer);
            const containerWidth = layoutContainer.getBoundingClientRect().width;
            const paddingLeft = parseFloat(layoutStyle.paddingLeft);
            const paddingRight = parseFloat(layoutStyle.paddingRight);
            const actualContentWidth = containerWidth - paddingLeft - paddingRight;
            postInfo.style.width = `${actualContentWidth}px`;
        };
        syncMetaCardWidth();
        if (metaResizeObserver) {
            metaResizeObserver.disconnect();
        }
        
        metaResizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(syncMetaCardWidth);
        });
        
        metaResizeObserver.observe(layoutContainer);
    };
    document.addEventListener('DOMContentLoaded', initMetaSync);
    document.addEventListener('pjax:complete', initMetaSync);
})();