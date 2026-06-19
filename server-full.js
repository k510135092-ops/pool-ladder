const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_PASSWORD = "888888";

// ===== 数据管理 =====
let DB = { players: [], matches: [], prizes: [], redemptions: [] };

const defaultPrizes = [
    { id: 1, name: "免费畅打一小时", cost: 50, icon: "⏱️", stock: -1 },
    { id: 2, name: "饮品一瓶", cost: 80, icon: "🥤", stock: -1 },
    { id: 3, name: "免台费一次", cost: 120, icon: "🎱", stock: -1 },
    { id: 4, name: "品牌皮头/巧克", cost: 200, icon: "🛠️", stock: -1 },
    { id: 5, name: "定制钥匙扣", cost: 300, icon: "🔑", stock: -1 },
    { id: 6, name: "定制打火机", cost: 350, icon: "🔥", stock: -1 },
    { id: 7, name: "专属刻字球杆架", cost: 500, icon: "🏆", stock: -1 },
    { id: 8, name: "定制球衣/马甲", cost: 800, icon: "👕", stock: -1 }
];

function loadData() {
    try { if (fs.existsSync(DATA_FILE)) { DB = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } }
    catch(e) { console.log("Data load error:", e.message); }
    if (!DB.prizes || DB.prizes.length === 0) DB.prizes = JSON.parse(JSON.stringify(defaultPrizes));
    if (!DB.players) DB.players = [];
    if (!DB.matches) DB.matches = [];
    if (!DB.redemptions) DB.redemptions = [];
}

function saveData() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2), "utf8"); }
    catch(e) { console.log("Data save error:", e.message); }
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ===== 段位规则 =====
const ranks = [
    { id: 0, name: "白板", icon: "⬜", min: 0, max: 99 },
    { id: 1, name: "铜杆", icon: "🥉", min: 100, max: 299 },
    { id: 2, name: "银杆", icon: "🥈", min: 300, max: 599 },
    { id: 3, name: "金杆", icon: "🥇", min: 600, max: 999 },
    { id: 4, name: "钻杆", icon: "💎", min: 1000, max: 1499 },
    { id: 5, name: "王者", icon: "👑", min: 1500, max: 99999 }
];

const handicapRules = [
    { diff: 0, handicap: 0, winnerHigh: 10, winnerLow: 10 },
    { diff: 1, handicap: 1, winnerHigh: 8,  winnerLow: 12 },
    { diff: 2, handicap: 2, winnerHigh: 6,  winnerLow: 14 },
    { diff: 3, handicap: 3, winnerHigh: 4,  winnerLow: 16 },
    { diff: 4, handicap: 4, winnerHigh: 3,  winnerLow: 18 },
    { diff: 5, handicap: 5, winnerHigh: 2,  winnerLow: 20 }
];

function getRank(score) {
    for (let i = ranks.length - 1; i >= 0; i--) if (score >= ranks[i].min) return ranks[i];
    return ranks[0];
}

// ===== MIME 类型 =====
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".json": "application/json"
};

function serveStatic(req, res) {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(__dirname, urlPath);
    const ext = path.extname(filePath);
    try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
        res.end(data);
    } catch { return false; }
    return true;
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
}

function json(res, data, code) {
    res.writeHead(code || 200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(data));
}

