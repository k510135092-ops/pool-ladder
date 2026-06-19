// ===== 星轨天梯榜 - 共享API版 =====
const APP = window.APP || {};

APP.API = {
    base: "/api",
    async get(url) {
        const res = await fetch(this.base + url);
        if (!res.ok) throw new Error("读取失败");
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(this.base + url, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||"请求失败"); }
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(this.base + url, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||"请求失败"); }
        return res.json();
    },
    async del(url, data) {
        const res = await fetch(this.base + url, {
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||"请求失败"); }
        return res.json();
    }
};

APP.config = {
    ranks: [
        { id:0,name:"白板",icon:"⬜",min:0,max:99 },
        { id:1,name:"铜杆",icon:"🥉",min:100,max:299 },
        { id:2,name:"银杆",icon:"🥈",min:300,max:599 },
        { id:3,name:"金杆",icon:"🥇",min:600,max:999 },
        { id:4,name:"钻杆",icon:"💎",min:1000,max:1499 },
        { id:5,name:"王者",icon:"👑",min:1500,max:99999 }
    ],
    handicapRules: [
        { diff:0,handicap:0,winnerHigh:10,winnerLow:10 },
        { diff:1,handicap:1,winnerHigh:8,winnerLow:12 },
        { diff:2,handicap:2,winnerHigh:6,winnerLow:14 },
        { diff:3,handicap:3,winnerHigh:4,winnerLow:16 },
        { diff:4,handicap:4,winnerHigh:3,winnerLow:18 },
        { diff:5,handicap:5,winnerHigh:2,winnerLow:20 }
    ]
};

APP.Helper = {
    getRank(score) { for(let i=APP.config.ranks.length-1;i>=0;i--)if(score>=APP.config.ranks[i].min)return APP.config.ranks[i]; return APP.config.ranks[0]; },
    getHandicapRule(diff) { return APP.config.handicapRules[Math.min(diff,5)]; },
    timeAgo(d) { const s=(Date.now()-new Date(d).getTime())/60000; if(s<1)return"刚刚"; if(s<60)return Math.floor(s)+"分钟前"; const h=Math.floor(s/60); if(h<24)return h+"小时前"; return Math.floor(h/24)+"天前"; },
    formatDate(d) { const t=new Date(d); return (t.getMonth()+1)+"/"+t.getDate()+" "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0"); }
};