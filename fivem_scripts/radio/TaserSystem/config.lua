Config = {}

Config.TaserWeapons = {
    [`WEAPON_STUNGUN`] = { 
        name = "Taser 7", 
        maxCartridges = 4, 
        shotsPerCartridge = 2, -- User said "two shots at a time"
        lasers = {
            { color = {255, 0, 0}, offset = {0.0, 0.0, 0.01} }, -- Red
            { color = {0, 255, 0}, offset = {0.0, 0.0, -0.01} } -- Green
        }
    },
    [`WEAPON_TAZER10`] = { 
        name = "Taser 10", 
        maxCartridges = 10, 
        shotsPerCartridge = 1, 
        lasers = {
            { color = {0, 255, 0}, offset = {0.0, 0.0, 0.0} } -- Green
        }
    }
}

Config.Keys = {
    Flashlight = 'Q',
    Laser = 'E',
    Shock = 'H',
    Safety = 'Z',
    Reload = 'R'
}

Config.StunDuration = 5000    -- MS
Config.DriveStunDist = 2.0    -- Distance for close range shock
Config.ProbeMaxDist = 30.0    -- Max distance for probes

Config.UI = {
    Colors = {
        Ready = '#00ff00',
        Spent = '#ff0000',
        Active = '#ffff00'
    }
}
