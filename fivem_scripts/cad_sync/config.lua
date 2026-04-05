Config = {}

-- URL вашего API CAD (Укажите реальный IP бэкенда)
Config.ApiUrl = "http://localhost:4000/api/fivem"

-- Интервал обновления карты (в миллисекундах)
Config.MapUpdateInterval = 5000 -- 5 секунд

-- Настройки работ для определения типа блипа
Config.PoliceJobName = "police"
Config.EmsJobName = "ambulance"
Config.FireJobName = "fire"
Config.DotJobName = "mechanic" -- Или "dot", если у вас такая работа в игре

-- Куда будет приходить вызов (рация/чат/уведомление)
Config.NotifyJobOnly = true -- Присылать вызовы только фракциям (если есть фреймворк)

-- Настройки сопоставления цветов (только для гос. служб)
Config.Colors = {
    police = "#3b82f6",    -- Синий (Полиция)
    ambulance = "#ef4444", -- Красный (Скорая/Пожарные)
    fire = "#f97316",      -- Оранжевый (Пожарные)
    dot = "#eab308",       -- Желтый (DOT / Тех. служба)
    dispatch = "#8b5cf6"   -- Фиолетовый (Диспетчер)
}

-- Использовать ли фреймворки (ESX, QB-Core или Standalone)
Config.Framework = "Standalone" -- "ESX", "QBCore" или "Standalone"
