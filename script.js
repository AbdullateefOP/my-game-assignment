/* This game has been implemented from scratch */

document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    const restartBtn = document.getElementById('reset-btn');
    const clearStatsBtn = document.getElementById('clear-stats-btn');
    const gridSizeSelect = document.getElementById('grid-size');
    const mosaicToggleBtn = document.getElementById('mosaic-toggle-btn');
    const muteBtn = document.getElementById('mute-btn');

    const startBtn = document.getElementById('start-btn');
    const changePlayersBtn = document.getElementById('change-players-btn');
    const nameXInput = document.getElementById('name-x');
    const nameOInput = document.getElementById('name-o');
    const labelXEl = document.getElementById('label-x');
    const labelOEl = document.getElementById('label-o');
    const cardXEl = document.getElementById('card-x');
    const cardOEl = document.getElementById('card-o');

    const tensionEl = document.getElementById('tension');
    const tensionTextEl = document.getElementById('tension-text');

    const scoreXEl = document.getElementById('score-x');
    const scoreOEl = document.getElementById('score-o');
    const scoreDrawEl = document.getElementById('score-draw');

    // Audio is optional — fall back to a no-op stub if audio.js didn't load
    // (e.g. in the headless test environment, which has no AudioContext).
    const audio = window.GameAudio || {
        init() {}, setMuted() {}, move() {}, updateTension() {}, win() {}, draw() {}, stopMusic() {}
    };

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
    let started = false; // true once the player clicks Start (audio unlocked)

    let playerNames = { X: 'Player X', O: 'Player O' };

    // Load persisted state. Guard every parse so corrupt storage can't blank the game.
    let stats = loadStats();
    let mosaicOn = loadBool('tictactoe_mosaic', true);
    let muted = loadBool('tictactoe_muted', false);
    loadNames();

    const savedGrid = localStorage.getItem('tictactoe_gridsize');
    if (savedGrid === '3' || savedGrid === '4') {
        gridSizeSelect.value = savedGrid;
    }

    updateScoreboard();
    updateLabels();
    updateMuteButton();

    // ---------- persistence helpers ----------
    function loadStats() {
        const fallback = { x: 0, o: 0, draw: 0 };
        try {
            const saved = JSON.parse(localStorage.getItem('tictactoe_stats'));
            if (saved && typeof saved === 'object') {
                return { x: saved.x || 0, o: saved.o || 0, draw: saved.draw || 0 };
            }
        } catch (e) { /* fall back to a clean scoreboard rather than crashing */ }
        return fallback;
    }

    function loadBool(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            if (typeof v === 'boolean') return v;
        } catch (e) { /* ignore corrupt value */ }
        return fallback;
    }

    function loadNames() {
        try {
            const saved = JSON.parse(localStorage.getItem('tictactoe_names'));
            if (saved && saved.X && saved.O) {
                playerNames = { X: String(saved.X), O: String(saved.O) };
                // Pre-fill the inputs (blank when it's just the default label).
                if (playerNames.X !== 'Player X') nameXInput.value = playerNames.X;
                if (playerNames.O !== 'Player O') nameOInput.value = playerNames.O;
            }
        } catch (e) { /* ignore corrupt value */ }
    }

    // ---------- board geometry ----------
    // Every row, column and both diagonals as arrays of cell indices.
    function getLines() {
        const lines = [];
        for (let r = 0; r < gridSize; r++) {
            const line = [];
            for (let c = 0; c < gridSize; c++) line.push(r * gridSize + c);
            lines.push(line);
        }
        for (let c = 0; c < gridSize; c++) {
            const line = [];
            for (let r = 0; r < gridSize; r++) line.push(r * gridSize + c);
            lines.push(line);
        }
        const diag1 = [], diag2 = [];
        for (let i = 0; i < gridSize; i++) {
            diag1.push(i * gridSize + i);
            diag2.push(i * gridSize + (gridSize - 1 - i));
        }
        lines.push(diag1, diag2);
        return lines;
    }

    // ---------- game flow ----------
    function initGame() {
        gridSize = parseInt(gridSizeSelect.value, 10);
        board = Array(gridSize * gridSize).fill('');
        currentPlayer = 'X';
        isGameActive = true;
        statusElement.textContent = `${playerNames[currentPlayer]}'s move`;

        boardElement.className = `board grid-${gridSize}`;
        boardElement.innerHTML = '';

        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.setAttribute('aria-label', `Cell ${i + 1}, empty`);
            boardElement.appendChild(cell);
        }

        applyMosaic();
        updateActiveCard();
        updateTension();
    }

    function handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const index = Number(cell.dataset.index);
        if (board[index] !== '' || !isGameActive) return;

        board[index] = currentPlayer;
        cell.textContent = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase());
        cell.setAttribute('aria-label', `Cell ${index + 1}, ${currentPlayer}`);
        cell.disabled = true;
        audio.move(currentPlayer);

        const winningLine = getWinningLine();
        if (winningLine) {
            statusElement.textContent = `${playerNames[currentPlayer]} wins! 🎉`;
            isGameActive = false;
            highlightLine(winningLine);
            clearTensionVisual();
            updateActiveCard();
            audio.win();
            stats[currentPlayer.toLowerCase()]++;
            saveStats();
            return;
        }

        if (board.every(value => value !== '')) {
            statusElement.textContent = `It's a draw! 🤝`;
            isGameActive = false;
            clearTensionVisual();
            updateActiveCard();
            audio.draw();
            stats.draw++;
            saveStats();
            return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusElement.textContent = `${playerNames[currentPlayer]}'s move`;
        updateActiveCard();
        updateTension();
    }

    // Returns the array of winning cell indices, or null if there is no win yet.
    function getWinningLine() {
        for (const line of getLines()) {
            const first = board[line[0]];
            if (first && line.every(i => board[i] === first)) return line;
        }
        return null;
    }

    // Lines that are one move from a win: all-but-one filled by a single player,
    // with exactly one empty square. Returns [{ index, player }].
    function getThreats() {
        const threats = [];
        for (const line of getLines()) {
            let empty = -1, counts = { X: 0, O: 0 };
            for (const i of line) {
                if (board[i] === '') empty = i;
                else counts[board[i]]++;
            }
            const emptiesInLine = line.filter(i => board[i] === '').length;
            if (emptiesInLine !== 1) continue;
            if (counts.X === gridSize - 1) threats.push({ index: empty, player: 'X' });
            else if (counts.O === gridSize - 1) threats.push({ index: empty, player: 'O' });
        }
        return threats;
    }

    function highlightLine(indices) {
        indices.forEach(i => {
            const cell = boardElement.children[i];
            if (cell) cell.classList.add('win');
        });
    }

    function clearTensionVisual() {
        boardElement.querySelectorAll('.cell.threat').forEach(c => c.classList.remove('threat'));
        tensionEl.hidden = true;
    }

    // Visual + audible tension based on the current threats on the board.
    function updateTension() {
        clearTensionVisual();

        if (!isGameActive) {
            if (started) audio.updateTension({ threatCount: 0, fillRatio: 1, active: false });
            return;
        }

        // Note: we deliberately do NOT highlight the specific winning square —
        // that would reveal the exact move and make the game unfair. Only the
        // music and the (location-free) pill signal that danger is near.
        const threats = getThreats();
        const players = new Set(threats.map(t => t.player));
        if (threats.length > 0) {
            tensionTextEl.textContent = players.size === 2
                ? 'Both players are one move from winning!'
                : `${playerNames[[...players][0]]} is one move from winning`;
            tensionEl.hidden = false;
        }

        if (started) {
            const filled = board.filter(v => v !== '').length;
            audio.updateTension({
                threatCount: threats.length,
                fillRatio: filled / board.length,
                active: true
            });
        }
    }

    function updateActiveCard() {
        cardXEl.classList.toggle('active', isGameActive && currentPlayer === 'X');
        cardOEl.classList.toggle('active', isGameActive && currentPlayer === 'O');
    }

    // Toggle the colourful mosaic tinting on/off and remember the choice.
    function applyMosaic() {
        document.body.classList.toggle('mosaic-mode', mosaicOn);
        mosaicToggleBtn.textContent = `Mosaic: ${mosaicOn ? 'On' : 'Off'}`;
        mosaicToggleBtn.setAttribute('aria-pressed', String(mosaicOn));

        boardElement.querySelectorAll('.cell').forEach((cell, i) => {
            if (mosaicOn) {
                cell.style.setProperty('--cell-bg', mosaicPalette[(i + gridSize) % mosaicPalette.length]);
            } else {
                cell.style.removeProperty('--cell-bg');
            }
        });
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

    function updateLabels() {
        labelXEl.textContent = `${playerNames.X} (X)`;
        labelOEl.textContent = `${playerNames.O} (O)`;
    }

    function updateMuteButton() {
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.setAttribute('aria-pressed', String(muted));
        muteBtn.title = muted ? 'Unmute sound' : 'Mute sound';
    }

    // ---------- listeners ----------
    boardElement.addEventListener('click', handleCellClick);

    startBtn.addEventListener('click', () => {
        playerNames.X = (nameXInput.value.trim() || 'Player X').slice(0, 12);
        playerNames.O = (nameOInput.value.trim() || 'Player O').slice(0, 12);
        localStorage.setItem('tictactoe_names', JSON.stringify(playerNames));
        updateLabels();

        // A fresh Start begins a brand-new match: zero the scoreboard so it
        // never shows the previous session's wins/draws. (The in-game Restart
        // button keeps the running score for new rounds within this match.)
        stats = { x: 0, o: 0, draw: 0 };
        localStorage.removeItem('tictactoe_stats');
        updateScoreboard();

        document.body.classList.add('playing');
        started = true;
        audio.init();
        audio.setMuted(muted);
        initGame();
    });

    gridSizeSelect.addEventListener('change', () => {
        localStorage.setItem('tictactoe_gridsize', gridSizeSelect.value);
        initGame();
    });

    restartBtn.addEventListener('click', initGame);

    // End the current match and go back to the name screen to swap players.
    changePlayersBtn.addEventListener('click', () => {
        audio.stopMusic();
        started = false;
        document.body.classList.remove('playing');
        // Pre-fill the current names so they're easy to edit (blank if default).
        nameXInput.value = playerNames.X === 'Player X' ? '' : playerNames.X;
        nameOInput.value = playerNames.O === 'Player O' ? '' : playerNames.O;
        nameXInput.focus();
    });

    mosaicToggleBtn.addEventListener('click', () => {
        mosaicOn = !mosaicOn;
        localStorage.setItem('tictactoe_mosaic', JSON.stringify(mosaicOn));
        applyMosaic();
    });

    muteBtn.addEventListener('click', () => {
        muted = !muted;
        localStorage.setItem('tictactoe_muted', JSON.stringify(muted));
        audio.setMuted(muted);
        updateMuteButton();
    });

    clearStatsBtn.addEventListener('click', () => {
        stats = { x: 0, o: 0, draw: 0 };
        localStorage.removeItem('tictactoe_stats');
        updateScoreboard();
    });

    // Build the board up front (hidden until Start) so geometry is ready.
    initGame();
});
