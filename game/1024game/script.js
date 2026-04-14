(function() {
    function init1024Game() {
        const rootEl = document.getElementById('game-1024-root');
        if (!rootEl) return;

        const bgContainer = document.getElementById('grid-background');
        const tileContainer = document.getElementById('tile-container');
        const scoreElement = document.getElementById('current-score');
        
        const modalOverlay = document.getElementById('game-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const btnKeepPlaying = document.getElementById('btn-keep-playing');
        const targetSelector = document.getElementById('target-selector');
        const boardWrapper = document.querySelector('.g-board-wrapper');

        let board = Array(4).fill().map(() => Array(4).fill(null));
        let score = 0;
        let tileIdCounter = 0;
        let isGameActive = true;
        let hasWon = false;
        let currentTarget = parseInt(targetSelector.value);

        const POS_BASE = 2.0;
        const POS_STEP = 24.5;
        const getPos = (idx) => `${POS_BASE + idx * POS_STEP}%`;

        function initGrid() {
            bgContainer.innerHTML = '';
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.style.top = getPos(r);
                    cell.style.left = getPos(c);
                    bgContainer.appendChild(cell);
                }
            }
        }

        function renderTiles() {
            document.querySelectorAll('.tile').forEach(el => {
                const id = parseInt(el.id.split('-')[1]);
                const exists = board.flat().find(t => t && t.id === id);
                if (!exists && !el.classList.contains('merging-out')) {
                    el.classList.add('merging-out');
                    setTimeout(() => el.remove(), 150);
                }
            });

            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const tile = board[r][c];
                    if (tile) {
                        let el = document.getElementById(`tile-${tile.id}`);
                        if (!el) {
                            el = document.createElement('div');
                            el.id = `tile-${tile.id}`;
                            el.className = `tile val-${tile.val}`;
                            el.textContent = tile.val;
                            el.style.top = getPos(tile.prevR !== undefined ? tile.prevR : r);
                            el.style.left = getPos(tile.prevC !== undefined ? tile.prevC : c);
                            el.style.transform = 'scale(0)';
                            tileContainer.appendChild(el);
                            
                            el.getBoundingClientRect();
                            el.style.transform = 'scale(1)';
                        }

                        el.style.top = getPos(r);
                        el.style.left = getPos(c);
                        
                        if (tile.isMerged) {
                            setTimeout(() => {
                                el.className = `tile val-${tile.val}`;
                                el.textContent = tile.val;
                                el.style.transform = 'scale(1.1)';
                                setTimeout(() => { el.style.transform = 'scale(1)'; }, 100);
                            }, 100);
                            tile.isMerged = false;
                        }
                        
                        tile.prevR = r;
                        tile.prevC = c;
                    }
                }
            }
            scoreElement.textContent = score;
        }

        function generateNewNumber() {
            const emptyCells = [];
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (!board[r][c]) emptyCells.push({ r, c });
                }
            }
            if (emptyCells.length > 0) {
                const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                board[r][c] = {
                    id: ++tileIdCounter,
                    val: Math.random() < 0.9 ? 2 : 4,
                    isMerged: false,
                    prevR: r,
                    prevC: c
                };
            }
        }

        function executeMove(direction) {
            if (!isGameActive) return;

            let hasMoved = false;
            let mergedThisTurn = false;

            for (let i = 0; i < 4; i++) {
                let line = [];
                for (let j = 0; j < 4; j++) {
                    let r = direction === 'UP' || direction === 'DOWN' ? j : i;
                    let c = direction === 'UP' || direction === 'DOWN' ? i : j;
                    if (board[r][c]) line.push(board[r][c]);
                }

                if (direction === 'RIGHT' || direction === 'DOWN') line.reverse();

                let mergedLine = [];
                let k = 0;
                while (k < line.length) {
                    if (k + 1 < line.length && line[k].val === line[k + 1].val) {
                        line[k].val *= 2;
                        line[k].isMerged = true;
                        score += line[k].val;
                        mergedLine.push(line[k]);
                        
                        // 修正：精确计算销毁残影的最终归属坐标
                        let targetEl = document.getElementById(`tile-${line[k+1].id}`);
                        if(targetEl) {
                            targetEl.dataset.targetR = (direction === 'UP' || direction === 'DOWN') ? 
                                (direction === 'UP' ? mergedLine.length - 1 : 4 - mergedLine.length) : i;
                            targetEl.dataset.targetC = (direction === 'LEFT' || direction === 'RIGHT') ? 
                                (direction === 'LEFT' ? mergedLine.length - 1 : 4 - mergedLine.length) : i;
                        }

                        if(line[k].val === currentTarget && !hasWon) mergedThisTurn = true;
                        
                        k += 2;
                        hasMoved = true;
                    } else {
                        mergedLine.push(line[k]);
                        k++;
                    }
                }

                while (mergedLine.length < 4) mergedLine.push(null);
                if (direction === 'RIGHT' || direction === 'DOWN') mergedLine.reverse();

                for (let j = 0; j < 4; j++) {
                    let r = direction === 'UP' || direction === 'DOWN' ? j : i;
                    let c = direction === 'UP' || direction === 'DOWN' ? i : j;
                    
                    if (board[r][c] !== mergedLine[j]) hasMoved = true;
                    board[r][c] = mergedLine[j];
                    
                    if(board[r][c]) {
                        board[r][c].prevR = board[r][c].prevR !== undefined ? board[r][c].prevR : r;
                        board[r][c].prevC = board[r][c].prevC !== undefined ? board[r][c].prevC : c;
                    }
                }
            }

            document.querySelectorAll('.tile').forEach(el => {
                if(el.dataset.targetR !== undefined) {
                    el.style.top = getPos(parseInt(el.dataset.targetR));
                    el.style.left = getPos(parseInt(el.dataset.targetC));
                    delete el.dataset.targetR;
                }
            });

            if (hasMoved) {
                generateNewNumber();
                renderTiles();
                checkGameState(mergedThisTurn);
            }
        }

        function checkGameState(mergedThisTurn) {
            if (mergedThisTurn && !hasWon) {
                isGameActive = false;
                hasWon = true;
                showModal('挑战成功!', `恭喜！您已合成 ${currentTarget} 方块。`, true);
                return;
            }

            let canMove = false;
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (!board[r][c]) canMove = true;
                    if (c !== 3 && board[r][c] && board[r][c + 1] && board[r][c].val === board[r][c + 1].val) canMove = true;
                    if (r !== 3 && board[r][c] && board[r + 1][c] && board[r][c].val === board[r + 1][c].val) canMove = true;
                }
            }
            if (!canMove) {
                isGameActive = false;
                showModal('游戏结束', '棋盘已满，已无有效移动步骤。', false);
            }
        }

        function showModal(title, desc, isVictory) {
            modalTitle.textContent = title;
            modalDesc.textContent = desc;
            modalTitle.style.color = isVictory ? 'var(--g-primary)' : 'var(--g-text-main)';
            btnKeepPlaying.style.display = isVictory ? 'inline-block' : 'none';
            modalOverlay.style.display = 'flex';
        }

        document.getElementById('btn-restart').onclick = startGame;
        document.getElementById('btn-try-again').onclick = startGame;
        btnKeepPlaying.onclick = () => {
            modalOverlay.style.display = 'none';
            isGameActive = true;
        };

        targetSelector.addEventListener('change', (e) => {
            currentTarget = parseInt(e.target.value);
            startGame();
        });

        const handleKeydown = (e) => {
            if (!isGameActive) return;
            switch(e.key) {
                case 'ArrowUp': executeMove('UP'); break;
                case 'ArrowDown': executeMove('DOWN'); break;
                case 'ArrowLeft': executeMove('LEFT'); break;
                case 'ArrowRight': executeMove('RIGHT'); break;
                default: return;
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        };

        let touchStartX = 0, touchStartY = 0;
        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchEnd = (e) => {
            if (!isGameActive) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) executeMove('RIGHT'); else executeMove('LEFT');
            } else {
                if (dy > 0) executeMove('DOWN'); else executeMove('UP');
            }
        };

        const destroyGame = () => {
            document.removeEventListener('keydown', document._game1024Keydown);
            if (boardWrapper) {
                boardWrapper.removeEventListener('touchstart', boardWrapper._game1024TouchStart);
                boardWrapper.removeEventListener('touchend', boardWrapper._game1024TouchEnd);
            }
            document.removeEventListener('pjax:send', destroyGame);
        };
        
        if (document._game1024Keydown) destroyGame();
        
        document._game1024Keydown = handleKeydown;
        boardWrapper._game1024TouchStart = handleTouchStart;
        boardWrapper._game1024TouchEnd = handleTouchEnd;
        
        document.addEventListener('keydown', document._game1024Keydown);
        boardWrapper.addEventListener('touchstart', boardWrapper._game1024TouchStart, {passive: true});
        boardWrapper.addEventListener('touchend', boardWrapper._game1024TouchEnd);
        document.addEventListener('pjax:send', destroyGame);

        function startGame() {
            board = Array(4).fill().map(() => Array(4).fill(null));
            score = 0;
            tileIdCounter = 0;
            isGameActive = true;
            hasWon = false;
            
            tileContainer.innerHTML = '';
            modalOverlay.style.display = 'none';
            
            initGrid();
            generateNewNumber();
            generateNewNumber();
            renderTiles();
        }

        startGame();
    }

    document.addEventListener('DOMContentLoaded', init1024Game);
    document.addEventListener('pjax:complete', init1024Game);
    if (document.readyState === 'interactive' || document.readyState === 'complete') init1024Game();
})();