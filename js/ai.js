
const AI = {
    chooseMove(board, player, difficulty, size) {
        const available = board
            .map((cell, index) => cell === "" ? index : -1)
            .filter(index => index !== -1);

        if (!available.length) return null;

        if (difficulty === "easy") {
            return this.randomMove(available);
        }

        if (difficulty === "medium") {
            return this.mediumMove(board, player, size, available);
        }

        if (size === 3) {
            return this.minimaxMove(board, player);
        }

        return this.advanced4x4Move(board, player, available);
    },

    randomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    },

    mediumMove(board, player, size, available) {
        const opponent = player === "X" ? "O" : "X";

        // Win if possible
        for (const move of available) {
            const copy = [...board];
            copy[move] = player;

            if (this.hasWon(copy, player, size)) return move;
        }

        // Block opponent
        for (const move of available) {
            const copy = [...board];
            copy[move] = opponent;

            if (this.hasWon(copy, opponent, size)) return move;
        }

        // Prefer central positions
        const center = Math.floor(size / 2);
        const preferred = available.filter(index => {
            const row = Math.floor(index / size);
            const col = index % size;

            return Math.abs(row - center) <= 1 &&
                   Math.abs(col - center) <= 1;
        });

        return this.randomMove(preferred.length ? preferred : available);
    },

    getWinningLines(size) {
        const lines = [];

        for (let r = 0; r < size; r++) {
            lines.push(Array.from(
                { length: size },
                (_, c) => r * size + c
            ));
        }

        for (let c = 0; c < size; c++) {
            lines.push(Array.from(
                { length: size },
                (_, r) => r * size + c
            ));
        }

        lines.push(Array.from(
            { length: size },
            (_, i) => i * size + i
        ));

        lines.push(Array.from(
            { length: size },
            (_, i) => i * size + (size - 1 - i)
        ));

        return lines;
    },

    hasWon(board, player, size) {
        return this.getWinningLines(size).some(
            line => line.every(index => board[index] === player)
        );
    },

    minimaxMove(board, player) {
        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < board.length; i++) {
            if (board[i] !== "") continue;

            const copy = [...board];
            copy[i] = player;

            const score = this.minimax(
                copy, 0, false, player,
                -Infinity, Infinity
            );

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }

        return bestMove;
    },

    minimax(board, depth, maximizing, player, alpha, beta) {
        const opponent = player === "X" ? "O" : "X";

        if (this.hasWon(board, player, 3)) return 10 - depth;
        if (this.hasWon(board, opponent, 3)) return depth - 10;

        const available = board
            .map((cell, i) => cell === "" ? i : -1)
            .filter(i => i !== -1);

        if (!available.length) return 0;

        if (maximizing) {
            let best = -Infinity;

            for (const move of available) {
                const copy = [...board];
                copy[move] = player;

                best = Math.max(
                    best,
                    this.minimax(copy, depth + 1, false, player, alpha, beta)
                );

                alpha = Math.max(alpha, best);
                if (beta <= alpha) break;
            }

            return best;
        }

        let best = Infinity;

        for (const move of available) {
            const copy = [...board];
            copy[move] = opponent;

            best = Math.min(
                best,
                this.minimax(copy, depth + 1, true, player, alpha, beta)
            );

            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }

        return best;
    },

    advanced4x4Move(board, player, available) {
        const opponent = player === "X" ? "O" : "X";

        // Take an immediate win
        for (const move of available) {
            const copy = [...board];
            copy[move] = player;
            if (this.hasWon(copy, player, 4)) return move;
        }

        // Prevent an immediate loss
        for (const move of available) {
            const copy = [...board];
            copy[move] = opponent;
            if (this.hasWon(copy, opponent, 4)) return move;
        }

        // Depth-limited strategic search
        let bestMove = available[0];
        let bestScore = -Infinity;

        for (const move of available) {
            const copy = [...board];
            copy[move] = player;

            const score = this.search4x4(
                copy, 2, false, player, -Infinity, Infinity
            );

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    },

    evaluate4x4(board, player) {
        const opponent = player === "X" ? "O" : "X";
        let score = 0;

        for (const line of this.getWinningLines(4)) {
            const mine = line.filter(i => board[i] === player).length;
            const theirs = line.filter(i => board[i] === opponent).length;

            if (mine && theirs) continue;

            if (mine) score += [0, 2, 12, 80, 10000][mine];
            if (theirs) score -= [0, 3, 15, 100, 10000][theirs];
        }

        return score;
    },

    search4x4(board, depth, maximizing, player, alpha, beta) {
        const opponent = player === "X" ? "O" : "X";

        if (this.hasWon(board, player, 4)) return 10000 + depth;
        if (this.hasWon(board, opponent, 4)) return -10000 - depth;

        const available = board
            .map((cell, i) => cell === "" ? i : -1)
            .filter(i => i !== -1);

        if (!available.length || depth === 0) {
            return this.evaluate4x4(board, player);
        }

        if (maximizing) {
            let best = -Infinity;

            for (const move of available) {
                const copy = [...board];
                copy[move] = player;

                best = Math.max(best, this.search4x4(
                    copy, depth - 1, false, player, alpha, beta
                ));

                alpha = Math.max(alpha, best);
                if (beta <= alpha) break;
            }

            return best;
        }

        let best = Infinity;

        for (const move of available) {
            const copy = [...board];
            copy[move] = opponent;

            best = Math.min(best, this.search4x4(
                copy, depth - 1, true, player, alpha, beta
            ));

            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }

        return best;
    }
};
