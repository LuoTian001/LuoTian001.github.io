(function() {
    // 核心初始化逻辑
    const initSplitterTool = function() {

        const toolRoot = document.getElementById('splitter-tool-root');
        if (!toolRoot) return;

        const fileInput = document.getElementById('sp-fileInput');
        const btnSelect = document.getElementById('sp-btn-select');
        const imageTarget = document.getElementById('sp-image-target');
        const workspace = document.getElementById('sp-workspace');
        const controls = document.getElementById('sp-controls');
        const fileNameDisplay = document.getElementById('sp-file-name-display');
        const dropArea = document.getElementById('sp-drop-area');
        const resultArea = document.getElementById('sp-result-area');
        const gridContainer = document.getElementById('sp-grid-container');
        const btnDownload = document.getElementById('sp-btn-download');
        
        // 按钮组
        const btnReset = document.getElementById('sp-btn-reset');
        const btnSplit4 = document.getElementById('sp-btn-split-4');
        const btnSplit9 = document.getElementById('sp-btn-split-9');

        // 状态变量
        let cropper = null;
        let generatedBlobs = [];
        let currentFileName = "image";

        function initCropper() {
            if (cropper) {
                cropper.destroy();
            }
            // 确保 Cropper 库已加载
            if (typeof Cropper === 'undefined') {
                console.error("Cropper.js library not loaded!");
                return;
            }
            
            cropper = new Cropper(imageTarget, {
                aspectRatio: 1 / 1,
                viewMode: 1, 
                dragMode: 'move', 
                autoCropArea: 0.9,
                restore: false,
                guides: false,
                center: true,
                highlight: false,
                cropBoxMovable: false, // 固定裁剪框，只允许移动图片
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                checkCrossOrigin: false, 
                background: false,
                minContainerHeight: 300,
            });
        }

        function handleFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('请上传有效的图片文件');
                return;
            }

            currentFileName = file.name.replace(/\.[^/.]+$/, "");
            fileNameDisplay.textContent = file.name;

            workspace.style.display = 'flex';
            controls.style.display = 'flex';
            resultArea.style.display = 'none';

            const url = URL.createObjectURL(file);
            
            imageTarget.src = url;
            
            // 图片加载完成后初始化裁剪器
            imageTarget.onload = function() {
                initCropper();
            };
        }

        function processSplit(gridSize) {
            if (!cropper) return;

            const canvas = cropper.getCroppedCanvas({
                imageSmoothingQuality: 'high'
            });
            if (!canvas) return;

            gridContainer.innerHTML = '';
            gridContainer.className = `grid-preview grid-${gridSize}`;
            resultArea.style.display = 'block';
            generatedBlobs = [];
            
            // 平滑滚动
            setTimeout(() => resultArea.scrollIntoView({ behavior: 'smooth' }), 100);

            const pieceW = canvas.width / gridSize;
            const pieceH = canvas.height / gridSize;
            const promises = [];

            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const p = new Promise((resolve) => {
                        const idx = row * gridSize + col;
                        const pieceCanvas = document.createElement('canvas');
                        pieceCanvas.width = pieceW;
                        pieceCanvas.height = pieceH;
                        const ctx = pieceCanvas.getContext('2d');

                        ctx.drawImage(
                            canvas, 
                            col * pieceW, row * pieceH, pieceW, pieceH, 
                            0, 0, pieceW, pieceH
                        );

                        pieceCanvas.toBlob((blob) => {
                            resolve({
                                index: idx,
                                name: `${idx + 1}.jpg`,
                                blob: blob,
                                url: URL.createObjectURL(blob)
                            });
                        }, 'image/jpeg', 0.95);
                    });
                    promises.push(p);
                }
            }

            Promise.all(promises).then((results) => {
                results.sort((a, b) => a.index - b.index);
                generatedBlobs = results;

                results.forEach(item => {
                    const img = document.createElement('img');
                    img.src = item.url;
                    img.className = 'grid-item';
                    img.classList.add('no-lightbox'); 
                    gridContainer.appendChild(img);
                });
            });
        }
        // 绑定按钮点击事件
        btnSelect.onclick = () => fileInput.click();
        dropArea.addEventListener('click', () => fileInput.click());
        fileInput.onchange = (e) => handleFile(e.target.files[0]);
        
        btnReset.onclick = () => {
            if (cropper) cropper.reset();
        };

        btnSplit4.onclick = () => processSplit(2);
        btnSplit9.onclick = () => processSplit(3);

        // 拖拽事件
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
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        };

        // 下载事件
        btnDownload.onclick = function() {
            if (generatedBlobs.length === 0) return;
            if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
                alert('依赖库加载失败，请刷新重试');
                return;
            }

            let suffix = "-split";
            if (generatedBlobs.length === 4) suffix = "-2x2";
            else if (generatedBlobs.length === 9) suffix = "-3x3";

            const zip = new JSZip();
            const folder = zip.folder(currentFileName + suffix);
            
            generatedBlobs.forEach(item => {
                folder.file(item.name, item.blob);
            });

            zip.generateAsync({type:"blob"}).then((content) => {
                saveAs(content, `${currentFileName}${suffix}.zip`);
            });
        };
    };

    document.addEventListener('DOMContentLoaded', initSplitterTool);
    document.addEventListener('pjax:complete', initSplitterTool);
    initSplitterTool();

})();