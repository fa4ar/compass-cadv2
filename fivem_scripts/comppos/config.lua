-- ============================================
-- Component Position Editor - Configuration
-- ============================================

-- Кости для крепления пропов к компонентам одежды
Config = {}

Config.Bones = {
    [1] = { name = "SKEL_Head", hash = 31086 },           -- Маска
    [3] = { name = "SKEL_Spine3", hash = 24816 },         -- Торс
    [4] = { name = "SKEL_Pelvis", hash = 11816 },         -- Штаны
    [6] = { name = "SKEL_L_Foot", hash = 14201 },         -- Обувь
    [7] = { name = "SKEL_Neck_1", hash = 39317 },         -- Аксессуары
    [8] = { name = "SKEL_Spine2", hash = 24817 },         -- Сумки
    [9] = { name = "SKEL_Spine1", hash = 24818 },         -- Броня
    [11] = { name = "SKEL_Spine3", hash = 24816 },        -- Верх
}

-- Маппинг компонентов одежды на пропы
-- namePattern: шаблон для динамической загрузки пропов по drawable ID
-- {drawable} заменяется на номер drawable компонента
-- Если проп не найден по pattern, используется fallback
Config.ComponentToProp = {
    [1] = {  -- Маски
        namePattern = "p_mask_{drawable}",
        fallback = "prop_sphere_01"
    },
    [3] = {  -- Торс
        namePattern = "p_torso_{drawable}",
        fallback = "prop_cylinder_01"
    },
    [4] = {  -- Штаны
        namePattern = "p_legs_{drawable}",
        fallback = "prop_box_01a"
    },
    [6] = {  -- Обувь
        namePattern = "p_feet_{drawable}",
        fallback = "prop_sphere_01"
    },
    [7] = {  -- Аксессуары
        namePattern = "p_accessory_{drawable}",
        fallback = "prop_security_case_01"
    },
    [8] = {  -- Сумки
        namePattern = "p_bag_{drawable}",
        fallback = "prop_cs_heist_bag"
    },
    [9] = {  -- Броня
        namePattern = "p_armor_{drawable}",
        fallback = "prop_cylinder_01"
    },
    [11] = {  -- Верх
        namePattern = "p_upper_{drawable}",
        fallback = "prop_cylinder_01"
    }
}

-- Названия слотов для отображения в UI
Config.SlotNames = {
    [1] = "Маска",
    [3] = "Торс",
    [4] = "Штаны",
    [6] = "Обувь",
    [7] = "Аксессуары",
    [8] = "Сумки",
    [9] = "Броня",
    [11] = "Верх"
}

-- Настройки редактирования
Config.EditSettings = {
    moveSpeed = 0.01,           -- Базовая скорость движения
    rotateSpeed = 1.0,          -- Базовая скорость вращения (градусы)
    fastMultiplier = 3.0,       -- Множитель скорости при зажатом Ctrl
    uiPosition = { x = 0.5, y = 0.1 },  -- Позиция текста на экране
}
