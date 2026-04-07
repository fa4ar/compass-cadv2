# Compass Police Panel - FiveM Resource

Полицейская панель для отображения информации о вызовах 911 в FiveM.

## 📁 Структура

```
fivem/police-panel/
├── fxmanifest.lua          # Манифест ресурса
├── server.lua               # Серверная часть
├── client.lua              # Клиентская часть
├── html/
│   ├── index.html          # HTML контейнер
│   ├── css/
│   │   └── styles.css      # Стили UI
│   └── js/
│       └── app.js          # JavaScript логика UI
└── assets/
    └── sounds/             # Звуковые файлы (опционально)
```

## 🚀 Установка

1. Скопируйте папку `police-panel` в директорию ресурсов вашего сервера
2. Добавьте в `server.cfg`:
   ```
   start compass-police-panel
   ```
3. (Опционально) Настройте API URL в `server.lua` если используете синхронизацию с CAD

## 🎮 Команды

| Команда | Описание |
|---------|----------|
| `/911test` | Показать тестовый вызов 911 |
| `/compass:attach <id>` | Прикрепиться к вызову |
| `/compass:close <id>` | Закрыть вызов |
| `/compass:toggle` | Показать/скрыть панель |
| `F5` | Показать/скрыть панель |

## 🎨 Функционал

### UI Панель (слева экрана)
- Компактный информационный блок с данными вызова
- Отображение: тип, местоположение, описание, приоритет, время
- Визуальные индикаторы приоритета (цвет рамки)
- Статус кнопки (dispatched → enroute → onscene → resolved)
- Список прикрепленных офицеров
- Кнопка навигации (GPS)
- Кнопка закрытия вызова

### Визуальные индикаторы
- 🔴 Пульсация для экстренного приоритета
- 🔵 Мигание при обновлении данных
- Цветовая кодировка статусов

### Звуковые оповещения
- Звук при новом вызове
- Звук при обновлении (с защитой от спама 5 сек)

### Синхронизация
- Реальное время обновление данных
- Синхронизация между всеми прикрепленными офицерами
- Уведомление о присоединении/откреплении офицеров

## ⚙️ Конфигурация (server.lua)

```lua
Config = {
    apiUrl = "http://localhost:3000",  -- URL вашего CAD API
    syncEnabled = true,                 -- Включить синхронизацию
    soundCooldown = 5000,              -- Кулдаун звука (мс)
    maxCalls = 3                       -- Макс. активных вызовов
}
```

## 🎯 Интеграция с CAD

Для интеграции с Compass CAD используйте события:

```lua
-- При прикреплении к вызову
TriggerEvent('compass:callAttached', callId)

-- При обновлении данных
TriggerEvent('compass:callUpdated', callData)

-- При закрытии вызова
TriggerEvent('compass:callClosed', callId)
```

## 📝 Пример данных вызова

```lua
local callData = {
    id = "1234",
    type = "traffic_accident",
    location = "Vinewood Blvd & Strawberry Ave",
    description = "Тяжелый удар. Один человек без сознания.",
    priority = "high",
    status = "dispatched",
    callerName = "John Doe",
    callerPhone = "(555) 123-4567",
    createdAt = os.time() * 1000,
    responders = {
        { name = "Officer Johnson", status = "enroute" }
    }
}
```

## 🔧 Требования

- FiveM Server
- GTA V
- (Опционально) Звуковые файлы в `assets/sounds/`

## 📄 Лицензия

MIT License