/* This game has been implemented from scratch */

document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    const restartBtn = document.getElementById('reset-btn');
    const clearStatsBtn = document.getElementById('clear-stats-btn');
    const gridSizeSelect = document.getElementById('grid-size');

    const scoreXEl = document.getElementById('score-x');
    const scoreOEl = document.getElementById('score-o');
    const scoreDrawEl = document.getElementById('score-draw');

    const mosaicPalette = [
        'rgba(56, 189, 248, 0.16)',
        'rgba(244, 63, 94, 0.16)',
        'rgba(250, 204, 21, 0.16)',
        'rgba(52, 211, 153, 0.16)',
        'rgba(168, 85, 247, 0.16)'
    ];

    let gridSize = 3;
    let board = [];
    let currentPlayer = 'X';
    let isGameActive = true;

    // Load stats from localStorage (Persistent data enhancement)
    let stats = JSON.parse(localStorage.getItem('tictactoe_stats')) || { x: 0, o: 0, draw: 0 };
    updateScoreboard();

    function initGame() {
        gridSize = parseInt(gridSizeSelect.value, 10);
        board = Array(gridSize * gridSize).fill('');
        currentPlayer = 'X';
        isGameActive = true;
        statusElement.textContent = `Player ${currentPlayer}'s Turn`;

        boardElement.className = `board grid-${gridSize}`;
        boardElement.innerHTML = '';

        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.style.backgroundColor = mosaicPalette[(i + gridSize) % mosaicPalette.length];
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }

    function handleCellClick(e) {
        const index = Number(e.target.dataset.index);

        if (board[index] !== '' || !isGameActive) return;

        board[index] = currentPlayer;
        e.target.textContent = currentPlayer;
        e.target.classList.add(currentPlayer.toLowerCase());

        if (checkWin()) {
            statusElement.textContent = `Player ${currentPlayer} Wins! 🎉`;
            isGameActive = false;
            stats[currentPlayer.toLowerCase()]++;
            saveStats();
            return;
        }

        if (board.every(cell => cell !== '')) {
            statusElement.textContent = `It's a Draw! 🤝`;
            isGameActive = false;
            stats.draw++;
            saveStats();
            return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusElement.textContent = `Player ${currentPlayer}'s Turn`;
    }

    function checkWin() {
        // Check rows
        for (let r = 0; r < gridSize; r++) {
            const firstVal = board[r * gridSize];
            if (!firstVal) continue;
            let rowWin = true;
            for (let c = 1; c < gridSize; c++) {
                if (board[r * gridSize + c] !== firstVal) {
                    rowWin = false;
                    break;
                }
            }
            if (rowWin) return true;
        }

        // Check columns
        for (let c = 0; c < gridSize; c++) {
            const firstVal = board[c];
            if (!firstVal) continue;
            let colWin = true;
            for (let r = 1; r < gridSize; r++) {
                if (board[r * gridSize + c] !== firstVal) {
                    colWin = false;
                    break;
                }
            }
            if (colWin) return true;
        }

        // Check diagonal (top-left to bottom-right)
        const diag1Val = board[0];
        if (diag1Val) {
            let diag1Win = true;
            for (let i = 1; i < gridSize; i++) {
                if (board[i * gridSize + i] !== diag1Val) {
                    diag1Win = false;
                    break;
                }
            }
            if (diag1Win) return true;
        }

        // Check diagonal (top-right to bottom-left)
        const diag2Val = board[gridSize - 1];
        if (diag2Val) {
            let diag2Win = true;
            for (let i = 1; i < gridSize; i++) {
                if (board[i * gridSize + (gridSize - 1 - i)] !== diag2Val) {
                    diag2Win = false;
                    break;
                }
            }
            if (diag2Win) return true;
        }

        return false;
    }

    function saveStats() {
        localStorage.setItem('tictactoe_stats', JSON.stringify(stats));
        updateScoreboard();
    }

    function updateScoreboard() {
        scoreXEl.textContent = stats.x;
        scoreOEl.textContent = stats.o;
        scoreDrawEl.textContent = stats.draw;
    }

    gridSizeSelect.addEventListener('change', initGame);
    restartBtn.addEventListener('click', initGame);

    clearStatsBtn.addEventListener('click', () => {
        stats = { x: 0, o: 0, draw: 0 };
        localStorage.removeItem('tictactoe_stats');
        updateScoreboard();
    });

    initGame();
});