// ===== API 路由 =====
async function handleAPI(req, res) {
    const url = req.url.split("?")[0];
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
        res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE", "Access-Control-Allow-Headers": "Content-Type" });
        res.end(); return true;
    }

    // GET /api/leaderboard
    if (url === "/api/leaderboard" && method === "GET") {
        const sorted = [...DB.players].sort((a,b) => b.score - a.score).map((p,i) => ({ ...p, rank: i+1, rankInfo: getRank(p.score) }));
        return json(res, sorted);
    }

    // GET /api/players/:id
    const playerMatch = url.match(/^\/api\/players\/(.+)$/);
    if (playerMatch && method === "GET") {
        const p = DB.players.find(x => x.id === playerMatch[1]);
        if (!p) return json(res, { error: "玩家不存在" }, 404);
        p.rankInfo = getRank(p.score);
        return json(res, p);
    }

    // POST /api/players (register)
    if (url === "/api/players" && method === "POST") {
        const body = await parseBody(req);
        if (!body.name) return json(res, { error: "请输入昵称" }, 400);
        // Check duplicate
        if (DB.players.find(p => p.name === body.name && p.phone === body.phone)) {
            return json(res, { error: "该玩家已存在" }, 400);
        }
        const player = { id: genId(), name: body.name, phone: body.phone || "", score: 0, matchesPlayed: 0, wins: 0, losses: 0, winStreak: 0, maxWinStreak: 0, createdAt: new Date().toISOString() };
        DB.players.push(player);
        saveData();
        return json(res, player, 201);
    }

    // POST /api/matches
    if (url === "/api/matches" && method === "POST") {
        const body = await parseBody(req);
        const winner = DB.players.find(p => p.id === body.winnerId);
        const loser = DB.players.find(p => p.id === body.loserId);
        if (!winner || !loser) return json(res, { error: "玩家不存在" }, 400);
        if (winner.id === loser.id) return json(res, { error: "不能和自己对战" }, 400);

        const wRank = getRank(winner.score);
        const lRank = getRank(loser.score);
        const rankDiff = Math.abs(wRank.id - lRank.id);
        const rule = handicapRules[Math.min(rankDiff, 5)];
        const isHighBeatLow = wRank.id >= lRank.id;

        let handicap = 0, handicapDesc = "同段位无让球";
        if (wRank.id > lRank.id) { handicap = rule.handicap; handicapDesc = winner.name + " 让 " + handicap + " 球"; }
        else if (lRank.id > wRank.id) { handicap = -rule.handicap; handicapDesc = loser.name + " 让 " + Math.abs(handicap) + " 球"; }

        let points;
        if (rankDiff === 0) points = rule.winnerHigh;
        else if (isHighBeatLow) points = rule.winnerHigh;
        else points = rule.winnerLow;

        winner.score += points;
        loser.score += 2;
        winner.wins++; loser.losses++;
        winner.matchesPlayed++; loser.matchesPlayed++;
        winner.winStreak++; loser.winStreak = 0;
        winner.maxWinStreak = Math.max(winner.maxWinStreak, winner.winStreak);

        const match = {
            id: genId(), winnerId: body.winnerId, loserId: body.loserId,
            winnerName: winner.name, loserName: loser.name,
            points, handicap: Math.abs(handicap), handicapDesc,
            time: new Date().toISOString()
        };
        DB.matches.push(match);
        saveData();
        return json(res, match, 201);
    }

    // GET /api/matches
    if (url === "/api/matches" && method === "GET") {
        return json(res, DB.matches.slice(-50).reverse());
    }

    // GET /api/prizes
    if (url === "/api/prizes" && method === "GET") {
        return json(res, DB.prizes);
    }

    // POST /api/prizes (admin add prize)
    if (url === "/api/prizes" && method === "POST") {
        const body = await parseBody(req);
        if (body.adminPassword !== ADMIN_PASSWORD) return json(res, { error: "密码错误" }, 403);
        const prize = { id: Date.now(), name: body.name || "新奖品", cost: body.cost || 100, icon: body.icon || "🎁", stock: body.stock !== undefined ? body.stock : -1 };
        DB.prizes.push(prize);
        saveData();
        return json(res, prize, 201);
    }

    // PUT /api/prizes/:id
    const prizeMatch = url.match(/^\/api\/prizes\/(\d+)$/);
    if (prizeMatch && method === "PUT") {
        const body = await parseBody(req);
        if (body.adminPassword !== ADMIN_PASSWORD) return json(res, { error: "密码错误" }, 403);
        const prize = DB.prizes.find(p => p.id == prizeMatch[1]);
        if (!prize) return json(res, { error: "奖品不存在" }, 404);
        if (body.name !== undefined) prize.name = body.name;
        if (body.cost !== undefined) prize.cost = body.cost;
        if (body.icon !== undefined) prize.icon = body.icon;
        if (body.stock !== undefined) prize.stock = body.stock;
        saveData();
        return json(res, prize);
    }

    // DELETE /api/prizes/:id
    if (prizeMatch && method === "DELETE") {
        const body = await parseBody(req);
        if ((body.adminPassword || "") !== ADMIN_PASSWORD) return json(res, { error: "密码错误" }, 403);
        DB.prizes = DB.prizes.filter(p => p.id != prizeMatch[1]);
        saveData();
        return json(res, { ok: true });
    }

    // POST /api/redeem
    if (url === "/api/redeem" && method === "POST") {
        const body = await parseBody(req);
        const player = DB.players.find(p => p.id === body.playerId);
        const prize = DB.prizes.find(p => p.id == body.prizeId);
        if (!player || !prize) return json(res, { error: "玩家或奖品不存在" }, 400);
        if (player.score < prize.cost) return json(res, { error: "积分不足" }, 400);
        if (prize.stock === 0) return json(res, { error: "奖品已兑完" }, 400);
        player.score -= prize.cost;
        if (prize.stock > 0) prize.stock--;
        const record = { id: genId(), playerId: body.playerId, playerName: player.name, prizeId: prize.id, prizeName: prize.name, cost: prize.cost, time: new Date().toISOString(), status: "pending" };
        DB.redemptions.push(record);
        saveData();
        return json(res, { success: true, score: player.score, record });
    }

    // GET /api/redemptions
    if (url === "/api/redemptions" && method === "GET") {
        return json(res, DB.redemptions.reverse());
    }

    // PUT /api/redemptions/:id/fulfill
    const redMatch = url.match(/^\/api\/redemptions\/(.+)\/fulfill$/);
    if (redMatch && method === "PUT") {
        const body = await parseBody(req);
        if (body.adminPassword !== ADMIN_PASSWORD) return json(res, { error: "密码错误" }, 403);
        const r = DB.redemptions.find(x => x.id === redMatch[1]);
        if (!r) return json(res, { error: "记录不存在" }, 404);
        r.status = "fulfilled";
        saveData();
        return json(res, { ok: true });
    }

    // POST /api/admin/login
    if (url === "/api/admin/login" && method === "POST") {
        const body = await parseBody(req);
        if (body.password === ADMIN_PASSWORD) return json(res, { ok: true, token: "admin_session" });
        return json(res, { error: "密码错误" }, 403);
    }

    // PUT /api/players/:id/reset
    const resetMatch = url.match(/^\/api\/players\/(.+)\/reset$/);
    if (resetMatch && method === "PUT") {
        const body = await parseBody(req);
        if (body.adminPassword !== ADMIN_PASSWORD) return json(res, { error: "密码错误" }, 403);
        const p = DB.players.find(x => x.id === resetMatch[1]);
        if (!p) return json(res, { error: "玩家不存在" }, 404);
        p.score = 0; p.wins = 0; p.losses = 0; p.matchesPlayed = 0; p.winStreak = 0;
        saveData();
        return json(res, { ok: true });
    }

    return false;
}

// ===== 启动服务器 =====
loadData();
const server = http.createServer(async (req, res) => {
    try {
        if (req.url.startsWith("/api/")) { const handled = await handleAPI(req, res); if (handled) return; }
        if (serveStatic(req, res)) return;
        res.writeHead(404); res.end("Not Found");
    } catch(e) { console.error(e); res.writeHead(500); res.end("Server Error"); }
});

server.listen(PORT, "0.0.0.0", () => console.log("🚀 星轨天梯榜后端已启动 http://0.0.0.0:" + PORT));