
const Game = {
    board: [],
    size: 3,
    currentPlayer: "X",
    gameOver: false,
    winningCombo: [],

    start(size = 3) {
        this.size = Number(size);
        this.board = Array(this.size * this.size).fill("");
        this.currentPlayer = "X";
        this.gameOver = false;
        this.winningCombo = [];
    },

    makeMove(index) {
        if (
            this.gameOver ||
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.board.length ||
            this.board[index] !== ""
        ) {
            return { valid: false };
        }

        this.board[index] = this.currentPlayer;

        const winningCombo = this.checkWinner();

        if (winningCombo.length) {
            this.gameOver = true;
            this.winningCombo = winningCombo;

            return {
                valid: true,
                winner: this.currentPlayer,
                winningCombo
            };
        }

        if (this.board.every(cell => cell !== "")) {
            this.gameOver = true;
            return { valid: true, draw: true };
        }

        this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";

        return {
            valid: true,
            nextPlayer: this.currentPlayer
        };
    },

    checkWinner() {
        const n = this.size;
        const b = this.board;

        // Check rows
        for (let r = 0; r < n; r++) {
            const line = [];

            for (let c = 0; c < n; c++) {
                line.push(r * n + c);
            }

            if (b[line[0]] && line.every(i => b[i] === b[line[0]])) {
                return line;
            }
        }

        // Check columns
        for (let c = 0; c < n; c++) {
            const line = [];

            for (let r = 0; r < n; r++) {
                line.push(r * n + c);
            }

            if (b[line[0]] && line.every(i => b[i] === b[line[0]])) {
                return line;
            }
        }

        // Check main diagonal
        const diagonal1 = [];
        const diagonal2 = [];

        for (let i = 0; i < n; i++) {
            diagonal1.push(i * n + i);
            diagonal2.push(i * n + (n - 1 - i));
        }

        for (const line of [diagonal1, diagonal2]) {
            if (b[line[0]] && line.every(i => b[i] === b[line[0]])) {
                return line;
            }
        }

        return [];
    },

    getAvailableMoves() {
        return this.board
            .map((cell, index) => cell === "" ? index : -1)
            .filter(index => index !== -1);
    },

    // Lines that are one move from a win (size-1 of one player + one empty).
    // Returns [{ index, player }] — used for the tension music/indicator.
    getThreats() {
        const n = this.size;
        const b = this.board;
        const lines = [];

        for (let r = 0; r < n; r++) {
            const line = [];
            for (let c = 0; c < n; c++) line.push(r * n + c);
            lines.push(line);
        }
        for (let c = 0; c < n; c++) {
            const line = [];
            for (let r = 0; r < n; r++) line.push(r * n + c);
            lines.push(line);
        }
        const d1 = [], d2 = [];
        for (let i = 0; i < n; i++) {
            d1.push(i * n + i);
            d2.push(i * n + (n - 1 - i));
        }
        lines.push(d1, d2);

        const threats = [];
        for (const line of lines) {
            let empty = -1, xCount = 0, oCount = 0, empties = 0;
            for (const i of line) {
                if (b[i] === "") { empties++; empty = i; }
                else if (b[i] === "X") xCount++;
                else oCount++;
            }
            if (empties !== 1) continue;
            if (xCount === n - 1) threats.push({ index: empty, player: "X" });
            else if (oCount === n - 1) threats.push({ index: empty, player: "O" });
        }
        return threats;
    }
};
