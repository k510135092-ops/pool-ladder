// ===== 星轨天梯榜 - API 数据引擎 =====
const APP = window.APP || {};

APP.API = {
    base: "/api",

    async get(url) {
        const res = await fetch(this.base + url);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async post(url, data) {
        const res = await fetch(this.base + url, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "请求失败"); }
        return res.json();
    },

    async put(url, data) {
        const res = await fetch(this.base + url, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "请求失败"); }
        return res.json();
    },

    async del(url, data) {
        const res = await fetch(this.base + url, {
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "请求失败"); }
        return res.json();
    }
};

APP.config = {
    ranks: [
        { id: 0, name: "白板", icon: "⬜", min: 0, max: 99 },
        { id: 1, name: "铜杆", icon: "🥉", min: 100, max: 299 },
        { id: 2, name: "银杆", icon: "🥈", min: 300, max: 599 },
        { id: 3, name: "金杆", icon: "🥇", min: 600, max: 999 },
        { id: 4, name: "钻杆", icon: "💎", min: 1000, max: 1499 },
        { id: 5, name: "王者", icon: "👑", min: 1500, max: 99999 }
    ],
    handicapRules: [
        { diff: 0, handicap: 0, winnerHigh: 10, winnerLow: 10 },
        { diff: 1, handicap: 1, winnerHigh: 8,  winnerLow: 12 },
        { diff: 2, handicap: 2, winnerHigh: 6,  winnerLow: 14 },
        { diff: 3, handicap: 3, winnerHigh: 4,  winnerLow: 16 },
        { diff: 4, handicap: 4, winnerHigh: 3,  winnerLow: 18 },
        { diff: 5, handicap: 5, winnerHigh: 2,  winnerLow: 20 }
    ]
};

APP.Store = {
    _playersCache: null,
    _matchesCache: null,
    _prizesCache: null,
    _cacheTime: 0,

    async refreshCache() {
        const now = Date.now();
        if (now - this._cacheTime < 3000 && this._playersCache) return; // 3秒内不重复刷新
        try {
            const [players, matches, prizes] = await Promise.all([
                APP.API.get("/leaderboard"),
                APP.API.get("/matches"),
                APP.API.get("/prizes")
            ]);
            this._playersCache = players;
            this._matchesCache = matches;
            this._prizesCache = prizes;
            this._cacheTime = now;
        } catch(e) { console.log("Cache refresh failed:", e.message); }
    },

    async getPlayers() { await this.refreshCache(); return this._playersCache || []; },
    async getMatches() { return this._matchesCache || []; },
    async getPrizes() { return this._prizesCache || APP.config.defaultPrizes || []; },

    async getPlayer(id) {
        try { return await APP.API.get("/players/" + id); }
        catch { return null; }
    },

    async addPlayer(name, phone) {
        const player = await APP.API.post("/players", { name, phone });
        this._playersCache = null; // invalidate cache
        localStorage.setItem("pool_ladder_current_player", JSON.stringify({ id: player.id, name: player.name }));
        return player;
    },

    async recordMatch(winnerId, loserId) {
        const match = await APP.API.post("/matches", { winnerId, loserId });
        this._playersCache = null;
        this._matchesCache = null;
        return match;
    },

    async redeemPrize(playerId, prizeId) {
        const result = await APP.API.post("/redeem", { playerId, prizeId });
        this._playersCache = null;
        this._prizesCache = null;
        return result;
    },

    async getRedemptions() {
        try { return await APP.API.get("/redemptions"); }
        catch { return []; }
    },

    async getLeaderboard() {
        await this.refreshCache();
        return this._playersCache || [];
    },

    async adminLogin(password) {
        return APP.API.post("/admin/login", { password });
    },

    async fulfillRedemption(id, adminPassword) {
        return APP.API.put("/redemptions/" + id + "/fulfill", { adminPassword });
    },

    async savePrize(id, data) {
        const result = await APP.API.put("/prizes/" + id, data);
        this._prizesCache = null;
        return result;
    },

    async deletePrize(id, adminPassword) {
        const result = await APP.API.del("/prizes/" + id, { adminPassword });
        this._prizesCache = null;
        return result;
    },

    async addPrize(data) {
        const result = await APP.API.post("/prizes", data);
        this._prizesCache = null;
        return result;
    },

    async resetPlayer(id, adminPassword) {
        const result = await APP.API.put("/players/" + id + "/reset", { adminPassword });
        this._playersCache = null;
        return result;
    }
};

APP.Helper = {
    getRank(score) {
        for (let i = APP.config.ranks.length - 1; i >= 0; i--) {
            if (score >= APP.config.ranks[i].min) return APP.config.ranks[i];
        }
        return APP.config.ranks[0];
    },
    getHandicapRule(diff) { return APP.config.handicapRules[Math.min(diff, 5)]; },
    timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "刚刚";
        if (mins < 60) return mins + "分钟前";
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + "小时前";
        return Math.floor(hours / 24) + "天前";
    },
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
    }
};