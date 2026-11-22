
const StorageManager = {
    KEY: "ultimateXOData",

    getData() {
        const defaults = {
            scoreX: 0,
            scoreO: 0,
            draws: 0,
            gamesPlayed: 0,
            history: []
        };

        try {
            const saved = JSON.parse(localStorage.getItem(this.KEY));
            return saved && typeof saved === "object"
                ? { ...defaults, ...saved }
                : defaults;
        } catch {
            return defaults;
        }
    },

    saveData(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },

    resetData() {
        localStorage.removeItem(this.KEY);
    }
};
