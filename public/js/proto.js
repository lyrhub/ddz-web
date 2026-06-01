/**
 * Protobuf message encoding/decoding for DDZ web client.
 * Mirrors the Go server's protocol.
 */

// Message type enum (matches server proto)
const MsgType = {
    // Client -> Server
    MSG_UNKNOWN: 0,
    MSG_RECONNECT: 1,
    MSG_PING: 2,
    MSG_CREATE_ROOM: 3,
    MSG_JOIN_ROOM: 4,
    MSG_LEAVE_ROOM: 5,
    MSG_QUICK_MATCH: 6,
    MSG_READY: 7,
    MSG_CANCEL_READY: 8,
    MSG_BID: 9,
    MSG_PLAY_CARDS: 10,
    MSG_PASS: 11,
    MSG_GET_STATS: 12,
    MSG_GET_LEADERBOARD: 13,
    MSG_GET_ROOM_LIST: 14,
    MSG_GET_ONLINE_COUNT: 15,
    MSG_CHAT: 16,
    MSG_GET_MAINTENANCE_STATUS: 17,
    MSG_PRACTICE_MATCH: 201,

    // Server -> Client
    MSG_CONNECTED: 100,
    MSG_RECONNECTED: 101,
    MSG_PONG: 102,
    MSG_PLAYER_OFFLINE: 103,
    MSG_PLAYER_ONLINE: 104,
    MSG_ONLINE_COUNT: 105,
    MSG_ROOM_CREATED: 106,
    MSG_ROOM_JOINED: 107,
    MSG_PLAYER_JOINED: 108,
    MSG_PLAYER_LEFT: 109,
    MSG_PLAYER_READY: 110,
    MSG_MATCH_FOUND: 111,
    MSG_GAME_START: 112,
    MSG_DEAL_CARDS: 113,
    MSG_BID_TURN: 114,
    MSG_BID_RESULT: 115,
    MSG_LANDLORD: 116,
    MSG_PLAY_TURN: 117,
    MSG_CARD_PLAYED: 118,
    MSG_PLAYER_PASS: 119,
    MSG_GAME_OVER: 120,
    MSG_ROUND_RESULT: 121,
    MSG_STATS_RESULT: 122,
    MSG_LEADERBOARD_RESULT: 123,
    MSG_ROOM_LIST_RESULT: 124,
    MSG_MAINTENANCE_STATUS: 125,
    MSG_MAINTENANCE: 126,
    MSG_ERROR: 200,
};

// Reverse lookup
const MsgTypeName = {};
for (const [k, v] of Object.entries(MsgType)) { MsgTypeName[v] = k; }

// We'll build protobuf types dynamically using protobuf.js
let protoRoot = null;
let MessageProto = null;

