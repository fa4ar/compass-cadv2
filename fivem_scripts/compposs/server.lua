-- СЕРВЕР: СИНХРОНИЗАЦИЯ ПРЯМЫХ ОФФСЕТОВ ПАМЯТИ
RegisterCommand("comppos", function(source, args)
    if source > 0 and args[1] then
        TriggerClientEvent("comppos:startEdit", source, tonumber(args[1]))
    end
end)

RegisterServerEvent("comppos:saveMemory")
AddEventHandler("comppos:saveMemory", function(id, offset)
    local src = source
    -- Рассылка оффсетов всем клиентам для модификации их локальной памяти
    TriggerClientEvent("comppos:syncMemory", -1, src, id, offset)
end)
