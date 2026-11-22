
const Scoreboard = {
    data: StorageManager.getData(),
    currentPage: 1,
    pageSize: 5,

    record(result) {
        if (result === "X") this.data.scoreX++;
        else if (result === "O") this.data.scoreO++;
        else this.data.draws++;

        this.data.gamesPlayed++;

        const entry = {
            result,
            date: new Date().toLocaleString(),
            duration: GameTimer.seconds
        };

        this.data.history.unshift(entry);

        // Save all game history without deleting older records
        StorageManager.saveData(this.data);

        // Return to the latest history page
        this.currentPage = 1;
        this.render();
    },

    render() {
        document.getElementById("scoreX").textContent = this.data.scoreX;
        document.getElementById("scoreO").textContent = this.data.scoreO;
        document.getElementById("draws").textContent = this.data.draws;
        document.getElementById("gamesPlayed").textContent = this.data.gamesPlayed;

        const history = document.getElementById("historyList");
        const previousButton = document.getElementById("previousPage");
        const nextButton = document.getElementById("nextPage");
        const pageInfo = document.getElementById("pageInfo");

        history.innerHTML = "";

        const totalGames = this.data.history.length;
        const totalPages = Math.max(1, Math.ceil(totalGames / this.pageSize));

        // Keep current page within valid limits
        this.currentPage = Math.min(this.currentPage, totalPages);

        if (totalGames === 0) {
            history.innerHTML =
                '<li class="empty-history">Your completed games will appear here.</li>';
        } else {
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const displayedGames = this.data.history.slice(
                startIndex,
                startIndex + this.pageSize
            );

            displayedGames.forEach(game => {
                const li = document.createElement("li");

                const outcome = game.result === "Draw"
                    ? "Draw"
                    : `${game.result} won`;

                li.textContent =
                    `${outcome} · ${game.date} · ${game.duration}s`;

                history.appendChild(li);
            });
        }

        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

        previousButton.disabled = this.currentPage === 1;
        nextButton.disabled = this.currentPage === totalPages;

        previousButton.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        };

        nextButton.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render();
            }
        };
    },

    reset() {
        StorageManager.resetData();
        this.data = StorageManager.getData();
        this.currentPage = 1;
        this.render();
    }
};
