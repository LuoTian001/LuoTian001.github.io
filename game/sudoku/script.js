(function() {
    function initSudokuGame() {
        const rootEl = document.getElementById('sudoku-root');
        if (!rootEl) return;

        const boardEl = document.getElementById('sudoku-board');
        const numpadEl = document.getElementById('numpad');
        const diffSelector = document.getElementById('diff-selector');
        const btnNewGame = document.getElementById('btn-new-game');
        
        const modalOverlay = document.getElementById('game-modal');
        const btnPlayAgain = document.getElementById('btn-play-again');

        const N = 9;
        let solutionBoard = [];
        let gameBoard = [];
        let selectedR = -1;
        let selectedC = -1;
        let isGameOver = false;

        // ==========================================
        // 核心算法：数独生成器 (回溯法)
        // ==========================================
        class SudokuGenerator {
            constructor(k) {
                this.K = k; // 需要挖空的数量
                this.mat = Array.from({length: N}, () => Array(N).fill(0));
            }

            fillValues() {
                this.fillDiagonal();
                this.fillRemaining(0, 3);
                const full = this.mat.map(row => [...row]);
                this.removeKDigits();
                return { puzzle: this.mat, solution: full };
            }

            fillDiagonal() {
                for (let i = 0; i < N; i += 3) this.fillBox(i, i);
            }

            unUsedInBox(rowStart, colStart, num) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        if (this.mat[rowStart + i][colStart + j] === num) return false;
                    }
                }
                return true;
            }

            fillBox(rowStart, colStart) {
                let num;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        do {
                            num = Math.floor(Math.random() * N) + 1;
                        } while (!this.unUsedInBox(rowStart, colStart, num));
                        this.mat[rowStart + i][colStart + j] = num;
                    }
                }
            }

            checkIfSafe(i, j, num) {
                return (this.unUsedInRow(i, num) &&
                        this.unUsedInCol(j, num) &&
                        this.unUsedInBox(i - i % 3, j - j % 3, num));
            }

            unUsedInRow(i, num) {
                for (let j = 0; j < N; j++) if (this.mat[i][j] === num) return false;
                return true;
            }

            unUsedInCol(j, num) {
                for (let i = 0; i < N; i++) if (this.mat[i][j] === num) return false;
                return true;
            }

            fillRemaining(i, j) {
                if (j >= N && i < N - 1) {
                    i++; j = 0;
                }
                if (i >= N && j >= N) return true;
                if (i < 3) {
                    if (j < 3) j = 3;
                } else if (i < 6) {
                    if (j === Math.floor(i / 3) * 3) j += 3;
                } else {
                    if (j === 6) {
                        i++; j = 0;
                        if (i >= N) return true;
                    }
                }

                for (let num = 1; num <= N; num++) {
                    if (this.checkIfSafe(i, j, num)) {
                        this.mat[i][j] = num;
                        if (this.fillRemaining(i, j + 1)) return true;
                        this.mat[i][j] = 0;
                    }
                }
                return false;
            }

            removeKDigits() {
                let count = this.K;
                while (count !== 0) {
                    let cellId = Math.floor(Math.random() * (N * N));
                    let i = Math.floor(cellId / N);
                    let j = cellId % N;
                    if (this.mat[i][j] !== 0) {
                        count--;
                        this.mat[i][j] = 0;
                    }
                }
            }
        }

        // ==========================================
        // 渲染管线与状态控制
        // ==========================================
        function startNewGame() {
            isGameOver = false;
            selectedR = -1;
            selectedC = -1;
            modalOverlay.style.display = 'none';

            const k = parseInt(diffSelector.value);
            const generator = new SudokuGenerator(k);
            const data = generator.fillValues();
            
            solutionBoard = data.solution;
            // 构建带状态的游戏矩阵 (val: 当前值, isFixed: 是否为预设数字)
            gameBoard = data.puzzle.map(row => 
                row.map(val => ({ val: val, isFixed: val !== 0 }))
            );

            renderBoard();
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const cellData = gameBoard[r][c];
                    const cell = document.createElement('div');
                    cell.className = 's-cell';
                    cell.dataset.r = r;
                    cell.dataset.c = c;
                    
                    if (cellData.val !== 0) cell.textContent = cellData.val;
                    if (cellData.isFixed) cell.classList.add('s-fixed');
                    
                    cell.onclick = () => selectCell(r, c);
                    boardEl.appendChild(cell);
                }
            }
            updateHighlights();
        }

        function selectCell(r, c) {
            if (isGameOver) return;
            selectedR = r;
            selectedC = c;
            updateHighlights();
        }

        function updateHighlights() {
            const cells = document.querySelectorAll('.s-cell');
            cells.forEach(cell => {
                cell.className = 's-cell'; // Reset classes
                const r = parseInt(cell.dataset.r);
                const c = parseInt(cell.dataset.c);
                const cellData = gameBoard[r][c];

                if (cellData.isFixed) cell.classList.add('s-fixed');

                if (selectedR === -1 || selectedC === -1) return;

                const selectedVal = gameBoard[selectedR][selectedC].val;
                
                // 冲突校验逻辑
                if (cellData.val !== 0 && !cellData.isFixed) {
                    if (!isValidPlacement(r, c, cellData.val)) {
                        cell.classList.add('s-error');
                    }
                }

                // 高亮逻辑
                if (r === selectedR && c === selectedC) {
                    cell.classList.add('s-selected');
                } else if (r === selectedR || c === selectedC || 
                          (Math.floor(r/3) === Math.floor(selectedR/3) && Math.floor(c/3) === Math.floor(selectedC/3))) {
                    cell.classList.add('s-related');
                } else if (cellData.val !== 0 && cellData.val === selectedVal) {
                    cell.classList.add('s-same-val');
                }
            });
        }

        function isValidPlacement(r, c, val) {
            // 校验行、列、宫格内是否出现重复 (忽略自身)
            for (let i = 0; i < N; i++) {
                if (i !== c && gameBoard[r][i].val === val) return false;
                if (i !== r && gameBoard[i][c].val === val) return false;
            }
            const boxR = Math.floor(r / 3) * 3;
            const boxC = Math.floor(c / 3) * 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const checkR = boxR + i;
                    const checkC = boxC + j;
                    if ((checkR !== r || checkC !== c) && gameBoard[checkR][checkC].val === val) return false;
                }
            }
            return true;
        }

        function inputNumber(num) {
            if (isGameOver || selectedR === -1 || selectedC === -1) return;
            const target = gameBoard[selectedR][selectedC];
            if (target.isFixed) return;

            target.val = num; // num=0 means clear
            
            // 局部增量渲染以提高性能
            const cell = document.querySelector(`.s-cell[data-r="${selectedR}"][data-c="${selectedC}"]`);
            cell.textContent = num === 0 ? '' : num;
            
            updateHighlights();
            checkVictory();
        }

        function checkVictory() {
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const val = gameBoard[r][c].val;
                    if (val === 0 || !isValidPlacement(r, c, val)) return;
                }
            }
            isGameOver = true;
            modalOverlay.style.display = 'flex';
        }

        function resetBoard() {
            if (isGameOver) return;
            // 遍历矩阵，将非固定的用户输入值全部归零
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    if (!gameBoard[r][c].isFixed) {
                        gameBoard[r][c].val = 0;
                        // 同步清理 DOM 文本
                        const cell = document.querySelector(`.s-cell[data-r="${r}"][data-c="${c}"]`);
                        if (cell) cell.textContent = '';
                    }
                }
            }
            // 清除选中坐标并刷新高亮状态
            selectedR = -1;
            selectedC = -1;
            updateHighlights();
        }



        // ==========================================
        // 事件绑定与生命周期管控
        // ==========================================
        btnNewGame.onclick = startNewGame;
        btnPlayAgain.onclick = startNewGame;
        diffSelector.onchange = startNewGame;

        // 键盘事件
        const handleKeydown = (e) => {
            if (isGameOver) return;
            const key = e.key;
            if (/^[1-9]$/.test(key)) {
                inputNumber(parseInt(key));
            } else if (key === 'Backspace' || key === 'Delete') {
                inputNumber(0);
            } else if (key.startsWith('Arrow') && selectedR !== -1) {
                e.preventDefault();
                if (key === 'ArrowUp' && selectedR > 0) selectCell(selectedR - 1, selectedC);
                if (key === 'ArrowDown' && selectedR < 8) selectCell(selectedR + 1, selectedC);
                if (key === 'ArrowLeft' && selectedC > 0) selectCell(selectedR, selectedC - 1);
                if (key === 'ArrowRight' && selectedC < 8) selectCell(selectedR, selectedC + 1);
            }
        };

        // 虚拟键盘点击事件 (事件代理)
        const handleNumpadClick = (e) => {
            const btn = e.target.closest('.s-num-key');
            if (!btn) return;
            const val = btn.dataset.val;

            if (val === 'reset') {
                resetBoard();
            } else if (val === 'clear') {
                inputNumber(0);
            } else {
                inputNumber(parseInt(val));
            }
        };

        const destroyGame = () => {
            document.removeEventListener('keydown', document._sudokuKeydown);
            if (numpadEl) numpadEl.removeEventListener('click', numpadEl._sudokuClick);
            document.removeEventListener('pjax:send', destroyGame);
        };
        
        if (document._sudokuKeydown) destroyGame();

        document._sudokuKeydown = handleKeydown;
        if (numpadEl) {
            numpadEl._sudokuClick = handleNumpadClick;
            numpadEl.addEventListener('click', numpadEl._sudokuClick);
        }
        
        document.addEventListener('keydown', document._sudokuKeydown);
        document.addEventListener('pjax:send', destroyGame);

        startNewGame();
    }

    document.addEventListener('DOMContentLoaded', initSudokuGame);
    document.addEventListener('pjax:complete', initSudokuGame);
    if (document.readyState === 'interactive' || document.readyState === 'complete') initSudokuGame();
})();