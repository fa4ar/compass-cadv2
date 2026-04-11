'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, AlertTriangle, Navigation, X, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { StatusBadge } from './StatusBadge';

interface Call {
  id: number;
  location: string;
  description: string;
  callerName: string;
  callerPhone?: string;
  type?: string;
  priority?: string;
  isEmergency?: boolean;
  status: string;
  createdAt: string;
  x?: number;
  y?: number;
  z?: number;
  units?: Array<{
    userId: number;
    name: string;
    status: string;
    callSign: string;
    isLead: boolean;
  }>;
  notes?: Array<{
    id: number;
    author: string;
    text: string;
    createdAt: string;
  }>;
}

interface ActiveCallCardProps {
  call: Call | null;
  onDetach?: () => void;
  onAddNote?: () => void;
}

export const ActiveCallCard: React.FC<ActiveCallCardProps> = ({ 
  call, 
  onDetach,
  onAddNote 
}) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [isAttached, setIsAttached] = useState(false);
  const [userShift, setUserShift] = useState<any>(null);

  useEffect(() => {
    if (!user || !call) return;

    // Check if user is on active shift
    const checkShiftStatus = async () => {
      try {
        const response = await fetch(`/api/department-shifts/my-shifts`);
        const data = await response.json();
        if (data.success && data.shifts.length > 0) {
          setUserShift(data.shifts[0]);
          setIsAttached(true);
        } else {
          setUserShift(null);
          setIsAttached(false);
        }
      } catch (error) {
        console.error('Error checking shift status:', error);
        setIsAttached(false);
      }
    };

    checkShiftStatus();

    // Listen for shift changes
    const handleShiftChange = (data: any) => {
      if (data.userId === user.id) {
        checkShiftStatus();
      }
    };

    socket.on('department_shift_started', handleShiftChange);
    socket.on('department_shift_ended', handleShiftChange);

    return () => {
      socket.off('department_shift_started', handleShiftChange);
      socket.off('department_shift_ended', handleShiftChange);
    };
  }, [user, call, socket]);

  // Only show if user is on shift AND attached to this call
  if (!isAttached || !call || !userShift) {
    return null;
  }

  const priorityColors: Record<string, string> = {
    emergency: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    routine: 'bg-green-500',
    low: 'bg-blue-500'
  };

  const typeTranslations: Record<string, string> = {
    traffic_accident: 'ДТП',
    disturbance: 'Нарушение порядка',
    robbery: 'Ограбление',
    assault: 'Нападение',
    domestic: 'Семейный конфликт',
    welfare_check: 'Проверка безопасности',
    suspicious: 'Подозрительная активность',
    fire: 'Пожар',
    medical: 'Медицинская помощь',
    accident: 'Авария',
    other: 'Другое'
  };

  return (
    <Card className="fixed left-4 top-1/2 -translate-y-1/2 w-96 bg-zinc-900/95 backdrop-blur border-zinc-700 shadow-2xl z-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Активный вызов #{call.id}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${priorityColors[call.priority || 'routine']} text-white`}>
                {call.priority?.toUpperCase() || 'ROUTINE'}
              </Badge>
              {call.type && (
                <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                  {typeTranslations[call.type] || call.type}
                </Badge>
              )}
              <StatusBadge status={call.status} type="call" size="sm" />
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onDetach}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-zinc-400">Адрес</div>
            <div className="text-white font-medium">{call.location}</div>
          </div>
        </div>

        {/* Description */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-zinc-400">Описание</div>
            <div className="text-white">{call.description}</div>
          </div>
        </div>

        {/* Caller Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-zinc-400">Звонящий</div>
              <div className="text-white font-medium">{call.callerName}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-zinc-400">Время</div>
              <div className="text-white font-medium">
                {new Date(call.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Coordinates */}
        {call.x && call.y && (
          <div className="flex items-start gap-3">
            <Navigation className="h-4 w-4 text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-zinc-400">Координаты</div>
              <div className="text-white font-mono text-sm">
                X: {call.x.toFixed(2)}, Y: {call.y.toFixed(2)}, Z: {call.z?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        )}

        {/* Assigned Units */}
        {call.units && call.units.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4" />
              <span>Прикрепленные юниты ({call.units.length})</span>
            </div>
            <div className="space-y-1">
              {call.units.map((unit, index) => (
                <div 
                  key={`${unit.userId}-${index}`}
                  className={`flex items-center justify-between p-2 rounded bg-zinc-800/50 ${
                    unit.isLead ? 'border border-orange-500/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-white font-medium">{unit.name}</div>
                    {unit.isLead && (
                      <Badge className="bg-orange-500 text-white text-xs">LEAD</Badge>
                    )}
                  </div>
                  <StatusBadge status={unit.status} type="unit" size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Notes */}
        {call.notes && call.notes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <MessageSquare className="h-4 w-4" />
                <span>Заметки ({call.notes.length})</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-white h-7"
                onClick={onAddNote}
              >
                + Добавить
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {call.notes.slice(-3).map((note) => (
                <div key={note.id} className="p-2 rounded bg-zinc-800/50 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-300 font-medium">{note.author}</span>
                    <span className="text-zinc-500 text-xs">
                      {new Date(note.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-zinc-400">{note.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shift Info */}
        <div className="pt-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            Смена: {userShift.departmentType?.toUpperCase()} • {userShift.callSign || 'N/A'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