async function initProto() {
    // Define the proto schema inline (matching server's proto files)
    const protoJson = {
        nested: {
            protocol: {
                nested: {
                    MessageType: {
                        values: MsgType
                    },
                    Message: {
                        fields: {
                            type: { type: "MessageType", id: 1 },
                            payload: { type: "bytes", id: 2 }
                        }
                    },
                    // Common
                    CardInfo: {
                        fields: {
                            suit: { type: "int64", id: 1 },
                            rank: { type: "int64", id: 2 },
                            color: { type: "int64", id: 3 }
                        }
                    },
                    PlayerInfo: {
                        fields: {
                            id: { type: "string", id: 1 },
                            name: { type: "string", id: 2 },
                            seat: { type: "int64", id: 3 },
                            ready: { type: "bool", id: 4 },
                            isLandlord: { type: "bool", id: 5 },
                            cardsCount: { type: "int64", id: 6 },
                            online: { type: "bool", id: 7 }
                        }
                    },
                    PlayerHand: {
                        fields: {
                            playerId: { type: "string", id: 1 },
                            playerName: { type: "string", id: 2 },
                            cards: { rule: "repeated", type: "CardInfo", id: 3 }
                        }
                    },
                    PlayerScore: {
                        fields: {
                            playerId: { type: "string", id: 1 },
                            playerName: { type: "string", id: 2 },
                            isLandlord: { type: "bool", id: 3 },
                            score: { type: "int64", id: 4 }
                        }
                    },
                    // Client messages
                    JoinRoomPayload: {
                        fields: { roomCode: { type: "string", id: 1 } }
                    },
                    BidPayload: {
                        fields: { bid: { type: "bool", id: 1 } }
                    },
                    PlayCardsPayload: {
                        fields: { cards: { rule: "repeated", type: "CardInfo", id: 1 } }
                    },
                    ReconnectPayload: {
                        fields: { token: { type: "string", id: 1 }, playerId: { type: "string", id: 2 } }
                    },
                    PingPayload: {
                        fields: { timestamp: { type: "int64", id: 1 } }
                    },
                    // Server messages
                    ConnectedPayload: {
                        fields: {
                            playerId: { type: "string", id: 1 },
                            playerName: { type: "string", id: 2 },
                            reconnectToken: { type: "string", id: 3 }
                        }
                    },
                    ReconnectedPayload: {
                        fields: {
                            playerId: { type: "string", id: 1 },
                            playerName: { type: "string", id: 2 },
                            roomCode: { type: "string", id: 3 },
                            gameState: { type: "GameStateDTO", id: 4 }
                        }
                    },
                    PongPayload: {
                        fields: { clientTimestamp: { type: "int64", id: 1 }, serverTimestamp: { type: "int64", id: 2 } }
                    },
                    PlayerOfflinePayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 }, timeout: { type: "int64", id: 3 } }
                    },
                    PlayerOnlinePayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 } }
                    },
                    OnlineCountPayload: {
                        fields: { count: { type: "int64", id: 1 } }
                    },
                    ErrorPayload: {
                        fields: { code: { type: "int64", id: 1 }, message: { type: "string", id: 2 } }
                    },
                    RoomCreatedPayload: {
                        fields: { roomCode: { type: "string", id: 1 }, player: { type: "PlayerInfo", id: 2 } }
                    },
                    RoomJoinedPayload: {
                        fields: { roomCode: { type: "string", id: 1 }, player: { type: "PlayerInfo", id: 2 }, players: { rule: "repeated", type: "PlayerInfo", id: 3 } }
                    },
                    PlayerJoinedPayload: {
                        fields: { player: { type: "PlayerInfo", id: 1 } }
                    },
                    PlayerLeftPayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 } }
                    },
                    PlayerReadyPayload: {
                        fields: { playerId: { type: "string", id: 1 }, ready: { type: "bool", id: 2 } }
                    },
                    GameStartPayload: {
                        fields: { players: { rule: "repeated", type: "PlayerInfo", id: 1 } }
                    },
                    DealCardsPayload: {
                        fields: { cards: { rule: "repeated", type: "CardInfo", id: 1 }, bottomCards: { rule: "repeated", type: "CardInfo", id: 2 } }
                    },
                    BidTurnPayload: {
                        fields: { playerId: { type: "string", id: 1 }, timeout: { type: "int64", id: 2 }, isGrab: { type: "bool", id: 3 }, multiplier: { type: "int64", id: 4 } }
                    },
                    BidResultPayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 }, bid: { type: "bool", id: 3 }, isGrab: { type: "bool", id: 4 }, multiplier: { type: "int64", id: 5 } }
                    },
                    LandlordPayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 }, bottomCards: { rule: "repeated", type: "CardInfo", id: 3 }, multiplier: { type: "int64", id: 4 } }
                    },
                    PlayTurnPayload: {
                        fields: { playerId: { type: "string", id: 1 }, timeout: { type: "int64", id: 2 }, mustPlay: { type: "bool", id: 3 }, canBeat: { type: "bool", id: 4 } }
                    },
                    CardPlayedPayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 }, cards: { rule: "repeated", type: "CardInfo", id: 3 }, cardsLeft: { type: "int64", id: 4 }, handType: { type: "string", id: 5 } }
                    },
                    PlayerPassPayload: {
                        fields: { playerId: { type: "string", id: 1 }, playerName: { type: "string", id: 2 } }
                    },
                    GameOverPayload: {
                        fields: {
                            winnerId: { type: "string", id: 1 },
                            winnerName: { type: "string", id: 2 },
                            isLandlord: { type: "bool", id: 3 },
                            playerHands: { rule: "repeated", type: "PlayerHand", id: 4 },
                            multiplier: { type: "int64", id: 5 },
                            scores: { rule: "repeated", type: "PlayerScore", id: 6 }
                        }
                    },
                    MatchFoundPayload: {
                        fields: { roomCode: { type: "string", id: 1 }, players: { rule: "repeated", type: "PlayerInfo", id: 2 } }
                    },
                    GameStateDTO: {
                        fields: {
                            phase: { type: "string", id: 1 },
                            players: { rule: "repeated", type: "PlayerInfo", id: 2 },
                            hand: { rule: "repeated", type: "CardInfo", id: 3 },
                            bottomCards: { rule: "repeated", type: "CardInfo", id: 4 },
                            currentTurn: { type: "string", id: 5 },
                            lastPlayed: { rule: "repeated", type: "CardInfo", id: 6 },
                            lastPlayerId: { type: "string", id: 7 },
                            mustPlay: { type: "bool", id: 8 },
                            canBeat: { type: "bool", id: 9 }
                        }
                    }
                }
            }
        }
    };

    protoRoot = protobuf.Root.fromJSON(protoJson);
    MessageProto = protoRoot.lookupType("protocol.Message");
}

