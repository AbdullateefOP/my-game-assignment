const App = {
    matchWins: { X: 0, O: 0 },
    aiThinking: false,
    gameStarted: false,
    finished: false,
    nextGameTimer: null,

    // Added-feature state
    mosaicOn: true,
    muted: false,
    audioStarted: false,
    mosaicPalette: [
        "rgba(88, 166, 255, 0.16)",
        "rgba(167, 139, 250, 0.16)",
        "rgba(57, 220, 165, 0.16)",
        "rgba(250, 204, 21, 0.14)",
        "rgba(244, 63, 94, 0.14)"
    ],

    init() {
        this.loadPrefs();
        this.bindEvents();
        this.updateSettings();
        this.applyMosaic();
        this.updateMuteButton();
        Scoreboard.render();
        this.newGame();
    },

    // ---------- preferences ----------
    loadPrefs() {
        this.mosaicOn = this.loadBool("uxo_mosaic", true);
        this.muted = this.loadBool("uxo_muted", false);
        try {
            const names = JSON.parse(localStorage.getItem("uxo_names"));
            if (names) {
                if (names.X) document.getElementById("nameX").value = names.X;
                if (names.O) document.getElementById("nameO").value = names.O;
            }
        } catch (e) { /* ignore corrupt value */ }
    },

    loadBool(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            if (typeof v === "boolean") return v;
        } catch (e) { /* ignore */ }
        return fallback;
    },

    ensureAudio() {
        if (this.audioStarted) return;
        this.audioStarted = true;
        GameAudio.init();
        GameAudio.setMuted(this.muted);
    },

    // ---------- names ----------
    playerName(symbol) {
        const mode = document.getElementById("gameMode").value;
        if (symbol === "O" && mode === "ai") return "Computer";
        const el = document.getElementById(symbol === "X" ? "nameX" : "nameO");
        const value = el.value.trim();
        return value || (symbol === "X" ? "Player X" : "Player O");
    },

    saveNames() {
        localStorage.setItem("uxo_names", JSON.stringify({
            X: document.getElementById("nameX").value.trim(),
            O: document.getElementById("nameO").value.trim()
        }));
    },

    updateLabels() {
        document.getElementById("playerOneLabel").textContent = this.playerName("X");
        document.getElementById("playerTwoLabel").textContent = this.playerName("O");
    },

    // ---------- events ----------
    bindEvents() {
        document.getElementById("startBtn")
            .addEventListener("click", () => this.startGame());

        document.getElementById("changePlayers")
            .addEventListener("click", () => this.changePlayers());

        document.getElementById("newGame")
            .addEventListener("click", () => { this.ensureAudio(); this.newGame(); });

        document.getElementById("resetMatch")
            .addEventListener("click", () => { this.ensureAudio(); this.resetMatch(); });

        document.getElementById("resetScores")
            .addEventListener("click", () => this.resetScores());

        // Game mode is chosen on the start screen; just update which fields show.
        document.getElementById("gameMode")
            .addEventListener("change", () => this.updateSettings());

        document.getElementById("boardSize")
            .addEventListener("change", () => {
                this.matchWins = { X: 0, O: 0 };
                this.newGame();
            });

        document.getElementById("difficulty")
            .addEventListener("change", () => this.newGame());

        document.getElementById("matchMode")
            .addEventListener("change", () => this.resetMatch());

        ["nameX", "nameO"].forEach(id => {
            document.getElementById(id).addEventListener("input", () => {
                this.saveNames();
                this.updateLabels();
                this.refreshStatus();
            });
        });

        document.getElementById("mosaicToggle")
            .addEventListener("click", () => {
                this.ensureAudio();
                this.mosaicOn = !this.mosaicOn;
                localStorage.setItem("uxo_mosaic", JSON.stringify(this.mosaicOn));
                this.applyMosaic();
                this.renderBoard();
            });

        document.getElementById("muteToggle")
            .addEventListener("click", () => {
                this.ensureAudio();
                this.muted = !this.muted;
                localStorage.setItem("uxo_muted", JSON.stringify(this.muted));
                GameAudio.setMuted(this.muted);
                this.updateMuteButton();
            });
    },

    // Collect names on the start screen, then reveal the game.
    startGame() {
        this.ensureAudio();
        this.saveNames();
        this.updateSettings();
        document.getElementById("startScreen").hidden = true;
        this.matchWins = { X: 0, O: 0 };
        this.newGame();
    },

    // Return to the start screen to change the players (ends the current match).
    changePlayers() {
        GameAudio.stopMusic();
        document.getElementById("startScreen").hidden = false;
        document.getElementById("nameX").focus();
    },

    updateSettings() {
        const mode = document.getElementById("gameMode").value;

        document.getElementById("difficultySetting").style.display =
            mode === "ai" ? "block" : "none";

        // In AI mode Player O is the computer — hide the O name field.
        document.getElementById("nameOSetting").style.display =
            mode === "ai" ? "none" : "block";

        this.updateLabels();
    },

    applyMosaic() {
        document.body.classList.toggle("mosaic", this.mosaicOn);
        const btn = document.getElementById("mosaicToggle");
        btn.textContent = `Mosaic: ${this.mosaicOn ? "On" : "Off"}`;
        btn.setAttribute("aria-pressed", String(this.mosaicOn));
    },

    updateMuteButton() {
        const btn = document.getElementById("muteToggle");
        btn.textContent = this.muted ? "🔇" : "🔊";
        btn.setAttribute("aria-pressed", String(this.muted));
        btn.title = this.muted ? "Unmute sound" : "Mute sound";
    },

    refreshStatus() {
        if (this.finished || Game.gameOver || !Game.board.length || this.aiThinking) return;
        document.getElementById("gameStatus").textContent =
            `${this.playerName(Game.currentPlayer)}'s turn`;
    },

    // ---------- game flow ----------
    newGame() {
        if (this.nextGameTimer) {
            clearTimeout(this.nextGameTimer);
            this.nextGameTimer = null;
        }

        const size = Number(document.getElementById("boardSize").value);
        Game.start(size);

        this.aiThinking = false;
        this.gameStarted = false;
        this.finished = false;

        GameTimer.reset();

        document.getElementById("gameStatus").textContent =
            `${this.playerName("X")}'s turn`;
        document.getElementById("gameMessage").textContent =
            "Make your first move!";

        this.renderBoard();
        this.updateTension();
    },

    resetMatch() {
        this.matchWins = { X: 0, O: 0 };
        this.newGame();
    },

    resetScores() {
        if (confirm("Are you sure you want to clear all statistics?")) {
            Scoreboard.reset();
            this.matchWins = { X: 0, O: 0 };
            this.newGame();
        }
    },

    renderBoard() {
        const boardElement = document.getElementById("board");
        boardElement.innerHTML = "";
        boardElement.classList.toggle("size-4", Game.size === 4);
        boardElement.classList.toggle("mosaic", this.mosaicOn);

        const isAITurn =
            document.getElementById("gameMode").value === "ai" &&
            Game.currentPlayer === "O";

        Game.board.forEach((value, index) => {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.textContent = value;
            cell.setAttribute("aria-label",
                value ? `Cell ${index + 1}: ${value}` : `Empty cell ${index + 1}`);

            if (value === "O") cell.classList.add("o");
            if (Game.winningCombo.includes(index)) cell.classList.add("winner");

            if (this.mosaicOn) {
                cell.style.setProperty("--cell-tint",
                    this.mosaicPalette[(index + Game.size) % this.mosaicPalette.length]);
            }

            cell.disabled =
                Boolean(value) || Game.gameOver || this.aiThinking || isAITurn;

            cell.addEventListener("click", () => this.handleMove(index));
            boardElement.appendChild(cell);
        });
    },

    handleMove(index) {
        if (this.finished || this.aiThinking) return;

        this.ensureAudio();

        if (!this.gameStarted) {
            this.gameStarted = true;
            GameTimer.start();
        }

        const mover = Game.currentPlayer;
        const result = Game.makeMove(index);

        if (!result.valid) return;

        GameAudio.move(mover);
        this.processResult(result);
    },

    processResult(result) {
        this.renderBoard();

        if (result.winner) { this.finishGame(result.winner); return; }
        if (result.draw) { this.finishGame("Draw"); return; }

        document.getElementById("gameStatus").textContent =
            `${this.playerName(Game.currentPlayer)}'s turn`;

        this.updateTension();

        if (
            document.getElementById("gameMode").value === "ai" &&
            Game.currentPlayer === "O"
        ) {
            this.computerMove();
        }
    },

    computerMove() {
        this.aiThinking = true;
        this.renderBoard();

        document.getElementById("gameStatus").textContent = "Computer thinking...";

        setTimeout(() => {
            if (this.finished || Game.gameOver) return;

            const difficulty = document.getElementById("difficulty").value;
            const move = AI.chooseMove(Game.board, "O", difficulty, Game.size);

            this.aiThinking = false;

            if (move !== null) {
                const result = Game.makeMove(move);
                GameAudio.move("O");
                this.processResult(result);
            }
        }, 400);
    },

    // Fair tension cue: music + a pill, but never highlights the winning square.
    updateTension() {
        const tensionEl = document.getElementById("tension");
        const textEl = document.getElementById("tensionText");

        if (!Game.board.length || Game.gameOver || this.finished) {
            tensionEl.hidden = true;
            GameAudio.updateTension({ threatCount: 0, active: false });
            return;
        }

        const threats = Game.getThreats();
        const players = new Set(threats.map(t => t.player));

        if (threats.length > 0) {
            textEl.textContent = players.size === 2
                ? "Both players are one move from winning!"
                : `${this.playerName([...players][0])} is one move from winning`;
            tensionEl.hidden = false;
        } else {
            tensionEl.hidden = true;
        }

        const filled = Game.board.filter(v => v !== "").length;
        GameAudio.updateTension({
            threatCount: threats.length,
            fillRatio: filled / Game.board.length,
            active: true
        });
    },

    finishGame(result) {
        this.finished = true;
        GameTimer.stop();
        Scoreboard.record(result);

        document.getElementById("tension").hidden = true;

        const bestOfThree = document.getElementById("matchMode").value === "best3";
        let winnerName = "";

        if (result === "Draw") {
            document.getElementById("gameStatus").textContent = "It's a draw!";
            document.getElementById("gameMessage").textContent =
                "Well played! Nobody wins this round.";
            GameAudio.draw();
        } else {
            this.matchWins[result]++;
            winnerName = this.playerName(result);

            document.getElementById("gameStatus").textContent = `${winnerName} wins!`;
            document.getElementById("gameMessage").textContent =
                `Congratulations! ${winnerName} won the game.`;
            GameAudio.win();
        }

        if (bestOfThree) {
            const xWins = this.matchWins.X;
            const oWins = this.matchWins.O;

            const matchScore =
                `Match score: ${this.playerName("X")} ${xWins} - ${oWins} ${this.playerName("O")}`;

            if (xWins === 2 || oWins === 2) {
                const matchWinner = xWins === 2 ? this.playerName("X") : this.playerName("O");

                document.getElementById("gameStatus").textContent = "MATCH WON!";
                document.getElementById("gameMessage").textContent =
                    `${matchWinner} wins the Best of 3 match! ${matchScore}`;
            } else {
                document.getElementById("gameMessage").textContent =
                    `${result === "Draw" ? "Round drawn." : winnerName + " wins this round."} ${matchScore} Next game starts shortly...`;

                this.nextGameTimer = setTimeout(() => {
                    this.nextGameTimer = null;
                    if (this.finished) this.newGame();
                }, 1500);
            }
        }

        this.renderBoard();
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
