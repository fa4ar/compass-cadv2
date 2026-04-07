CompPos = CompPos or {}

CompPos.Config = {
    allowedComponents = {
        [0] = "face",              -- Face
        [1] = "mask",              -- Mask
        [2] = "hair",              -- Hair
        [3] = "torso",             -- Torso
        [4] = "leg",              -- Leg
        [5] = "parachute",        -- Parachute / bag
        [6] = "shoes",            -- Shoes
        [7] = "accessory",        -- Accessory
        [8] = "undershirt",       -- Undershirt
        [9] = "kevlar",           -- Kevlar
        [10] = "badge",            -- Badge
        [11] = "torso_2",         -- Torso 2
    },

    blockedComponents = {
        [3] = "torso",            -- Torso (заблокировано)
        [4] = "leg",              -- Leg (заблокировано)
        [5] = "parachute",        -- Parachute/bag (заблокировано)
        [6] = "shoes",            -- Shoes (заблокировано)
    },

    componentNames = {
        [0] = "Лицо",
        [1] = "Маска",
        [2] = "Волосы",
        [3] = "Верх",
        [4] = "Ноги",
        [5] = "Парашют/Сумка",
        [6] = "Обувь",
        [7] = "Аксессуар",
        [8] = "Майка",
        [9] = "Бронежилет",
        [10] = "Бейдж",
        [11] = "Верх 2",
    },

    defaultPositions = {},

    syncInterval = 500,

    controlKeys = {
        moveForward = 32,
        moveBackward = 33,
        moveLeft = 34,
        moveRight = 35,
        rotateLeft = 36,
        rotateRight = 37,
        scaleUp = 38,
        scaleDown = 39,
        save = 44,
        reset = 45,
        exit = 47,
        moveUp = 74,
        moveDown = 75,
    },

    moveSpeed = 0.005,
    rotateSpeed = 1.0,
    scaleSpeed = 0.01,

    uiScale = 1.0,
    uiFont = "Segoe UI",
}
