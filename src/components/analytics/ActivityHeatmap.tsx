import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudySession } from '@/types/study';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  sessions: StudySession[];
}

interface DayData {
  date: Date;
  intensity: number; // 0-4 levels like GitHub
  hours: number;
  sessionsCount: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ sessions }) => {
  const heatmapData = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365); // Last 365 days

    const dataMap = new Map<string, DayData>();

    // Initialize all days with 0 intensity
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dataMap.set(dateKey, {
        date: new Date(d),
        intensity: 0,
        hours: 0,
        sessionsCount: 0
      });
    }

    // Fill with actual session data
    sessions.forEach(session => {
      const dateKey = session.startTime.toISOString().split('T')[0];
      const existing = dataMap.get(dateKey);
      
      if (existing) {
        existing.hours += session.duration / 60; // Convert to hours
        existing.sessionsCount += 1;
      }
    });

    // Calculate intensity levels (0-4 like GitHub)
    const maxHours = Math.max(...Array.from(dataMap.values()).map(d => d.hours));
    dataMap.forEach(dayData => {
      if (dayData.hours === 0) {
        dayData.intensity = 0;
      } else if (dayData.hours < maxHours * 0.25) {
        dayData.intensity = 1;
      } else if (dayData.hours < maxHours * 0.5) {
        dayData.intensity = 2;
      } else if (dayData.hours < maxHours * 0.75) {
        dayData.intensity = 3;
      } else {
        dayData.intensity = 4;
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sessions]);

  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = [];
    let currentWeek: DayData[] = [];

    // Start from the first Sunday before our data
    const firstDay = heatmapData[0]?.date || new Date();
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    heatmapData.forEach(dayData => {
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(dayData);
    });

    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [heatmapData]);

  const totalHours = heatmapData.reduce((sum, day) => sum + day.hours, 0);
  const activeDays = heatmapData.filter(day => day.intensity > 0).length;
  const currentStreak = calculateCurrentStreak(heatmapData);
  const longestStreak = calculateLongestStreak(heatmapData);

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-muted';
      case 1: return 'bg-success/20';
      case 2: return 'bg-success/40';
      case 3: return 'bg-success/60';
      case 4: return 'bg-success/80';
      default: return 'bg-muted';
    }
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade de Estudos</CardTitle>
        <CardDescription>
          Últimos 365 dias - {totalHours.toFixed(1)}h estudadas em {activeDays} dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-foreground">{totalHours.toFixed(0)}h</div>
              <div className="text-muted-foreground">Total estudado</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{activeDays}</div>
              <div className="text-muted-foreground">Dias ativos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{currentStreak}</div>
              <div className="text-muted-foreground">Sequência atual</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{longestStreak}</div>
              <div className="text-muted-foreground">Maior sequência</div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Month labels */}
              <div className="flex mb-2">
                <div className="w-8"></div> {/* Space for weekday labels */}
                {weeks.map((week, weekIndex) => {
                  const firstDay = week[0];
                  const isFirstWeekOfMonth = firstDay && firstDay.date.getDate() <= 7;
                  return (
                    <div key={weekIndex} className="w-3 text-xs text-muted-foreground text-center">
                      {isFirstWeekOfMonth ? months[firstDay.date.getMonth()] : ''}
                    </div>
                  );
                })}
              </div>

              {/* Heatmap grid */}
              <div className="flex">
                {/* Weekday labels */}
                <div className="flex flex-col justify-between mr-2 text-xs text-muted-foreground">
                  {weekdays.map((day, index) => (
                    <div key={day} className="h-3 flex items-center">
                      {index % 2 === 1 ? day : ''}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const dayData = week[dayIndex];
                        if (!dayData) {
                          return <div key={dayIndex} className="w-3 h-3" />;
                        }

                        return (
                          <div
                            key={dayIndex}
                            className={cn(
                              'w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                              getIntensityClass(dayData.intensity)
                            )}
                            title={`${dayData.date.toLocaleDateString('pt-BR')} - ${dayData.hours.toFixed(1)}h em ${dayData.sessionsCount} sessão(ões)`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={cn('w-3 h-3 rounded-sm', getIntensityClass(level))}
                    />
                  ))}
                </div>
                <span>Mais</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function calculateCurrentStreak(data: DayData[]): number {
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].intensity > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(data: DayData[]): number {
  let maxStreak = 0;
  let currentStreak = 0;
  
  data.forEach(day => {
    if (day.intensity > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return maxStreak;
}