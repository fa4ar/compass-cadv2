import React from 'react';
import { FileSearch, Search, Clock, Shield, Laptop, Car, AlertTriangle, Receipt, PlusSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NCICFields {
    firstName: string;
    lastName: string;
    ssn: string;
    plate: string;
    weaponSerial: string;
}

interface SearchResult {
    id: number;
    firstName: string;
    lastName: string;
    nickname?: string;
    ssn?: string;
    birthDate?: string;
    gender?: string;
    height?: string;
    weight?: string;
    description?: string;
    photoUrl?: string;
    isAlive?: boolean;
    status?: string;
    licenses?: Array<{
        id: number;
        license: { name: string; type: string };
        isActive: boolean;
    }>;
    vehicles?: Array<{
        id: number;
        plate: string;
        model: string;
        color?: string;
        status: string;
        imageUrl?: string;
    }>;
    weapons?: Array<{
        id: number;
        model: string;
        serial: string;
        status: string;
    }>;
    fines?: Array<{
        id: number;
        reason: string;
        amount: number;
        status: string;
        issuedAt: string;
        officer?: { firstName: string; lastName: string };
    }>;
}

interface NCICSearchPanelProps {
    fields: NCICFields;
    setFields: (fields: NCICFields) => void;
    onSearch: () => void;
    results: SearchResult[];
    isSearching: boolean;
    onIssueFine?: (characterId: number) => void;
    getImageUrl?: (url?: string) => string | null;
}

export const NCICSearchPanel: React.FC<NCICSearchPanelProps> = ({
    fields,
    setFields,
    onSearch,
    results,
    isSearching,
    onIssueFine,
    getImageUrl = (url) => url || null
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-zinc-800/20 border border-zinc-700/50 p-4 rounded-xl mb-6 shadow-xl shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Имя</Label>
                        <Input
                            value={fields.firstName}
                            onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                            placeholder="John"
                            className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Фамилия</Label>
                        <Input
                            value={fields.lastName}
                            onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                            placeholder="Doe"
                            className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">SSN / ID</Label>
                        <Input
                            value={fields.ssn}
                            onChange={(e) => setFields({ ...fields, ssn: e.target.value })}
                            placeholder="Необязательно"
                            className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Номер авто</Label>
                        <Input
                            value={fields.plate}
                            onChange={(e) => setFields({ ...fields, plate: e.target.value })}
                            placeholder="89ABC123"
                            className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Серия оружия</Label>
                        <Input
                            value={fields.weaponSerial}
                            onChange={(e) => setFields({ ...fields, weaponSerial: e.target.value })}
                            placeholder="SN-98123"
                            className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFields({ firstName: '', lastName: '', ssn: '', plate: '', weaponSerial: '' })}
                        className="bg-zinc-800/50 border-zinc-700 text-xs text-zinc-400 hover:text-white"
                    >
                        Очистить всё
                    </Button>
                    <Button
                        onClick={onSearch}
                        disabled={isSearching}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-500 min-w-[120px] shadow-lg shadow-blue-900/20"
                    >
                        {isSearching ? <Clock className="w-3.5 h-3.5 animate-spin mr-2" /> : <Search className="w-3.5 h-3.5 mr-2" />}
                        {isSearching ? 'Поиск...' : 'Поиск в NCIC'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto space-y-4 pr-1">
                {results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/20">
                        <FileSearch className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-medium">Результатов не найдено</p>
                        <p className="text-xs text-zinc-600 mt-1">Введите запрос для поиска в базе данных</p>
                    </div>
                ) : (
                    results.map((result) => (
                        <Card key={result.id} className="bg-zinc-900/60 border-zinc-700/80 overflow-hidden shadow-2xl">
                            <div className="bg-gradient-to-r from-blue-950/60 to-zinc-900/60 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Запись NCIC — ID #{result.id}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    result.isAlive === false ? 'bg-red-900/40 border-red-700/50 text-red-400' : 
                                    result.status === 'incarcerated' ? 'bg-orange-900/40 border-orange-700/50 text-orange-400' : 
                                    'bg-emerald-900/30 border-emerald-700/40 text-emerald-400'
                                }`}>
                                    {result.isAlive === false ? '● МЕРТВ' : result.status === 'incarcerated' ? 'ЗАКЛЮЧЕН' : 'АКТИВЕН'}
                                </span>
                            </div>

                            <div className="p-5 flex flex-col lg:flex-row gap-6">
                                <div className="flex flex-col gap-4 w-full lg:w-48 shrink-0">
                                    {result.photoUrl ? (
                                        <img
                                            src={getImageUrl(result.photoUrl)!}
                                            alt={`${result.firstName} ${result.lastName}`}
                                            className="w-full h-52 object-cover rounded-xl border-2 border-zinc-700 shadow-xl"
                                        />
                                    ) : (
                                        <div className="w-full h-52 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center gap-2 text-zinc-600">
                                            <div className="w-12 h-12 flex items-center justify-center">
                                                <FileSearch className="w-12 h-12" />
                                            </div>
                                            <span className="text-[10px]">Нет фото</span>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Имя</span>
                                            <span className="font-bold text-white">{result.firstName} {result.lastName}</span>
                                        </div>
                                        {result.nickname && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Позывной</span>
                                                <span className="text-blue-400 italic">"{result.nickname}"</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">SSN</span>
                                            <span className="font-mono text-zinc-300">{result.ssn || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Д.Р.</span>
                                            <span className="text-zinc-300">{result.birthDate ? new Date(result.birthDate).toLocaleDateString('ru-RU') : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Пол</span>
                                            <span className="text-zinc-300 capitalize">{result.gender === 'male' ? 'Мужской' : result.gender === 'female' ? 'Женский' : result.gender || '—'}</span>
                                        </div>
                                        {result.height && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Рост</span>
                                                <span className="text-zinc-300">{result.height} см</span>
                                            </div>
                                        )}
                                        {result.weight && (
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Вес</span>
                                                <span className="text-zinc-300">{result.weight} кг</span>
                                            </div>
                                        )}
                                    </div>

                                    {result.description && (
                                        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-2">
                                            <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Заметки</p>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-4">{result.description}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                            <Laptop className="w-3 h-3 text-blue-500" /> Лицензии
                                        </p>
                                        <div className="space-y-1.5">
                                            {result.licenses && result.licenses.length > 0 ? (
                                                result.licenses.map((lic) => (
                                                    <div key={lic.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg border border-zinc-800/80">
                                                        <div>
                                                            <p className="text-xs text-zinc-200 font-medium">{lic.license.name}</p>
                                                            <p className="text-[10px] text-zinc-600">{lic.license.type}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${lic.isActive ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                            {lic.isActive ? 'ВАЛИДНА' : 'ОТЗВАНА'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : <p className="text-xs text-zinc-600 italic py-2">Нет лицензий</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                            <Car className="w-3 h-3 text-blue-500" /> Транспорт
                                        </p>
                                        <div className="space-y-2">
                                            {result.vehicles && result.vehicles.length > 0 ? (
                                                result.vehicles.map((veh) => (
                                                    <div key={veh.id} className="bg-zinc-800/50 rounded-lg border border-zinc-800/80 overflow-hidden">
                                                        {veh.imageUrl ? (
                                                            <img src={getImageUrl(veh.imageUrl)!} alt={veh.model} className="w-full h-20 object-cover" />
                                                        ) : (
                                                            <div className="w-full h-14 bg-zinc-800 flex items-center justify-center">
                                                                <Car className="w-6 h-6 text-zinc-700" />
                                                            </div>
                                                        )}
                                                        <div className="p-2 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-bold text-white font-mono">{veh.plate}</p>
                                                                <p className="text-[10px] text-zinc-400">{veh.model}{veh.color ? ` · ${veh.color}` : ''}</p>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${veh.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                                {veh.status === 'Valid' ? 'ВАЛИДЕН' : 'НЕВАЛИДЕН'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <p className="text-xs text-zinc-600 italic py-2">Нет транспорта</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" /> Оружие
                                        </p>
                                        <div className="space-y-1.5">
                                            {result.weapons && result.weapons.length > 0 ? (
                                                result.weapons.map((wep) => (
                                                    <div key={wep.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg border border-zinc-800/80">
                                                        <div>
                                                            <p className="text-xs text-zinc-200 font-medium">{wep.model}</p>
                                                            <p className="text-[10px] font-mono text-zinc-500">{wep.serial}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${wep.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                            {wep.status === 'Valid' ? 'ВАЛИДНО' : 'НЕВАЛИДНО'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : <p className="text-xs text-zinc-600 italic py-2">Нет оружия</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-3">
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Receipt className="w-3 h-3" /> Судимости / Штрафы
                                            </div>
                                            {onIssueFine && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-5 px-1.5 text-[9px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/5"
                                                    onClick={() => onIssueFine(result.id)}
                                                >
                                                    <PlusSquare className="w-2.5 h-2.5 mr-1" /> ВЫПИСАТЬ ШТРАФ
                                                </Button>
                                            )}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {result.fines && result.fines.length > 0 ? (
                                                result.fines.map((fine) => (
                                                    <div key={fine.id} className="bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-800/80 flex justify-between items-center group relative overflow-hidden">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${fine.status === 'paid' ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                                                        <div className="pl-1">
                                                            <p className="text-xs text-zinc-200 font-medium line-clamp-1">{fine.reason}</p>
                                                            <p className="text-[9px] text-zinc-500 uppercase">
                                                                {new Date(fine.issuedAt).toLocaleDateString('ru-RU')} • Офицер: {fine.officer ? `${fine.officer.firstName[0]}. ${fine.officer.lastName}` : 'Система'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-xs font-bold ${fine.status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                ${fine.amount.toLocaleString()}
                                                            </p>
                                                            <span className={`text-[8px] font-bold px-1 rounded-full border ${fine.status === 'paid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-rose-900/30 border-red-700/40 text-rose-400'}`}>
                                                                {fine.status === 'paid' ? 'ОПЛАЧЕН' : 'НЕ ОПЛАЧЕН'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <p className="text-xs text-zinc-600 italic py-2">Чистая история</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
