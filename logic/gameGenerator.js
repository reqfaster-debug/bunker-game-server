class GameGenerator {
    generateAge() {
        return Math.floor(Math.random() * (90 - 18 + 1)) + 18;
    }

    generateGender() {
        const rand = Math.random();
        if (rand < 0.45) return "Мужской";
        if (rand < 0.9) return "Женский";
        return "Трансформер";
    }

    generateBodyType() {
        const types = ["Худое", "Атлетическое", "Полное", "Ожирение-сильное"];
        return types[Math.floor(Math.random() * types.length)];
    }

    generateExperience(age) {
        if (age <= 24) {
            return Math.floor(Math.random() * (age / 8)) + 1;
        } else {
            return Math.floor(Math.random() * (age / 5)) + 1;
        }
    }

    generateCharacter(playersData) {
        const age = this.generateAge();
        const gender = this.generateGender();
        
        return {
            age: age,
            gender: gender,
            body_type: this.generateBodyType(),
            trait: playersData.traits[Math.floor(Math.random() * playersData.traits.length)],
            profession: playersData.professions[Math.floor(Math.random() * playersData.professions.length)],
            experience_years: this.generateExperience(age),
            hobby: playersData.hobby[Math.floor(Math.random() * playersData.hobby.length)],
            health: playersData.health[Math.floor(Math.random() * playersData.health.length)],
            inventory: playersData.inventory[Math.floor(Math.random() * playersData.inventory.length)],
            phobia: playersData.phobia[Math.floor(Math.random() * playersData.phobia.length)],
            extra: playersData.extra[Math.floor(Math.random() * playersData.extra.length)]
        };
    }

    generateGameData(catastrophes, bunkers, bunkerSpaces) {
        // Выбираем случайную катастрофу и бункер
        const catastrophe = catastrophes[Math.floor(Math.random() * catastrophes.length)];
        const bunker = bunkers[Math.floor(Math.random() * bunkers.length)];
        
        // Добавляем информацию о местах в бункере
        return {
            catastrophe: catastrophe,
            bunker: {
                ...bunker,
                spaces: bunkerSpaces  // 👈 Добавляем количество мест
            }
        };
    }
}

module.exports = new GameGenerator();