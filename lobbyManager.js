const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const gameGenerator = require('./gameGenerator'); // Импортируем gameGenerator

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
                    revealedCharacteristics: [], // Массив раскрытых характеристик
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
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Lobby not found');
        }
    }

    async saveLobby(lobbyId, lobby) {
        const filePath = path.join(__dirname, '..', 'data', `lobby_${lobbyId}.json`);
        await fs.writeFile(filePath, JSON.stringify(lobby, null, 2));
        console.log(`💾 Lobby saved: ${lobbyId}`);
    }

    // МЕТОД START GAME - здесь вся логика
    async startGame(lobbyId, gameDataFromClient) {
        console.log(`🎮 LobbyManager.startGame: ${lobbyId}`);
        
        const lobby = await this.getLobby(lobbyId);
        
        if (lobby.players.length < 6) {
            throw new Error('Нужно минимум 6 игроков');
        }
        
        // Генерируем персонажей используя gameGenerator
        for (const player of lobby.players) {
            player.character = gameGenerator.generateCharacter(gameDataFromClient.playersData);
            player.revealedCharacteristics = []; // Массив для раскрытых характеристик
        }
        
        // Проверяем пол
        const genders = lobby.players.map(p => p.character.gender);
        if (!genders.includes("Мужской")) {
            const randomPlayer = lobby.players.find(p => p.character.gender !== "Женский");
            if (randomPlayer) randomPlayer.character.gender = "Мужской";
        }
        if (!genders.includes("Женский")) {
            const randomPlayer = lobby.players.find(p => p.character.gender !== "Мужской");
            if (randomPlayer) randomPlayer.character.gender = "Женский";
        }
        
        // Ограничиваем трансформеров
        const transformerCount = genders.filter(g => g === "Трансформер").length;
        if (transformerCount > 1) {
            const transformerPlayers = lobby.players.filter(p => p.character.gender === "Трансформер");
            for (let i = 1; i < transformerPlayers.length; i++) {
                transformerPlayers[i].character.gender = Math.random() > 0.5 ? "Мужской" : "Женский";
            }
        }
        
        // Места в бункере (50%, округление вниз)
        const bunkerSpaces = Math.floor(lobby.players.length * 0.5);
        
        // Данные игры
        const catastrophe = gameDataFromClient.catastrophes[Math.floor(Math.random() * gameDataFromClient.catastrophes.length)];
        const bunker = gameDataFromClient.bunkers[Math.floor(Math.random() * gameDataFromClient.bunkers.length)];
        
        lobby.gameData = {
            catastrophe,
            bunker: {
                ...bunker,
                spaces: bunkerSpaces
            }
        };
        
        lobby.status = 'playing';
        
        await this.saveLobby(lobbyId, lobby);
        
        return lobby.gameData;
    }

    // Метод для раскрытия характеристики
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