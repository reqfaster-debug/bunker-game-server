const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.IO
const io = new Server(server, {
    cors: {
        origin: [
            'https://bunker-game.netlify.app',  // Ваш Netlify URL
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'https://bunker-game.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(express.json());

// Health check endpoint (для проверки работы сервера)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Server is running' 
    });
});

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
        console.log('Data directory exists');
    } catch {
        await fs.mkdir(dataDir);
        console.log('Created data directory');
    }
}

// Routes
const lobbyRoutes = require('./routes/lobby');
const gameRoutes = require('./routes/game');

app.use('/api/lobby', lobbyRoutes);
app.use('/api/game', gameRoutes);

// Socket.IO connection handling
const lobbyManager = require('./logic/lobbyManager');

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id, 'IP:', socket.handshake.address);

    socket.on('join_lobby', async ({ lobbyId, playerId, nickname }) => {
        console.log(`📥 join_lobby: ${lobbyId}, player: ${playerId}, nickname: ${nickname}`);
        try {
            socket.join(lobbyId);
            const player = await lobbyManager.joinLobby(lobbyId, playerId, nickname, socket.id);
            console.log(`✅ Player joined: ${player.nickname} (${player.id})`);
            
            // Уведомляем всех в лобби
            io.to(lobbyId).emit('player_joined', player);
            
            // Отправляем текущее состояние лобби новому игроку
            const lobby = await lobbyManager.getLobby(lobbyId);
            socket.emit('lobby_state', lobby);
            
            console.log(`📤 Sent lobby_state to ${socket.id}`);
        } catch (error) {
            console.error('❌ join_lobby error:', error.message);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('reconnect_to_lobby', async ({ lobbyId, playerId }) => {
        try {
            socket.join(lobbyId);
            const player = await lobbyManager.reconnectPlayer(lobbyId, playerId, socket.id);
            io.to(lobbyId).emit('player_reconnected', player);
            console.log(`✅ Player reconnected: ${player.nickname}`);
        } catch (error) {
            console.error('❌ reconnect error:', error.message);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('start_game', async ({ lobbyId, gameDataFromClient }) => {
        try {
            console.log(`🎮 Starting game in lobby ${lobbyId}`);
            const gameData = await lobbyManager.startGame(lobbyId, gameDataFromClient);
            io.to(lobbyId).emit('game_started', gameData);
            console.log(`✅ Game started in lobby ${lobbyId}`);
        } catch (error) {
            console.error('❌ start_game error:', error.message);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('reveal_character', async ({ lobbyId, playerId }) => {
        try {
            await lobbyManager.revealCharacter(lobbyId, playerId);
            io.to(lobbyId).emit('character_revealed', { playerId });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('start_voting', ({ lobbyId, duration = 15 }) => {
        io.to(lobbyId).emit('voting_started', { duration });
    });

    socket.on('end_voting', ({ lobbyId }) => {
        io.to(lobbyId).emit('voting_ended');
    });

    socket.on('vote', ({ lobbyId, voterId, targetId }) => {
        io.to(lobbyId).emit('vote_cast', { voterId, targetId });
    });

    socket.on('update_nickname', async ({ lobbyId, playerId, newNickname }) => {
        try {
            if (!newNickname || newNickname.length > 20) {
                socket.emit('error', { message: 'Ник должен быть от 1 до 20 символов' });
                return;
            }
            
            const lobby = await lobbyManager.getLobby(lobbyId);
            const player = lobby.players.find(p => p.id === playerId);
            
            if (player) {
                player.nickname = newNickname;
                await lobbyManager.saveLobby(lobbyId, lobby);
                io.to(lobbyId).emit('player_updated', { 
                    id: playerId, 
                    nickname: newNickname 
                });
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', async () => {
        console.log('❌ Client disconnected:', socket.id);
        try {
            await lobbyManager.handleDisconnect(socket.id);
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    });
});

// Start server
async function start() {
    await ensureDataDirectory();
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 WebSocket server ready`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
}

start();