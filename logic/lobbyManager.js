const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const gameGenerator = require('./gameGenerator');

class LobbyManager {
    async createLobby(hostNickname) {
        const lobbyId = uuidv4();
        const hostId = uuidv4();
        
        const lobby = {
            id: lobbyId,
            host_id: hostId,
            status: 'waiting',
            players: [
                {
                    id: hostId,
                    nickname: hostNickname,
                    online: true,
                    socketId: null,
                    revealedCharacteristics: [],
                    alive: true,
                    character: {}
                }
            ],
            gameData: null,
            createdAt: new Date().toISOString()
        };

        await this.saveLobby(lobbyId, lobby);
        return { lobbyId, hostId };
    }

    async getLobby(lobbyId) {
        const filePath = path.join(__dirname, '..', 'data', `lobby_${lobbyId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            // Очищаем данные от возможных невидимых символов
            const cleanData = data.replace(/^\uFEFF/, '').trim();
            return JSON.parse(cleanData);
        } catch (error) {
            console.error(`❌ Error reading lobby ${lobbyId}:`, error.message);
            throw new Error('Lobby not found');
        }
    }

    async saveLobby(lobbyId, lobby) {
        const filePath = path.join(__dirname, '..', 'data', `lobby_${lobbyId}.json`);
        const tempPath = filePath + '.tmp';
        
        try {
            // Сначала пишем во временный файл
            await fs.writeFile(tempPath, JSON.stringify(lobby, null, 2));
            // Затем атомарно переименовываем
            await fs.rename(tempPath, filePath);
            console.log(`💾 Lobby saved: ${lobbyId}`);
        } catch (error) {
            console.error(`❌ Error saving lobby ${lobbyId}:`, error);
            try { await fs.unlink(tempPath); } catch (e) {}
            throw error;
        }
    }

    // МЕТОД START GAME - ВОТ ОН!
    async startGame(lobbyId, gameDataFromClient) {
        console.log(`🎮 LobbyManager.startGame: ${lobbyId}`);
        
        const lobby = await this.getLobby(lobbyId);
        
        if (lobby.players.length < 6) {
            throw new Error('Нужно минимум 6 игроков для старта');
        }
        
        // Генерируем персонажей
        for (const player of lobby.players) {
            player.character = gameGenerator.generateCharacter(gameDataFromClient.playersData);
            player.revealedCharacteristics = [];
        }
        
        // Проверяем пол
        await this.validateGenders(lobby.players);
        
        // Места в бункере (50%, округление вниз)
        const bunkerSpaces = Math.floor(lobby.players.length * 0.5);
        
        // Выбираем случайную катастрофу и бункер
        const randomCatIndex = Math.floor(Math.random() * gameDataFromClient.catastrophes.length);
        const randomBunkerIndex = Math.floor(Math.random() * gameDataFromClient.bunkers.length);
        
        const catastrophe = gameDataFromClient.catastrophes[randomCatIndex];
        const bunker = gameDataFromClient.bunkers[randomBunkerIndex];
        
        lobby.gameData = {
            catastrophe: catastrophe,
            bunker: {
                ...bunker,
                spaces: bunkerSpaces
            }
        };
        
        lobby.status = 'playing';
        
        await this.saveLobby(lobbyId, lobby);
        console.log(`✅ Game started in ${lobbyId}`);
        
        return lobby; // Возвращаем весь lobby
    }

    async validateGenders(players) {
        const genders = players.map(p => p.character.gender);
        
        // Проверяем наличие мужского пола
        if (!genders.includes("Мужской")) {
            const randomPlayer = players.find(p => p.character.gender !== "Женский");
            if (randomPlayer) randomPlayer.character.gender = "Мужской";
        }
        
        // Проверяем наличие женского пола
        if (!genders.includes("Женский")) {
            const randomPlayer = players.find(p => p.character.gender !== "Мужской");
            if (randomPlayer) randomPlayer.character.gender = "Женский";
        }
        
        // Ограничиваем трансформеров (максимум 1)
        const transformerCount = genders.filter(g => g === "Трансформер").length;
        if (transformerCount > 1) {
            const transformerPlayers = players.filter(p => p.character.gender === "Трансформер");
            for (let i = 1; i < transformerPlayers.length; i++) {
                transformerPlayers[i].character.gender = Math.random() > 0.5 ? "Мужской" : "Женский";
            }
        }
    }

    async revealCharacteristic(lobbyId, playerId, field) {
        const lobby = await this.getLobby(lobbyId);
        const player = lobby.players.find(p => p.id === playerId);
        
        if (player) {
            if (!player.revealedCharacteristics) {
                player.revealedCharacteristics = [];
            }
            if (!player.revealedCharacteristics.includes(field)) {
                player.revealedCharacteristics.push(field);
            }
            await this.saveLobby(lobbyId, lobby);
        }
        return lobby;
    }
}

module.exports = new LobbyManager();