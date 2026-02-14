// source/js/custom_sidebar.js

function optimizeSidebar() {
  const path = window.location.pathname;
  
  // 1. 定义基础保留名单 (所有目标页面都保留的卡片)
  // 对应: 个人信息、公告、网站资讯
  const baseAllowed = ['card-info', 'card-announcement', 'card-webinfo'];
  
  // 2. 定义完全匹配的路径 (精确匹配)
  const exactPaths = [
    '/categories/',
    '/tags/',
    '/photos/',
    '/messageboard/',
    '/tools/ocrlatex/',
    '/tools/translate/',
    '/flink/'
  ];

  // 3. 核心逻辑函数：隐藏不在白名单内的所有卡片
  const filterWidgets = (allowedList) => {
    const widgets = document.querySelectorAll('#aside-content .card-widget');
    widgets.forEach(widget => {
      let shouldKeep = false;
      // 检查当前挂件是否在允许列表中
      allowedList.forEach(cls => {
        if (widget.classList.contains(cls)) {
          shouldKeep = true;
        }
      });
      
      // 如果不在白名单，则隐藏
      if (!shouldKeep) {
        widget.style.display = 'none';
      } else {
        // 确保之前被隐藏的（PJAX切换回来时）重新显示
        widget.style.display = ''; 
      }
    });
  };

  // --- 执行判断逻辑 ---

  // 情况 A: 归档及其子页面 (使用 startsWith 匹配 /archives/xxxx)
  if (path.startsWith('/archives/')) {
    // 归档页额外保留: card-archives
    filterWidgets([...baseAllowed, 'card-archives']);
  } 
  // 情况 B: 精确匹配的页面 (分类、标签、自定义页等)
  else if (exactPaths.includes(path) || exactPaths.includes(path.replace(/\/$/, ''))) { 
    // 仅保留基础项
    filterWidgets(baseAllowed);
  }
  // 情况 C: 其他页面 (如首页、文章详情页)
  else {
    // 恢复所有显示 (防止 PJAX 缓存导致首页侧边栏也消失)
    const widgets = document.querySelectorAll('#aside-content .card-widget');
    widgets.forEach(w => w.style.display = '');
  }
}

// 4. 绑定事件 (兼容 Butterfly 的 PJAX)
document.addEventListener('DOMContentLoaded', optimizeSidebar);
document.addEventListener('pjax:complete', optimizeSidebar);