'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, Clock, AlertTriangle, Shield, Ambulance, Flame, Building2, Radio } from 'lucide-react';

interface DepartmentShift {
  id: number;
  userId: number;
  departmentType: string;
  status: string;
  callSign: string;
  character: string | null;
  startedAt: string;
  lastStatusAt: string;
  shiftProgress: any;
  isForced: boolean;
  user?: {
    username: string;
    avatarUrl?: string;
  };
  departmentMember?: {
    department: {
      name: string;
      type: string;
    };
    rank: {
      name: string;
    };
  };
}

interface ShiftActivityLog {
  id: number;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
}

interface ShiftHistory {
  id: number;
  departmentType: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  callsHandled: number;
  endReason: string;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  police: 'bg-blue-500',
  ems: 'bg-red-500',
  fire: 'bg-orange-500',
  sheriff: 'bg-green-500',
  trooper: 'bg-purple-500',
  dispatch: 'bg-gray-500',
  corrections: 'bg-yellow-500'
};

const DEPARTMENT_ICONS: Record<string, any> = {
  police: Shield,
  ems: Ambulance,
  fire: Flame,
  sheriff: Building2,
  trooper: Shield,
  dispatch: Radio,
  corrections: Building2
};

export default function DepartmentShiftsAdmin() {
  const [shifts, setShifts] = useState<DepartmentShift[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<DepartmentShift[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedShiftLogs, setSelectedShiftLogs] = useState<ShiftActivityLog[]>([]);
  const [selectedShiftHistory, setSelectedShiftHistory] = useState<ShiftHistory[]>([]);
  const [selectedShift, setSelectedShift] = useState<DepartmentShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shifts');

  useEffect(() => {
    loadShifts();
  }, [selectedDepartment]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const url = selectedDepartment === 'all' 
        ? '/api/department-shifts/all'
        : `/api/department-shifts/all/${selectedDepartment}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setShifts(data.shifts);
        setFilteredShifts(data.shifts);
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShiftLogs = async (shiftId: number) => {
    try {
      const response = await fetch(`/api/department-shifts/${shiftId}/logs`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedShiftLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading shift logs:', error);
    }
  };

  const loadUserShiftHistory = async (userId: number, departmentType: string) => {
    try {
      const response = await fetch(`/api/department-shifts/history/${userId}/${departmentType}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedShiftHistory(data.history);
      }
    } catch (error) {
      console.error('Error loading shift history:', error);
    }
  };

  const handleShiftClick = (shift: DepartmentShift) => {
    setSelectedShift(shift);
    loadShiftLogs(shift.id);
    loadUserShiftHistory(shift.userId, shift.departmentType);
    setActiveTab('details');
  };

  const getDepartmentIcon = (departmentType: string) => {
    const Icon = DEPARTMENT_ICONS[departmentType] || Shield;
    return <Icon className="h-4 w-4" />;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getSimultaneousShifts = () => {
    const userShifts: Record<number, DepartmentShift[]> = {};
    
    shifts.forEach(shift => {
      if (!userShifts[shift.userId]) {
        userShifts[shift.userId] = [];
      }
      userShifts[shift.userId].push(shift);
    });

    return Object.entries(userShifts)
      .filter(([_, shifts]) => shifts.length > 1)
      .map(([userId, shifts]) => ({
        userId: parseInt(userId),
        shifts,
        user: shifts[0].user
      }));
  };

  const simultaneousShifts = getSimultaneousShifts();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Shifts Monitor</h1>
          <p className="text-muted-foreground">
            Monitor and manage independent department shifts across all agencies
          </p>
        </div>
        <Button onClick={loadShifts} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Shifts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Simultaneous Shifts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{simultaneousShifts.length}</div>
            <p className="text-xs text-muted-foreground">
              Users with multiple department shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force Switches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts.filter(s => s.isForced).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active forced shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Shift Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(
                shifts.length > 0 
                  ? Math.floor(shifts.reduce((acc, s) => {
                      const duration = (new Date().getTime() - new Date(s.startedAt).getTime()) / 1000;
                      return acc + duration;
                    }, 0) / shifts.length)
                  : null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simultaneous Shifts Warning */}
      {simultaneousShifts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Simultaneous Department Shifts
            </CardTitle>
            <CardDescription>
              The following users have active shifts in multiple departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {simultaneousShifts.map(({ userId, shifts, user }) => (
                <div key={userId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{user?.username || `User ${userId}`}</div>
                    <div className="flex gap-2">
                      {shifts.map(shift => (
                        <Badge key={shift.id} className={`${DEPARTMENT_COLORS[shift.departmentType]} text-white`}>
                          {shift.departmentType.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {shifts.length} active shifts
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="shifts">Active Shifts</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedShift}>
            Shift Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          <div className="flex items-center gap-4">
            <select 
              value={selectedDepartment} 
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Departments</option>
              <option value="police">Police</option>
              <option value="ems">EMS</option>
              <option value="fire">Fire</option>
              <option value="sheriff">Sheriff</option>
              <option value="trooper">Trooper</option>
              <option value="dispatch">Dispatch</option>
              <option value="corrections">Corrections</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid gap-4">
              {filteredShifts.map(shift => (
                <Card 
                  key={shift.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleShiftClick(shift)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${DEPARTMENT_COLORS[shift.departmentType]} text-white`}>
                          {getDepartmentIcon(shift.departmentType)}
                        </div>
                        <div>
                          <div className="font-medium">{shift.callSign}</div>
                          <div className="text-sm text-muted-foreground">
                            {shift.character || 'No character'} • {shift.user?.username}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant={shift.isForced ? 'destructive' : 'secondary'}>
                          {shift.status}
                        </Badge>
                        {shift.isForced && (
                          <Badge variant="outline" className="border-orange-500 text-orange-500">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Forced
                          </Badge>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {formatDuration(
                            Math.floor((new Date().getTime() - new Date(shift.startedAt).getTime()) / 1000)
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredShifts.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No active shifts found
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedShift && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Shift Details</CardTitle>
                  <CardDescription>
                    {selectedShift.callSign} - {selectedShift.departmentType.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-medium">{selectedShift.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Started At</div>
                      <div className="font-medium">
                        {new Date(selectedShift.startedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Status Update</div>
                      <div className="font-medium">
                        {new Date(selectedShift.lastStatusAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                      <div className="font-medium">
                        {formatDuration(
                          Math.floor((new Date().getTime() - new Date(selectedShift.startedAt).getTime()) / 1000)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Calls Handled</div>
                      <div className="font-medium">
                        {selectedShift.shiftProgress?.callsHandled || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Forced Shift</div>
                      <div className="font-medium">
                        {selectedShift.isForced ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {selectedShift.departmentMember && (
                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Department Information</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Department</div>
                          <div className="font-medium">{selectedShift.departmentMember.department.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Rank</div>
                          <div className="font-medium">{selectedShift.departmentMember.rank.name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>Recent activity for this shift</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedShiftLogs.length > 0 ? (
                      selectedShiftLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{log.action}</div>
                            <div className="text-sm text-muted-foreground">{log.description}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No activity logs found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shift History</CardTitle>
                  <CardDescription>Previous shifts for this user in {selectedShift.departmentType}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedShiftHistory.length > 0 ? (
                      selectedShiftHistory.map(history => (
                        <div key={history.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">
                              {new Date(history.startedAt).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {history.callsHandled} calls • {history.endReason}
                            </div>
                          </div>
                          <div className="text-sm">
                            {formatDuration(history.duration)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No shift history found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
