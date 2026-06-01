/**
 * DDZ Web Client - Game Logic & UI
 */

// ===== State =====
let ws = null;
let myId = '';
let myName = '';
let reconnectToken = '';
let roomCode = '';
let players = []; // [{id, name, seat, isLandlord, cardsCount, online}]
let myHand = []; // [{suit, rank, color}]
let selectedCards = new Set(); // indices
let isReady = false;
let currentPhase = ''; // lobby/room/bidding/playing
let myTurn = false;
let mustPlay = false;
let landlordId = '';
let multiplier = 1;
let pingInterval = null;

// ===== Card Helpers =====
const SUITS = ['♠', '♥', '♣', '♦', ''];
const RANK_NAMES = { 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9', 10:'10', 11:'J', 12:'Q', 13:'K', 14:'A', 15:'2', 16:'🃏', 17:'🃏' };

function cardRankName(rank) {
    return RANK_NAMES[rank] || rank;
}

function cardSuitSymbol(suit) {
    return SUITS[suit] || '';
}

function cardColorClass(card) {
    if (card.rank >= 16) return card.rank === 17 ? 'joker-red' : 'joker-black';
    return (card.suit === 1 || card.suit === 3) ? 'red' : 'black';
}

function cardSortKey(card) {
    return card.rank * 10 + card.suit;
}

function sortHand(hand) {
    return hand.sort((a, b) => cardSortKey(a) - cardSortKey(b));
}

// ===== UI Helpers =====
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setStatus(msg) {
    document.getElementById('status-msg').textContent = msg;
}

function renderCard(card, small = false) {
    const cls = small ? 'card-small' : 'card';
    const colorCls = cardColorClass(card);
    const suit = cardSuitSymbol(card.suit);
    const rank = cardRankName(card.rank);
    return `<div class="${cls} ${colorCls}"><span>${rank}</span><span style="font-size:0.7em">${suit}</span></div>`;
}

function renderMyHand() {
    const container = document.getElementById('my-hand');
    container.innerHTML = myHand.map((card, i) => {
        const colorCls = cardColorClass(card);
        const sel = selectedCards.has(i) ? 'selected' : '';
        const suit = cardSuitSymbol(card.suit);
        const rank = cardRankName(card.rank);
        return `<div class="card ${colorCls} ${sel}" onclick="toggleCard(${i})"><span>${rank}</span><span style="font-size:0.7em">${suit}</span></div>`;
    }).join('');
}

function toggleCard(index) {
    if (!myTurn) return;
    if (selectedCards.has(index)) selectedCards.delete(index);
    else selectedCards.add(index);
    renderMyHand();
}

function renderPlayers() {
    // Find other players relative to me
    const mySeat = players.find(p => p.id === myId)?.seat ?? 0;
    const others = players.filter(p => p.id !== myId);

    // Position: left = next seat, top = seat after
    const leftPlayer = others.find(p => (p.seat - mySeat + 3) % 3 === 1) || others[0];
    const topPlayer = others.find(p => (p.seat - mySeat + 3) % 3 === 2) || others[1];

    if (leftPlayer) {
        document.getElementById('name-left').textContent = (leftPlayer.isLandlord ? '👑 ' : '') + (leftPlayer.name || '?');
        document.getElementById('count-left').textContent = leftPlayer.cardsCount ?? '?';
        const info = document.getElementById('player-left').querySelector('.player-info') || document.getElementById('player-left');
        info.classList.toggle('landlord', !!leftPlayer.isLandlord);
        info.classList.toggle('offline', !leftPlayer.online);
    }
    if (topPlayer) {
        document.getElementById('name-top').textContent = (topPlayer.isLandlord ? '👑 ' : '') + (topPlayer.name || '?');
        document.getElementById('count-top').textContent = topPlayer.cardsCount ?? '?';
        const info = document.getElementById('player-top').querySelector('.player-info') || document.getElementById('player-top');
        info.classList.toggle('landlord', !!topPlayer.isLandlord);
        info.classList.toggle('offline', !topPlayer.online);
    }
}

function showActionButtons(buttons) {
    const container = document.getElementById('action-buttons');
    container.innerHTML = buttons.map(b => `<button onclick="${b.action}">${b.label}</button>`).join('');
}

function clearPlayedCards() {
    ['played-top', 'played-left', 'played-me'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
}

function showPlayedCards(playerId, cards) {
    let targetId;
    if (playerId === myId) {
        targetId = 'played-me';
    } else {
        const mySeat = players.find(p => p.id === myId)?.seat ?? 0;
        const player = players.find(p => p.id === playerId);
        if (!player) return;
        const relSeat = (player.seat - mySeat + 3) % 3;
        targetId = relSeat === 1 ? 'played-left' : 'played-top';
    }
    const container = document.getElementById(targetId);
    if (cards && cards.length > 0) {
        container.innerHTML = cards.map(c => renderCard(c, true)).join('');
    } else {
        container.innerHTML = '<span style="color:#888">不出</span>';
    }
}

// ===== Connection =====
async function connect() {
    const url = document.getElementById('server-url').value.trim();
    const name = document.getElementById('player-name').value.trim();
    if (!url) { setStatus('请输入服务器地址'); return; }
    if (!name) { setStatus('请输入昵称'); return; }

    myName = name;
    setStatus('连接中...');
    document.getElementById('btn-connect').disabled = true;

    await initProto();

    try {
        ws = new WebSocket(url + '?name=' + encodeURIComponent(name));
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            setStatus('已连接');
            document.getElementById('lobby-actions').classList.remove('hidden');
            startPing();
        };

        ws.onmessage = (event) => {
            const msg = decodeMessage(event.data);
            handleMessage(msg);
        };

        ws.onclose = () => {
            setStatus('连接断开');
            document.getElementById('btn-connect').disabled = false;
            document.getElementById('lobby-actions').classList.add('hidden');
            stopPing();
        };

        ws.onerror = () => {
            setStatus('连接失败');
            document.getElementById('btn-connect').disabled = false;
        };
    } catch (e) {
        setStatus('连接错误: ' + e.message);
        document.getElementById('btn-connect').disabled = false;
    }
}

function send(type, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const data = encodeMessage(type, payload);
    ws.send(data);
}

function startPing() {
    pingInterval = setInterval(() => {
        send(MsgType.MSG_PING, { timestamp: Date.now() });
    }, 15000);
}

function stopPing() {
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

// ===== Actions =====
function quickMatch() { send(MsgType.MSG_QUICK_MATCH, null); setStatus('匹配中...'); }
function createRoom() { send(MsgType.MSG_CREATE_ROOM, null); }
function showJoinRoom() { document.getElementById('join-room-section').classList.toggle('hidden'); }
function joinRoom() {
    const code = document.getElementById('room-code-input').value.trim();
    if (code) send(MsgType.MSG_JOIN_ROOM, { roomCode: code });
}
function leaveRoom() { send(MsgType.MSG_LEAVE_ROOM, null); showView('lobby-view'); }
function toggleReady() {
    isReady = !isReady;
    send(isReady ? MsgType.MSG_READY : MsgType.MSG_CANCEL_READY, null);
    document.getElementById('btn-ready').textContent = isReady ? '取消准备' : '准备';
}

function bidYes() { send(MsgType.MSG_BID, { bid: true }); myTurn = false; showActionButtons([]); }
function bidNo() { send(MsgType.MSG_BID, { bid: false }); myTurn = false; showActionButtons([]); }

function playCards() {
    if (selectedCards.size === 0) return;
    const cards = [...selectedCards].map(i => myHand[i]);
    send(MsgType.MSG_PLAY_CARDS, { cards });
    myTurn = false;
    showActionButtons([]);
}

function passCards() {
    send(MsgType.MSG_PASS, null);
    myTurn = false;
    showActionButtons([]);
}

// ===== Message Handler =====
function handleMessage(msg) {
    const { type, payload } = msg;
    console.log('<<', msg.typeName, payload);

    switch (type) {
        case MsgType.MSG_CONNECTED:
            myId = payload.playerId;
            myName = payload.playerName;
            reconnectToken = payload.reconnectToken;
            setStatus(`欢迎, ${myName}!`);
            break;

        case MsgType.MSG_ONLINE_COUNT:
            document.getElementById('online-count').textContent = payload.count;
            break;

        case MsgType.MSG_ROOM_CREATED:
            roomCode = payload.roomCode;
            players = [payload.player];
            enterRoom();
            break;

        case MsgType.MSG_ROOM_JOINED:
            roomCode = payload.roomCode;
            players = payload.players || [];
            enterRoom();
            break;

        case MsgType.MSG_MATCH_FOUND:
            roomCode = payload.roomCode;
            players = payload.players || [];
            enterRoom();
            break;

        case MsgType.MSG_PLAYER_JOINED:
            players.push(payload.player);
            renderRoomPlayers();
            break;

        case MsgType.MSG_PLAYER_LEFT:
            players = players.filter(p => p.id !== payload.playerId);
            renderRoomPlayers();
            break;

        case MsgType.MSG_PLAYER_READY:
            const rp = players.find(p => p.id === payload.playerId);
            if (rp) rp.ready = payload.ready;
            renderRoomPlayers();
            break;

        case MsgType.MSG_GAME_START:
            players = payload.players;
            currentPhase = 'bidding';
            showView('game-view');
            clearPlayedCards();
            document.getElementById('game-info').textContent = '游戏开始!';
            document.getElementById('bottom-cards').innerHTML = '';
            document.getElementById('multiplier').textContent = '';
            renderPlayers();
            break;

        case MsgType.MSG_DEAL_CARDS:
            myHand = sortHand(payload.cards || []);
            selectedCards.clear();
            renderMyHand();
            break;

        case MsgType.MSG_BID_TURN:
            if (payload.playerId === myId) {
                myTurn = true;
                const label = payload.isGrab ? '抢地主' : '叫地主';
                document.getElementById('game-info').textContent = `轮到你${label}`;
                showActionButtons([
                    { label: payload.isGrab ? '🔥 抢' : '✋ 叫', action: 'bidYes()' },
                    { label: '不叫', action: 'bidNo()' }
                ]);
            } else {
                const p = players.find(p => p.id === payload.playerId);
                document.getElementById('game-info').textContent = `${p?.name || '?'} 正在决定...`;
            }
            if (payload.multiplier) {
                multiplier = payload.multiplier;
                document.getElementById('multiplier').textContent = `倍数: x${multiplier}`;
            }
            break;

        case MsgType.MSG_BID_RESULT: {
            const action = payload.bid ? (payload.isGrab ? '抢地主' : '叫地主') : (payload.isGrab ? '不抢' : '不叫');
            document.getElementById('game-info').textContent = `${payload.playerName} ${action}`;
            if (payload.multiplier) {
                multiplier = payload.multiplier;
                document.getElementById('multiplier').textContent = `倍数: x${multiplier}`;
            }
            break;
        }

        case MsgType.MSG_LANDLORD:
            landlordId = payload.playerId;
            players.forEach(p => p.isLandlord = (p.id === landlordId));
            renderPlayers();
            document.getElementById('game-info').textContent = `${payload.playerName} 是地主!`;
            // Show bottom cards
            if (payload.bottomCards && payload.bottomCards.length > 0) {
                document.getElementById('bottom-cards').innerHTML = '底牌: ' + payload.bottomCards.map(c => renderCard(c, true)).join('');
                // If I'm landlord, add bottom cards to my hand
                if (landlordId === myId) {
                    myHand = sortHand([...myHand, ...payload.bottomCards]);
                    renderMyHand();
                }
            }
            if (payload.multiplier) {
                multiplier = payload.multiplier;
                document.getElementById('multiplier').textContent = `倍数: x${multiplier}`;
            }
            currentPhase = 'playing';
            clearPlayedCards();
            break;

        case MsgType.MSG_PLAY_TURN:
            if (payload.playerId === myId) {
                myTurn = true;
                mustPlay = payload.mustPlay;
                document.getElementById('game-info').textContent = '轮到你出牌';
                const buttons = [{ label: '出牌', action: 'playCards()' }];
                if (!payload.mustPlay) buttons.push({ label: '不出', action: 'passCards()' });
                showActionButtons(buttons);
            } else {
                const p = players.find(p => p.id === payload.playerId);
                document.getElementById('game-info').textContent = `等待 ${p?.name || '?'} 出牌...`;
                showActionButtons([]);
            }
            break;

        case MsgType.MSG_CARD_PLAYED: {
            showPlayedCards(payload.playerId, payload.cards);
            // Update card count
            const cp = players.find(p => p.id === payload.playerId);
            if (cp) cp.cardsCount = payload.cardsLeft;
            renderPlayers();
            // Remove from my hand if it's me
            if (payload.playerId === myId && payload.cards) {
                removeCardsFromHand(payload.cards);
                renderMyHand();
            }
            if (payload.handType) {
                document.getElementById('game-info').textContent = `${payload.playerName}: ${payload.handType}`;
            }
            break;
        }

        case MsgType.MSG_PLAYER_PASS:
            showPlayedCards(payload.playerId, null);
            document.getElementById('game-info').textContent = `${payload.playerName} 不出`;
            break;

        case MsgType.MSG_GAME_OVER: {
            myTurn = false;
            showActionButtons([]);
            const isWin = payload.winnerId === myId;
            const role = payload.isLandlord ? '地主' : '农民';
            let resultText = `${payload.winnerName}(${role}) 获胜! 倍数: x${payload.multiplier}`;
            if (payload.scores && payload.scores.length > 0) {
                resultText += ' | ' + payload.scores.map(s => `${s.playerName}: ${s.score > 0 ? '+' : ''}${s.score}`).join(', ');
            }
            document.getElementById('game-info').innerHTML = `<strong style="color:${isWin ? '#4caf50' : '#e63946'}">${isWin ? '🎉 你赢了!' : '😢 你输了'}</strong><br>${resultText}`;
            // Show all hands
            if (payload.playerHands) {
                payload.playerHands.forEach(ph => {
                    if (ph.playerId !== myId && ph.cards) {
                        showPlayedCards(ph.playerId, ph.cards);
                    }
                });
            }
            // Return to room after delay
            setTimeout(() => {
                isReady = false;
                showView('room-view');
                document.getElementById('btn-ready').textContent = '准备';
                renderRoomPlayers();
            }, 5000);
            break;
        }

        case MsgType.MSG_PLAYER_OFFLINE: {
            const op = players.find(p => p.id === payload.playerId);
            if (op) op.online = false;
            renderPlayers();
            break;
        }

        case MsgType.MSG_PLAYER_ONLINE: {
            const onp = players.find(p => p.id === payload.playerId);
            if (onp) onp.online = true;
            renderPlayers();
            break;
        }

        case MsgType.MSG_ERROR:
            setStatus(`错误: ${payload.message}`);
            document.getElementById('game-info').textContent = `错误: ${payload.message}`;
            break;
    }
}

function removeCardsFromHand(playedCards) {
    // Remove played cards from myHand (match by rank+suit)
    const toRemove = [...playedCards];
    for (const card of toRemove) {
        const idx = myHand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (idx !== -1) myHand.splice(idx, 1);
    }
    selectedCards.clear();
}

function enterRoom() {
    document.getElementById('room-code').textContent = roomCode;
    renderRoomPlayers();
    showView('room-view');
    isReady = false;
    document.getElementById('btn-ready').textContent = '准备';
}

function renderRoomPlayers() {
    const container = document.getElementById('room-players');
    container.innerHTML = players.map(p => {
        const readyCls = p.ready ? 'ready' : '';
        const me = p.id === myId ? ' (我)' : '';
        return `<div class="room-player ${readyCls}">
            <div class="name">${p.name}${me}</div>
            <div class="state">${p.ready ? '✓ 已准备' : '等待中'}</div>
        </div>`;
    }).join('');
}
