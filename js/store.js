// ===== 星轨天梯榜 - 演示版 (本地存储) =====
const APP = window.APP || {};

APP.API = {
    base: "",
    async get(url) { throw new Error("演示模式：数据仅保存在本机浏览器"); },
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
    key: 'pool_ladder_data',
    init() {
        if (!localStorage.getItem(this.key)) {
            this.save({ players: [], matches: [], prizes: [
                { id:1,name:"免费畅打一小时",cost:50,icon:"⏱️",stock:-1},
                { id:2,name:"饮品一瓶",cost:80,icon:"🥤",stock:-1},
                { id:3,name:"免台费一次",cost:120,icon:"🎱",stock:-1},
                { id:4,name:"品牌皮头/巧克",cost:200,icon:"🛠️",stock:-1},
                { id:5,name:"定制钥匙扣",cost:300,icon:"🔑",stock:-1},
                { id:6,name:"定制打火机",cost:350,icon:"🔥",stock:-1},
                { id:7,name:"专属刻字球杆架",cost:500,icon:"🏆",stock:-1},
                { id:8,name:"定制球衣/马甲",cost:800,icon:"👕",stock:-1}
            ], redemptions: [] });
        }
    },
    load() { try { return JSON.parse(localStorage.getItem(this.key))||{}; } catch(e) { return {}; } },
    save(d) { localStorage.setItem(this.key, JSON.stringify(d)); },
    async getPlayers() { return this.load().players || []; },
    async getMatches() { return (this.load().matches || []).slice(-50).reverse(); },
    async getPrizes() { return this.load().prizes || []; },
    async getPlayer(id) { return (this.load().players || []).find(p=>p.id===id) || null; },
    async addPlayer(name, phone) {
        const d = this.load();
        const p = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,8), name, phone, score:0, matchesPlayed:0, wins:0, losses:0, winStreak:0, maxWinStreak:0, createdAt: new Date().toISOString() };
        d.players = d.players || [];
        d.players.push(p);
        this.save(d);
        localStorage.setItem('pool_ladder_current_player', JSON.stringify({id:p.id, name:p.name}));
        return p;
    },
    async recordMatch(winnerId, loserId) {
        const d = this.load();
        const w = d.players.find(p=>p.id===winnerId);
        const l = d.players.find(p=>p.id===loserId);
        if (!w || !l) return null;
        const wR = APP.Helper.getRank(w.score), lR = APP.Helper.getRank(l.score);
        const rd = Math.abs(wR.id - lR.id);
        const r = APP.config.handicapRules[Math.min(rd,5)];
        const hi = wR.id >= lR.id;
        const pts = rd===0 ? r.winnerHigh : (hi ? r.winnerHigh : r.winnerLow);
        const hc = wR.id>lR.id ? r.handicap : (lR.id>wR.id ? r.handicap : 0);
        w.score += pts; l.score += 2;
        w.wins++; l.losses++; w.matchesPlayed++; l.matchesPlayed++;
        w.winStreak++; l.winStreak=0;
        w.maxWinStreak = Math.max(w.maxWinStreak, w.winStreak);
        let hd = hc>0 ? w.name+' 让 '+hc+' 球' : (hc<0 ? l.name+' 让 '+Math.abs(hc)+' 球' : '同段位无让球');
        const m = { id: Date.now().toString(36), winnerId, loserId, winnerName:w.name, loserName:l.name, points:pts, handicap:Math.abs(hc), handicapDesc:hd, time:new Date().toISOString() };
        d.matches = d.matches || []; d.matches.push(m);
        this.save(d);
        return m;
    },
    async redeemPrize(playerId, prizeId) {
        const d = this.load();
        const p = d.players.find(x=>x.id===playerId);
        const z = d.prizes.find(x=>x.id===prizeId);
        if (!p || !z) return null;
        if (p.score < z.cost) return { error: '积分不足' };
        if (z.stock === 0) return { error: '已兑完' };
        p.score -= z.cost;
        if (z.stock > 0) z.stock--;
        const rec = { id: Date.now().toString(36), playerId, playerName:p.name, prizeId:z.id, prizeName:z.name, cost:z.cost, time:new Date().toISOString(), status:'pending' };
        d.redemptions = d.redemptions || []; d.redemptions.push(rec);
        this.save(d);
        return { success:true, playerScore:p.score, record:rec };
    },
    async getRedemptions() {
        const d = this.load();
        return (d.redemptions || []).slice().reverse();
    },
    async getLeaderboard() {
        return (this.load().players || []).sort((a,b)=>b.score-a.score);
    },
    async adminLogin(pwd) { return pwd==='888888' ? {ok:true} : new Error('密码错误'); },
    async fulfillRedemption(id) { const d=this.load(); const r=d.redemptions.find(x=>x.id===id); if(r) r.status='fulfilled'; this.save(d); return {ok:true}; },
    async savePrize(id, data) { const d=this.load(); const p=d.prizes.find(x=>x.id===id); if(p) { if(data.name!==undefined) p.name=data.name; if(data.cost!==undefined) p.cost=data.cost; } this.save(d); return p; },
    async deletePrize(id) { const d=this.load(); d.prizes=d.prizes.filter(x=>x.id!==id); this.save(d); return {ok:true}; },
    async addPrize(data) { const d=this.load(); const p={id:Date.now(), name:data.name||'新奖品', cost:data.cost||100, icon:data.icon||'🎁', stock:data.stock!==undefined?data.stock:-1}; d.prizes.push(p); this.save(d); return p; },
    async resetPlayer(id) { const d=this.load(); const p=d.players.find(x=>x.id===id); if(p) { p.score=0; p.wins=0; p.losses=0; p.matchesPlayed=0; p.winStreak=0; } this.save(d); return {ok:true}; }
};

APP.Helper = {
    getRank(score) {
        for (let i = APP.config.ranks.length - 1; i >= 0; i--) if (score >= APP.config.ranks[i].min) return APP.config.ranks[i];
        return APP.config.ranks[0];
    },
    getHandicapRule(diff) { return APP.config.handicapRules[Math.min(diff, 5)]; },
    timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "刚刚"; if (mins < 60) return mins + "分钟前";
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + "小时前";
        return Math.floor(hours / 24) + "天前";
    },
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
    }
};