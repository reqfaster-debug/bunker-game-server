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
        const types = ["Худощавое", "Атлетическое", "Среднее", "Плотное", "Полное", "Ожирение"];
        return types[Math.floor(Math.random() * types.length)];
    }

    generateExperience(age) {
        const maxExperience = age <= 24 ? Math.floor(age / 8) : Math.floor(age / 4);
        return Math.floor(Math.random() * maxExperience) + 1;
    }

    generateHealthSeverity() {
        const severities = ["легкая", "средняя", "тяжелая", "критическая"];
        return severities[Math.floor(Math.random() * severities.length)];
    }

    // ВСТРОЕННЫЕ ДАННЫЕ НА СЛУЧАЙ, ЕСЛИ playersData ПУСТОЙ
    getDefaultData() {
        return {
            traits: [
                "Храбрый", "Трусливый", "Агрессивный", "Спокойный", 
                "Добрый", "Злой", "Хитрый", "Честный", "Лживый",
                "Оптимист", "Пессимист", "Щедрый", "Жадный"
            ],
            hobby: [
                "Рыбалка", "Охота", "Чтение", "Спорт", "Музыка", 
                "Рисование", "Кулинария", "Садоводство", "Шахматы",
                "Фотография", "Путешествия", "Коллекционирование"
            ],
            health: [
                "Здоров", "Диабет", "Астма", "Гипертония", "Аллергия",
                "Проблемы с сердцем", "Артрит", "Гастрит", "Мигрень"
            ],
            inventory: [
                "Аптечка", "Нож", "Фонарик", "Веревка", "Спички", 
                "Консервы", "Палатка", "Компас", "Топор", "Рация",
                "Бинокль", "Карта", "Фляга"
            ],
            phobia: [
                "Клаустрофобия", "Арахнофобия", "Акрофобия", "Нет фобий", 
                "Социофобия", "Агорафобия", "Темнота", "Высота"
            ],
            extra: [
                "Водительские права", "Знание языков", "Навыки выживания", 
                "Медицинское образование", "Техническое образование", "Пилот",
                "Дайвер", "Альпинист", "Охранник"
            ],
            professions: [
                { name: "Врач", description: "Может лечить" },
                { name: "Инженер", description: "Может чинить" },
                { name: "Учитель", description: "Может обучать" },
                { name: "Строитель", description: "Может строить" },
                { name: "Военный", description: "Владеет оружием" },
                { name: "Полицейский", description: "Знает законы" },
                { name: "Программист", description: "Работа с ПК" },
                { name: "Водитель", description: "Умеет водить" },
                { name: "Повар", description: "Вкусно готовит" },
                { name: "Фермер", description: "Умеет выращивать" }
            ]
        };
    }

    generateCharacter(playersData) {
        console.log('🎲 Generating character with data:', playersData);
        
        const age = this.generateAge();
        const gender = this.generateGender();
        const healthSeverity = this.generateHealthSeverity();
        const experience = this.generateExperience(age);
        
        // Используем встроенные данные по умолчанию
        const defaultData = this.getDefaultData();
        
        // Объединяем полученные данные с дефолтными
        const data = {
            traits: playersData?.traits?.length ? playersData.traits : defaultData.traits,
            hobby: playersData?.hobby?.length ? playersData.hobby : defaultData.hobby,
            health: playersData?.health?.length ? playersData.health : defaultData.health,
            inventory: playersData?.inventory?.length ? playersData.inventory : defaultData.inventory,
            phobia: playersData?.phobia?.length ? playersData.phobia : defaultData.phobia,
            extra: playersData?.extra?.length ? playersData.extra : defaultData.extra,
            professions: playersData?.professions?.length ? playersData.professions : defaultData.professions
        };
        
        console.log('📊 Using data sources:', {
            traits: data.traits.length,
            hobby: data.hobby.length,
            health: data.health.length,
            inventory: data.inventory.length,
            phobia: data.phobia.length,
            extra: data.extra.length,
            professions: data.professions.length
        });
        
        // Выбираем случайные значения
        const trait = data.traits[Math.floor(Math.random() * data.traits.length)];
        const hobby = data.hobby[Math.floor(Math.random() * data.hobby.length)];
        const healthCondition = data.health[Math.floor(Math.random() * data.health.length)];
        const inventory = data.inventory[Math.floor(Math.random() * data.inventory.length)];
        const phobia = data.phobia[Math.floor(Math.random() * data.phobia.length)];
        const extra = data.extra[Math.floor(Math.random() * data.extra.length)];
        
        // Выбираем профессию
        const profession = data.professions[Math.floor(Math.random() * data.professions.length)];
        
        const character = {
            age: age,
            gender: gender,
            body_type: this.generateBodyType(),
            trait: trait,
            profession: {
                name: profession.name || "Неизвестно",
                description: profession.description || "",
                experience: experience
            },
            hobby: hobby,
            health: {
                condition: healthCondition,
                severity: healthSeverity
            },
            inventory: inventory,
            phobia: phobia,
            extra: extra
        };
        
        console.log('✅ Generated character:', character);
        return character;
    }

    generateGameData(catastrophes, bunkers, bunkerSpaces) {
        const catastrophe = catastrophes[Math.floor(Math.random() * catastrophes.length)];
        const bunker = bunkers[Math.floor(Math.random() * bunkers.length)];
        
        return {
            catastrophe: catastrophe,
            bunker: {
                ...bunker,
                spaces: bunkerSpaces
            }
        };
    }
}

module.exports = new GameGenerator();