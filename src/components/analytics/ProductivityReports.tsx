import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudySession } from '@/types/study';
import { PerformanceMetric } from '@/db/crud/performanceMetrics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Target, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityReportsProps {
  sessions: StudySession[];
  metrics: PerformanceMetric[];
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportData {
  period: string;
  totalTime: number;
  sessionsCount: number;
  completionRate: number;
  efficiency: number;
  streak: number;
  subjectBreakdown: Record<string, number>;
}

export const ProductivityReports: React.FC<ProductivityReportsProps> = ({ sessions, metrics }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');

  const reportData = useMemo(() => {
    return generateReportData(sessions, metrics, selectedPeriod);
  }, [sessions, metrics, selectedPeriod]);

  const comparisonData = useMemo(() => {
    return calculatePeriodComparison(reportData);
  }, [reportData]);

  const subjectData = useMemo(() => {
    const breakdown = reportData[reportData.length - 1]?.subjectBreakdown || {};
    return Object.entries(breakdown).map(([subject, time]) => ({
      subject,
      time: Math.round(time / 60), // Convert to hours
      percentage: Math.round((time / Object.values(breakdown).reduce((a, b) => a + b, 0)) * 100)
    }));
  }, [reportData]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--success))'];

  const formatPeriodLabel = (period: string, type: Period) => {
    const date = new Date(period);
    switch (type) {
      case 'daily':
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      case 'weekly':
        return `Sem ${getWeekNumber(date)}`;
      case 'monthly':
        return date.toLocaleDateString('pt-BR', { month: 'short' });
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return period;
    }
  };

  const currentPeriodData = reportData[reportData.length - 1];
  const previousPeriodData = reportData[reportData.length - 2];

  const stats = [
    {
      title: 'Tempo Total',
      value: `${Math.round((currentPeriodData?.totalTime || 0) / 60)}h`,
      change: calculatePercentageChange(
        currentPeriodData?.totalTime || 0,
        previousPeriodData?.totalTime || 0
      ),
      icon: Clock,
      color: 'text-blue-500'
    },
    {
      title: 'Sessões',
      value: currentPeriodData?.sessionsCount || 0,
      change: calculatePercentageChange(
        currentPeriodData?.sessionsCount || 0,
        previousPeriodData?.sessionsCount || 0
      ),
      icon: BookOpen,
      color: 'text-green-500'
    },
    {
      title: 'Taxa de Conclusão',
      value: `${Math.round((currentPeriodData?.completionRate || 0) * 100)}%`,
      change: calculatePercentageChange(
        currentPeriodData?.completionRate || 0,
        previousPeriodData?.completionRate || 0
      ),
      icon: Target,
      color: 'text-purple-500'
    },
    {
      title: 'Eficiência',
      value: `${Math.round((currentPeriodData?.efficiency || 0) * 100)}%`,
      change: calculatePercentageChange(
        currentPeriodData?.efficiency || 0,
        previousPeriodData?.efficiency || 0
      ),
      icon: Zap,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(period => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period === 'daily' && 'Diário'}
            {period === 'weekly' && 'Semanal'}
            {period === 'monthly' && 'Mensal'}
            {period === 'yearly' && 'Anual'}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          const isNegative = stat.change < 0;

          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={cn('h-8 w-8', stat.color)} />
                </div>
                {stat.change !== 0 && (
                  <div className="flex items-center mt-2 text-sm">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-muted-foreground ml-1">vs período anterior</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="subjects">Por Matéria</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Produtividade ao Longo do Tempo</CardTitle>
              <CardDescription>
                Acompanhe seu progresso no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={(value) => formatPeriodLabel(value, selectedPeriod)}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatPeriodLabel(value as string, selectedPeriod)}
                    formatter={(value: number, name: string) => [
                      name === 'totalTime' ? `${Math.round(value / 60)}h` : 
                      name === 'completionRate' || name === 'efficiency' ? `${Math.round(value * 100)}%` :
                      value,
                      name === 'totalTime' ? 'Tempo Total' :
                      name === 'sessionsCount' ? 'Sessões' :
                      name === 'completionRate' ? 'Taxa de Conclusão' :
                      name === 'efficiency' ? 'Eficiência' : name
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalTime" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sessionsCount" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--secondary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Performance</CardTitle>
              <CardDescription>
                Compare métricas entre períodos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={(value) => formatPeriodLabel(value, selectedPeriod)}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'completionRate' || name === 'efficiency' ? `${Math.round(value * 100)}%` : value,
                      name === 'completionRate' ? 'Taxa de Conclusão' : 'Eficiência'
                    ]}
                  />
                  <Bar dataKey="completionRate" fill="hsl(var(--primary))" name="Taxa de Conclusão" />
                  <Bar dataKey="efficiency" fill="hsl(var(--secondary))" name="Eficiência" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Matéria</CardTitle>
                <CardDescription>
                  Tempo gasto em cada matéria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ subject, percentage }) => `${subject}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="time"
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}h`, 'Tempo']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de Matérias</CardTitle>
                <CardDescription>
                  Matérias por tempo estudado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectData
                    .sort((a, b) => b.time - a.time)
                    .slice(0, 5)
                    .map((subject, index) => (
                      <div key={subject.subject} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{subject.subject}</p>
                            <p className="text-sm text-muted-foreground">{subject.time}h estudadas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{subject.percentage}%</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
function generateReportData(
  sessions: StudySession[], 
  metrics: PerformanceMetric[], 
  period: Period
): ReportData[] {
  const data: ReportData[] = [];
  const endDate = new Date();
  const startDate = new Date();
  
  // Set start date based on period
  switch (period) {
    case 'daily':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'weekly':
      startDate.setDate(startDate.getDate() - (12 * 7));
      break;
    case 'monthly':
      startDate.setMonth(startDate.getMonth() - 12);
      break;
    case 'yearly':
      startDate.setFullYear(startDate.getFullYear() - 5);
      break;
  }

  // Generate periods
  const periods = generatePeriods(startDate, endDate, period);
  
  periods.forEach(periodKey => {
    const periodSessions = sessions.filter(session => {
      const sessionDate = session.startTime;
      return isInPeriod(sessionDate, periodKey, period);
    });

    const totalTime = periodSessions.reduce((sum, s) => sum + s.duration, 0);
    const completedSessions = periodSessions.filter(s => s.completed).length;
    const completionRate = periodSessions.length > 0 ? completedSessions / periodSessions.length : 0;
    
    // Calculate efficiency based on performance
    const averagePerformance = periodSessions.length > 0
      ? periodSessions.reduce((sum, s) => {
          const score = s.performance === 'high' ? 1 : s.performance === 'medium' ? 0.6 : 0.3;
          return sum + score;
        }, 0) / periodSessions.length
      : 0;

    const subjectBreakdown: Record<string, number> = {};
    periodSessions.forEach(session => {
      subjectBreakdown[session.subject] = (subjectBreakdown[session.subject] || 0) + session.duration;
    });

    data.push({
      period: periodKey,
      totalTime,
      sessionsCount: periodSessions.length,
      completionRate,
      efficiency: averagePerformance,
      streak: 0, // TODO: Calculate streak
      subjectBreakdown
    });
  });

  return data;
}

function generatePeriods(startDate: Date, endDate: Date, period: Period): string[] {
  const periods: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    switch (period) {
      case 'daily':
        periods.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        const weekStart = new Date(current);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periods.push(weekStart.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        periods.push(new Date(current.getFullYear(), current.getMonth(), 1).toISOString().split('T')[0]);
        current.setMonth(current.getMonth() + 1);
        break;
      case 'yearly':
        periods.push(new Date(current.getFullYear(), 0, 1).toISOString().split('T')[0]);
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return periods;
}

function isInPeriod(date: Date, periodKey: string, period: Period): boolean {
  const periodDate = new Date(periodKey);
  
  switch (period) {
    case 'daily':
      return date.toISOString().split('T')[0] === periodKey;
    case 'weekly':
      const weekStart = new Date(periodDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return date >= weekStart && date <= weekEnd;
    case 'monthly':
      return date.getFullYear() === periodDate.getFullYear() && 
             date.getMonth() === periodDate.getMonth();
    case 'yearly':
      return date.getFullYear() === periodDate.getFullYear();
    default:
      return false;
  }
}

function calculatePeriodComparison(data: ReportData[]) {
  if (data.length < 2) return null;
  
  const current = data[data.length - 1];
  const previous = data[data.length - 2];
  
  return {
    timeChange: calculatePercentageChange(current.totalTime, previous.totalTime),
    sessionsChange: calculatePercentageChange(current.sessionsCount, previous.sessionsCount),
    completionChange: calculatePercentageChange(current.completionRate, previous.completionRate),
    efficiencyChange: calculatePercentageChange(current.efficiency, previous.efficiency)
  };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}