const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 10000;  // Render использует динамический порт

// Настройка CORS для Socket.IO - разрешаем ВСЕ источники для теста
const io = new Server(server, {
    cors: {
        origin: '*',  // Временно разрешаем все источники
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: '*',  // Временно разрешаем все источники
    credentials: true
}));

app.use(express.json());

// Убираем CSP заголовки
app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    next();
});

// Favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check - ВАЖНО: этот endpoint должен быть доступен
app.get('/health', (req, res) => {
    console.log('Health check called from:', req.headers.origin);
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Server is running',
        port: PORT,
        headers: req.headers
    });
});

// Routes
const lobbyRoutes = require('./routes/lobby');
const gameRoutes = require('./routes/game');

app.use('/api/lobby', lobbyRoutes);
app.use('/api/game', gameRoutes);

// Socket.IO
const lobbyManager = require('./logic/lobbyManager');

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id, 'Origin:', socket.handshake.headers.origin);

    socket.on('join_lobby', async ({ lobbyId, playerId, nickname }) => {
        try {
            socket.join(lobbyId);
            const player = await lobbyManager.joinLobby(lobbyId, playerId, nickname, socket.id);
            io.to(lobbyId).emit('player_joined', player);
            const lobby = await lobbyManager.getLobby(lobbyId);
            socket.emit('lobby_state', lobby);
        } catch (error) {
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

async function start() {
    try {
        // Создаем папку data если её нет
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir);
        }

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🔗 Health check: https://bunker-game-server.onrender.com/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

start();