// ===== 星轨天梯榜 - 客户端逻辑 (API版) =====
window.APP = window.APP || {};

function esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    APP.UI.init();
});

APP.UI = {
    currentView: 'home',
    currentTab: 'leaderboard',
    currentPlayer: null,
    loading: false,

    init: async function() {
        var saved = localStorage.getItem('pool_ladder_current_player');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                var player = await APP.Store.getPlayer(data.id);
                if (player && !player.error) {
                    APP.UI.currentPlayer = player;
                    document.getElementById('currentPlayerDisplay').textContent = player.name;
                }
            } catch(e) {}
        }
        APP.UI.showView('home');
    },

    showView: function(name) {
        var views = document.querySelectorAll('.view');
        for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
        var viewEl = document.getElementById('view-' + name);
        if (viewEl) viewEl.classList.add('active');
        this.currentView = name;
        var btns = document.querySelectorAll('.bn-btn');
        for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
        var btn = document.querySelector('.bn-btn[data-view="' + name + '"]');
        if (btn) btn.classList.add('active');
        if (name === 'home') this.refreshHome();
        if (name === 'battle') APP.Battle.reset();
        if (name === 'shop') this.refreshShop();
        if (name === 'profile') this.refreshProfile();
        if (name === 'admin') APP.Admin.refresh();
    },

    switchTab: function(tab) {
        this.currentTab = tab;
        var tabBtns = document.querySelectorAll('#view-home .tab-btn');
        for (var i = 0; i < tabBtns.length; i++) tabBtns[i].classList.remove('active');
        var tabContents = document.querySelectorAll('#view-home .tab-content');
        for (var j = 0; j < tabContents.length; j++) tabContents[j].classList.remove('active');
        if (tabBtns.length >= 2) {
            if (tab === 'leaderboard') tabBtns[0].classList.add('active');
            else tabBtns[1].classList.add('active');
        }
        document.getElementById('tab-' + tab).classList.add('active');
        if (tab === 'leaderboard') this.refreshLeaderboard();
        if (tab === 'recent') this.refreshMatchFeed();
    },

    refreshHome: function() { this.refreshLeaderboard(); this.refreshMatchFeed(); this.updateHero(); },

    updateHero: async function() {
        var players = await APP.Store.getPlayers();
        var matches = await APP.Store.getMatches();
        document.getElementById('heroRank').innerHTML =
            '<div class="hero-label">本月天梯</div>' +
            '<div class="hero-count">👥 ' + (players ? players.length : 0) + ' 位玩家 · ⚔️ ' + (matches ? matches.length : 0) + ' 场对决</div>';
    },

    refreshLeaderboard: async function() {
        var list = document.getElementById('leaderboardList');
        list.innerHTML = '<div class="empty-state">⏳ 加载中...</div>';
        try {
            var players = await APP.Store.getLeaderboard();
            if (!players || players.length === 0) {
                list.innerHTML = '<div class="empty-state">🏓<br>暂无玩家数据<br>快邀请朋友来对战吧！</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < players.length; i++) {
                var p = players[i];
                var rank = APP.Helper.getRank(p.score);
                var rankIcon = '' + (i + 1);
                var rankClass = '';
                var topClass = '';
                if (i === 0) { rankIcon = '🥇'; rankClass = 'gold'; topClass = 'top1'; }
                else if (i === 1) { rankIcon = '🥈'; rankClass = 'silver'; topClass = 'top2'; }
                else if (i === 2) { rankIcon = '🥉'; rankClass = 'bronze'; topClass = 'top3'; }
                var wr = p.matchesPlayed > 0 ? Math.round(p.wins / p.matchesPlayed * 100) : 0;
                html += '<div class="lb-item ' + topClass + '">' +
                    '<div class="lb-rank ' + rankClass + '">' + rankIcon + '</div>' +
                    '<div class="lb-info">' +
                        '<div class="lb-name">' + esc(p.name) + ' <span class="lb-rank-badge">' + rank.icon + ' ' + rank.name + '</span></div>' +
                        '<div class="lb-meta">' + p.wins + '胜 ' + p.losses + '负 · 胜率' + wr + '%</div>' +
                    '</div>' +
                    '<div class="lb-score">' +
                        '<div class="lb-score-val">' + p.score + '</div>' +
                        '<div class="lb-score-label">积分</div>' +
                    '</div>' +
                '</div>';
            }
            list.innerHTML = html;
        } catch(e) { list.innerHTML = '<div class="empty-state">❌ 加载失败<br>' + esc(e.message) + '</div>'; }
    },

    refreshMatchFeed: async function(targetId) {
        var feedId = targetId || 'matchFeed';
        var el = document.getElementById(feedId);
        if (!el) return;
        try {
            var matches = await APP.Store.getMatches();
            if (!matches || matches.length === 0) {
                el.innerHTML = '<div class="empty-state">⚔️<br>暂无对战记录</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < Math.min(matches.length, 20); i++) {
                var m = matches[i];
                var up = m.points > 5;
                html += '<div class="match-item">' +
                    '<div class="match-vs">' +
                        '<span>🏓</span>' +
                        '<span class="match-winner">' + esc(m.winnerName) + '</span>' +
                        '<span>胜</span>' +
                        '<span class="match-loser">' + esc(m.loserName) + '</span>' +
                        '<span class="match-score-change ' + (up ? '' : 'lose') + '">+' + m.points + '</span>' +
                    '</div>' +
                    '<div class="match-meta">' +
                        '<span>' + m.handicapDesc + '</span>' +
                        '<span>' + APP.Helper.timeAgo(m.time) + '</span>' +
                    '</div>' +
                '</div>';
            }
            el.innerHTML = html;
        } catch(e) { el.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    refreshShop: function() { this.refreshShopGrid(); this.refreshShopRedemptions(); },

    refreshShopGrid: async function() {
        var grid = document.getElementById('shopGrid');
        var myScore = (APP.UI.currentPlayer && APP.UI.currentPlayer.score) || 0;
        if (APP.UI.currentPlayer) {
            document.getElementById('shopMyPoints').textContent = '我的积分：' + myScore;
        }
        try {
            var prizes = await APP.Store.getPrizes();
            if (!prizes || prizes.length === 0) { grid.innerHTML = '<div class="empty-state">暂无奖品</div>'; return; }
            var html = '';
            for (var i = 0; i < prizes.length; i++) {
                var p = prizes[i];
                var ok = myScore >= p.cost;
                var st = p.stock === -1 ? '不限量' : '剩余' + p.stock;
                html += '<div class="shop-item ' + (ok ? 'affordable' : 'too-expensive') + '" onclick="APP.Shop.redeem(' + p.id + ')">' +
                    '<div class="shop-item-icon">' + p.icon + '</div>' +
                    '<div class="shop-item-name">' + esc(p.name) + '</div>' +
                    '<div class="shop-item-cost">' + p.cost + ' 分</div>' +
                    '<div class="shop-item-stock">' + st + '</div>' +
                '</div>';
            }
            grid.innerHTML = html;
        } catch(e) { grid.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    refreshShopRedemptions: async function() {
        var list = document.getElementById('shopRedemptions');
        if (!APP.UI.currentPlayer) { list.innerHTML = '<div class="empty-state">请先登录</div>'; return; }
        try {
            var rs = await APP.Store.getRedemptions();
            var mine = (rs || []).filter(function(r){ return r.playerId === APP.UI.currentPlayer.id; });
            if (mine.length === 0) { list.innerHTML = '<div class="empty-state">暂无兑换记录</div>'; return; }
            var html = '';
            for (var i = 0; i < mine.length; i++) {
                var r = mine[i];
                html += '<div class="redemption-item">' +
                    '<div class="ri-icon">' + (r.prizeName ? '🎁' : '🎁') + '</div>' +
                    '<div class="ri-info"><div class="ri-name">' + esc(r.prizeName) + '</div>' +
                    '<div class="ri-time">' + APP.Helper.formatDate(r.time) + ' · -' + r.cost + '分</div></div>' +
                    '<div class="ri-status ' + r.status + '">' + (r.status === 'pending' ? '待处理' : '已发放') + '</div>' +
                '</div>';
            }
            list.innerHTML = html;
        } catch(e) { list.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    refreshProfile: async function() {
        var p = APP.UI.currentPlayer;
        if (!p) {
            document.getElementById('profileLoggedOut').classList.remove('hidden');
            document.getElementById('profileLoggedIn').classList.add('hidden');
            return;
        }
        try { p = await APP.Store.getPlayer(p.id); APP.UI.currentPlayer = p; } catch(e) {}
        document.getElementById('profileLoggedOut').classList.add('hidden');
        document.getElementById('profileLoggedIn').classList.remove('hidden');
        var rk = APP.Helper.getRank(p.score);
        document.getElementById('profileName').textContent = p.name;
        document.getElementById('profileRank').textContent = rk.icon + ' ' + rk.name;
        document.getElementById('profileScore').textContent = p.score + ' 分';
        document.getElementById('statMatches').textContent = p.matchesPlayed;
        document.getElementById('statWins').textContent = p.wins;
        document.getElementById('statWinRate').textContent = p.matchesPlayed > 0 ? Math.round(p.wins/p.matchesPlayed*100)+'%' : '-';
        document.getElementById('statStreak').textContent = p.winStreak;
        var ni = Math.min(rk.id+1, APP.config.ranks.length-1);
        var nr = APP.config.ranks[ni];
        var pg = rk.id<5 ? Math.min(100, ((p.score-rk.min)/(nr.min-rk.min))*100) : 100;
        var pt = rk.id<5 ? '距离' + nr.icon + nr.name + '还需 ' + (nr.min-p.score) + ' 分' : '已达最高段位！';
        document.getElementById('rankProgress').innerHTML =
            '<div class="rank-progress-bar"><div class="rank-progress-fill" style="width:' + pg + '%"></div></div>' +
            '<div class="rank-progress-text">' + pt + '</div>';
    },

    showToast: function(msg, type) {
        var el = document.getElementById('toast');
        el.textContent = msg;
        el.className = 'toast ' + (type || '');
        clearTimeout(this._toastTimer);
        var self = this;
        this._toastTimer = setTimeout(function(){ el.classList.add('hidden'); }, 2500);
    }
};
APP.Battle = {
    selectedOpponent: null,

    reset: function() {
        document.getElementById('battleStep1').classList.remove('hidden');
        document.getElementById('battleStep2').classList.add('hidden');
        document.getElementById('battleStep3').classList.add('hidden');
        document.getElementById('opponentSearch').value = '';
        this.selectedOpponent = null;
        this.searchOpponent();
    },

    searchOpponent: async function() {
        if (!APP.UI.currentPlayer) { APP.UI.showToast('请先在个人中心注册', 'error'); return; }
        var q = (document.getElementById('opponentSearch').value || '').toLowerCase();
        var all = await APP.Store.getPlayers();
        var ap = (all || []).filter(function(p){ return p.id !== APP.UI.currentPlayer.id; });
        var f = q ? ap.filter(function(p){ return p.name.toLowerCase().indexOf(q) !== -1; }) : ap;
        var list = document.getElementById('opponentList');
        if (f.length === 0) { list.innerHTML = '<div class="empty-state" style="font-size:13px;padding:20px">' + (q ? '未找到匹配玩家' : '暂无其他玩家，邀请朋友注册吧！') + '</div>'; return; }
        var html = '';
        for (var i = 0; i < f.length; i++) {
            var p = f[i]; var rk = APP.Helper.getRank(p.score);
            html += '<div class="player-select-item" onclick="APP.Battle.selectOpponent(\'' + p.id + '\')">' +
                '<div class="psi-avatar">' + rk.icon + '</div>' +
                '<div class="psi-info"><div class="psi-name">' + esc(p.name) + '</div>' +
                '<div class="psi-rank">' + rk.icon + ' ' + rk.name + ' · ' + p.score + '分 · ' + p.wins + '胜' + p.losses + '负</div></div>' +
                '<div style="font-size:24px">⚔️</div></div>';
        }
        list.innerHTML = html;
    },

    selectOpponent: async function(id) {
        var opp = await APP.Store.getPlayer(id);
        var me = APP.UI.currentPlayer;
        if (!me || !opp) return;
        this.selectedOpponent = opp;
        document.getElementById('battleStep1').classList.add('hidden');
        document.getElementById('battleStep2').classList.remove('hidden');
        var myR = APP.Helper.getRank(me.score);
        var opR = APP.Helper.getRank(opp.score);
        var rd = Math.abs(myR.id - opR.id);
        var rule = APP.Helper.getHandicapRule(rd);
        var ihi = myR.id > opR.id;
        document.getElementById('battleMe').innerHTML = '<div class="bp-avatar">😎</div><div class="bp-name">' + esc(me.name) + '</div><div class="bp-rank">' + myR.icon + ' ' + myR.name + '</div>';
        document.getElementById('battleOpp').innerHTML = '<div class="bp-avatar">🤔</div><div class="bp-name">' + esc(opp.name) + '</div><div class="bp-rank">' + opR.icon + ' ' + opR.name + '</div>';
        var ht;
        if (rd === 0) ht = '同段位 · 无让球';
        else if (ihi) ht = me.name + ' 让 ' + rule.handicap + ' 球';
        else ht = opp.name + ' 让 ' + rule.handicap + ' 球';
        document.getElementById('vsHandicap').textContent = ht;
        var wp;
        if (rd === 0) wp = rule.winnerHigh;
        else if (ihi) wp = rule.winnerHigh;
        else wp = rule.winnerLow;
        document.getElementById('battleInfo').innerHTML = '<div>我赢 → <strong>+' + wp + ' 分</strong> | 对手赢 → <strong>+2 参与分</strong></div><div>段位差：<strong>' + rd + ' 档</strong> · 对手当前 <strong>' + opp.score + ' 分</strong></div>';
    },

    submitResult: async function(result) {
        var me = APP.UI.currentPlayer;
        var opp = this.selectedOpponent;
        if (!me || !opp) return;
        try {
            var wi = result === 'win' ? me.id : opp.id;
            var li = result === 'win' ? opp.id : me.id;
            var m = await APP.Store.recordMatch(wi, li);
            APP.UI.currentPlayer = await APP.Store.getPlayer(me.id);
            document.getElementById('battleStep2').classList.add('hidden');
            document.getElementById('battleStep3').classList.remove('hidden');
            if (result === 'win') {
                document.getElementById('resultEmoji').textContent = '🎉';
                document.getElementById('resultText').textContent = '恭喜获胜！';
                document.getElementById('resultScore').textContent = '+' + m.points + ' 分';
                document.getElementById('resultDetail').textContent = '新积分：' + APP.UI.currentPlayer.score + ' · ' + m.handicapDesc;
            } else {
                document.getElementById('resultEmoji').textContent = '💪';
                document.getElementById('resultText').textContent = '虽败犹荣';
                document.getElementById('resultScore').textContent = '+2 参与分';
                document.getElementById('resultDetail').textContent = '新积分：' + APP.UI.currentPlayer.score + ' · 下次加油！';
            }
            APP.UI.refreshLeaderboard();
            APP.UI.refreshMatchFeed();
            APP.UI.updateHero();
        } catch(e) { APP.UI.showToast('提交失败: ' + e.message, 'error'); }
    }
};

APP.Profile = {
    register: async function(event) {
        event.preventDefault();
        var name = document.getElementById('regName').value.trim();
        var phone = document.getElementById('regPhone').value.trim();
        if (!name) { APP.UI.showToast('请输入昵称', 'error'); return; }
        try {
            var player = await APP.Store.addPlayer(name, phone);
            APP.UI.currentPlayer = player;
            document.getElementById('currentPlayerDisplay').textContent = player.name;
            APP.UI.refreshProfile();
            APP.UI.showView('home');
            APP.UI.showToast('🎉 欢迎加入天梯榜！', 'success');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    },
    logout: function() {
        localStorage.removeItem('pool_ladder_current_player');
        APP.UI.currentPlayer = null;
        document.getElementById('currentPlayerDisplay').textContent = '未登录';
        APP.UI.refreshProfile();
        APP.UI.showView('home');
        APP.UI.showToast('已退出');
    }
};

APP.Shop = {
    redeem: async function(pid) {
        if (!APP.UI.currentPlayer) { APP.UI.showToast('请先登录', 'error'); return; }
        try {
            var r = await APP.Store.redeemPrize(APP.UI.currentPlayer.id, pid);
            APP.UI.currentPlayer = await APP.Store.getPlayer(APP.UI.currentPlayer.id);
            APP.UI.refreshShop();
            APP.UI.showToast('✅ 兑换成功！- ' + r.record.cost + '分', 'success');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    }
};
APP.Admin = {
    loggedIn: false,
    adminPassword: '',

    login: function() {
        var pwd = document.getElementById('adminPwd').value;
        APP.Admin.adminPassword = pwd;
        APP.Admin._doLogin(pwd);
    },

    _doLogin: async function(pwd) {
        try {
            var r = await APP.Store.adminLogin(pwd);
            if (r.ok) {
                APP.Admin.loggedIn = true;
                document.getElementById('adminLogin').classList.add('hidden');
                document.getElementById('adminPanel').classList.remove('hidden');
                APP.Admin.switchTab('confirm');
                APP.UI.showToast('✅ 管理员验证成功', 'success');
            }
        } catch(e) { APP.UI.showToast('密码错误', 'error'); }
    },

    refresh: function() {
        if (this.loggedIn) {
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            this.switchTab('confirm');
        }
    },

    switchTab: function(tab) {
        var ts = document.querySelectorAll('#adminPanel .tab-btn');
        for (var i = 0; i < ts.length; i++) {
            ts[i].classList.remove('active');
            var tx = ts[i].textContent;
            if ((tab === 'confirm' && tx.indexOf('待确认') !== -1) ||
                (tab === 'prizes' && tx.indexOf('奖品') !== -1) ||
                (tab === 'players' && tx.indexOf('玩家') !== -1)) ts[i].classList.add('active');
        }
        var ct = document.getElementById('adminTabContent');
        if (tab === 'confirm') this.renderConfirm(ct);
        else if (tab === 'prizes') this.renderPrizeEdit(ct);
        else if (tab === 'players') this.renderPlayerMgmt(ct);
    },

    renderConfirm: async function(el) {
        try {
            var rs = await APP.Store.getRedemptions();
            var pending = (rs || []).filter(function(r){ return r.status === 'pending'; });
            if (pending.length === 0) { el.innerHTML = '<div class="empty-state">✅<br>没有待处理的兑换</div>'; return; }
            var h = '<div class="confirm-list">';
            for (var i = 0; i < pending.length; i++) {
                var r = pending[i];
                h += '<div class="confirm-item"><div class="confirm-info"><div class="confirm-name">' + esc(r.playerName) + '</div>' +
                    '<div class="confirm-detail">兑换 ' + esc(r.prizeName) + ' · -' + r.cost + '分 · ' + APP.Helper.timeAgo(r.time) + '</div></div>' +
                    '<button class="confirm-btn" onclick="APP.Admin.fulfill(\'' + r.id + '\')">✅ 确认发放</button></div>';
            }
            h += '</div>';
            el.innerHTML = h;
        } catch(e) { el.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    fulfill: async function(id) {
        try {
            await APP.Store.fulfillRedemption(id, APP.Admin.adminPassword);
            APP.Admin.switchTab('confirm');
            APP.UI.showToast('奖品已发放 ✅', 'success');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    },

    renderPrizeEdit: async function(el) {
        try {
            var ps = await APP.Store.getPrizes();
            var h = '<div class="prize-list">';
            for (var i = 0; i < ps.length; i++) {
                var p = ps[i];
                h += '<div class="prize-edit-item"><span style="font-size:24px">' + p.icon + '</span>' +
                    '<input class="pe-name" value="' + esc(p.name) + '" id="peName_' + p.id + '">' +
                    '<input class="pe-cost" type="number" value="' + p.cost + '" id="peCost_' + p.id + '">' +
                    '<span style="font-size:12px;color:#888">分</span>' +
                    '<button class="prize-edit-btn pe-save" onclick="APP.Admin.savePrize(' + p.id + ')">保存</button>' +
                    '<button class="prize-edit-btn pe-delete" onclick="APP.Admin.deletePrize(' + p.id + ')">删除</button></div>';
            }
            h += '<div style="padding:12px"><button class="btn-primary" onclick="APP.Admin.addPrize()">+ 添加新奖品</button></div></div>';
            el.innerHTML = h;
        } catch(e) { el.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    savePrize: async function(id) {
        try {
            await APP.Store.savePrize(id, {
                name: document.getElementById('peName_' + id).value,
                cost: parseInt(document.getElementById('peCost_' + id).value) || 0,
                adminPassword: APP.Admin.adminPassword
            });
            APP.UI.showToast('✅ 奖品已更新', 'success');
            APP.UI.refreshShop();
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    },

    deletePrize: async function(id) {
        if (!confirm('确定删除该奖品？')) return;
        try {
            await APP.Store.deletePrize(id, APP.Admin.adminPassword);
            APP.Admin.switchTab('prizes');
            APP.UI.refreshShop();
            APP.UI.showToast('奖品已删除');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    },

    addPrize: async function() {
        try {
            await APP.Store.addPrize({ name: '新奖品', cost: 100, icon: '🎁', stock: -1, adminPassword: APP.Admin.adminPassword });
            APP.Admin.switchTab('prizes');
            APP.UI.showToast('新奖品已添加，请编辑名称和分值');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    },

    renderPlayerMgmt: async function(el) {
        try {
            var ps = await APP.Store.getPlayers();
            if (!ps || ps.length === 0) { el.innerHTML = '<div class="empty-state">暂无玩家</div>'; return; }
            var h = '';
            for (var i = 0; i < ps.length; i++) {
                var p = ps[i]; var rk = APP.Helper.getRank(p.score);
                h += '<div class="player-mgmt-item"><span style="font-size:24px">' + rk.icon + '</span>' +
                    '<div class="player-mgmt-info"><div>' + esc(p.name) + ' <span class="lb-rank-badge">' + rk.name + '</span></div>' +
                    '<div style="font-size:11px;color:#888">' + p.wins + '胜 ' + p.losses + '负 · 加入' + APP.Helper.timeAgo(p.createdAt) + '</div></div>' +
                    '<div class="player-mgmt-score">' + p.score + '分</div>' +
                    '<button class="player-mgmt-btn" onclick="APP.Admin.resetPlayer(\'' + p.id + '\')">重置</button></div>';
            }
            el.innerHTML = h;
        } catch(e) { el.innerHTML = '<div class="empty-state">加载失败</div>'; }
    },

    resetPlayer: async function(id) {
        if (!confirm('确定重置该玩家积分？')) return;
        try {
            await APP.Store.resetPlayer(id, APP.Admin.adminPassword);
            APP.Admin.switchTab('players');
            APP.UI.refreshAll();
            APP.UI.showToast('玩家积分已重置');
        } catch(e) { APP.UI.showToast(e.message, 'error'); }
    }
};
