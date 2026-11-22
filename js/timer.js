
const GameTimer = {
    seconds: 0,
    interval: null,

    start() {
        if (this.interval) return;

        this.interval = setInterval(() => {
            this.seconds++;
            this.render();
        }, 1000);
    },

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    },

    reset() {
        this.stop();
        this.seconds = 0;
        this.render();
    },

    render() {
        const minutes = String(
            Math.floor(this.seconds / 60)
        ).padStart(2, "0");

        const seconds = String(
            this.seconds % 60
        ).padStart(2, "0");

        document.getElementById("timer").textContent =
            `${minutes}:${seconds}`;
    }
};