// Payload type mapping for decoding server messages
const payloadTypeMap = {
    [MsgType.MSG_CONNECTED]: "protocol.ConnectedPayload",
    [MsgType.MSG_RECONNECTED]: "protocol.ReconnectedPayload",
    [MsgType.MSG_PONG]: "protocol.PongPayload",
    [MsgType.MSG_PLAYER_OFFLINE]: "protocol.PlayerOfflinePayload",
    [MsgType.MSG_PLAYER_ONLINE]: "protocol.PlayerOnlinePayload",
    [MsgType.MSG_ONLINE_COUNT]: "protocol.OnlineCountPayload",
    [MsgType.MSG_ROOM_CREATED]: "protocol.RoomCreatedPayload",
    [MsgType.MSG_ROOM_JOINED]: "protocol.RoomJoinedPayload",
    [MsgType.MSG_PLAYER_JOINED]: "protocol.PlayerJoinedPayload",
    [MsgType.MSG_PLAYER_LEFT]: "protocol.PlayerLeftPayload",
    [MsgType.MSG_PLAYER_READY]: "protocol.PlayerReadyPayload",
    [MsgType.MSG_MATCH_FOUND]: "protocol.MatchFoundPayload",
    [MsgType.MSG_GAME_START]: "protocol.GameStartPayload",
    [MsgType.MSG_DEAL_CARDS]: "protocol.DealCardsPayload",
    [MsgType.MSG_BID_TURN]: "protocol.BidTurnPayload",
    [MsgType.MSG_BID_RESULT]: "protocol.BidResultPayload",
    [MsgType.MSG_LANDLORD]: "protocol.LandlordPayload",
    [MsgType.MSG_PLAY_TURN]: "protocol.PlayTurnPayload",
    [MsgType.MSG_CARD_PLAYED]: "protocol.CardPlayedPayload",
    [MsgType.MSG_PLAYER_PASS]: "protocol.PlayerPassPayload",
    [MsgType.MSG_GAME_OVER]: "protocol.GameOverPayload",
    [MsgType.MSG_ERROR]: "protocol.ErrorPayload",
};

function encodeMessage(type, payloadObj) {
    let payloadBytes = new Uint8Array(0);
    if (payloadObj) {
        const payloadTypeName = getClientPayloadType(type);
        if (payloadTypeName) {
            const PayloadType = protoRoot.lookupType(payloadTypeName);
            payloadBytes = PayloadType.encode(PayloadType.create(payloadObj)).finish();
        }
    }
    const msg = MessageProto.create({ type, payload: payloadBytes });
    return MessageProto.encode(msg).finish();
}

function decodeMessage(buffer) {
    const msg = MessageProto.decode(new Uint8Array(buffer));
    const typeName = payloadTypeMap[msg.type];
    let payload = null;
    if (typeName && msg.payload && msg.payload.length > 0) {
        const PayloadType = protoRoot.lookupType(typeName);
        payload = PayloadType.decode(msg.payload);
        payload = PayloadType.toObject(payload, { longs: Number, defaults: true });
    }
    return { type: msg.type, typeName: MsgTypeName[msg.type], payload };
}

function getClientPayloadType(type) {
    const map = {
        [MsgType.MSG_JOIN_ROOM]: "protocol.JoinRoomPayload",
        [MsgType.MSG_BID]: "protocol.BidPayload",
        [MsgType.MSG_PLAY_CARDS]: "protocol.PlayCardsPayload",
        [MsgType.MSG_RECONNECT]: "protocol.ReconnectPayload",
        [MsgType.MSG_PING]: "protocol.PingPayload",
    };
    return map[type] || null;
}
