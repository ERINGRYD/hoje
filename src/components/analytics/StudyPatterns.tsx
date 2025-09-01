import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudySession } from '@/types/study';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Clock, Calendar, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyPatternsProps {
  sessions: StudySession[];
}

interface PatternAnalysis {
  bestHours: Array<{ hour: number; performance: number; sessionsCount: number }>;
  bestDays: Array<{ day: string; performance: number; sessionsCount: number }>;
  durationAnalysis: {
    optimal: number;
    average: number;
    distribution: Array<{ range: string; count: number; performance: number }>;
  };
  subjectCorrelations: Array<{
    subject: string;
    bestHour: number;
    bestDay: string;
    averagePerformance: number;
  }>;
  performanceFactors: Array<{
    factor: string;
    correlation: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

export const StudyPatterns: React.FC<StudyPatternsProps> = ({ sessions }) => {
  const analysis = useMemo(() => {
    return analyzePatterns(sessions);
  }, [sessions]);

  const hourlyData = analysis.bestHours.map(h => ({
    hour: `${h.hour}:00`,
    performance: Math.round(h.performance * 100),
    sessions: h.sessionsCount,
    label: h.hour
  }));

  const dailyData = analysis.bestDays.map(d => ({
    day: d.day,
    performance: Math.round(d.performance * 100),
    sessions: d.sessionsCount
  }));

  const durationData = analysis.durationAnalysis.distribution.map(d => ({
    range: d.range,
    count: d.count,
    performance: Math.round(d.performance * 100)
  }));

  const weekdayOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const orderedDailyData = weekdayOrder.map(day => 
    dailyData.find(d => d.day === day) || { day, performance: 0, sessions: 0 }
  );

  const radarData = [
    { subject: 'Manhã (6-12h)', value: getTimeSlotPerformance(sessions, 6, 12) },
    { subject: 'Tarde (12-18h)', value: getTimeSlotPerformance(sessions, 12, 18) },
    { subject: 'Noite (18-24h)', value: getTimeSlotPerformance(sessions, 18, 24) },
    { subject: 'Madrugada (0-6h)', value: getTimeSlotPerformance(sessions, 0, 6) }
  ];

  const bestTime = analysis.bestHours.length > 0 
    ? analysis.bestHours.reduce((best, current) => 
        current.performance > best.performance ? current : best
      )
    : { hour: 9, performance: 0, sessionsCount: 0 };

  const bestDay = analysis.bestDays.length > 0 
    ? analysis.bestDays.reduce((best, current) => 
        current.performance > best.performance ? current : best
      )
    : { day: 'Segunda', performance: 0, sessionsCount: 0 };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Horário</p>
                <p className="text-2xl font-bold">{bestTime.hour}:00</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(bestTime.performance * 100)}% performance
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Dia</p>
                <p className="text-2xl font-bold">{bestDay.day}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(bestDay.performance * 100)}% performance
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duração Ótima</p>
                <p className="text-2xl font-bold">{analysis.durationAnalysis.optimal}min</p>
                <p className="text-sm text-muted-foreground">
                  Média: {analysis.durationAnalysis.average}min
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consistência</p>
                <p className="text-2xl font-bold">{calculateConsistency(sessions)}%</p>
                <p className="text-sm text-muted-foreground">
                  Últimos 30 dias
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Horário</CardTitle>
            <CardDescription>
              Identifique seus horários mais produtivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'performance' ? `${value}%` : value,
                    name === 'performance' ? 'Performance' : 'Sessões'
                  ]}
                />
                <Bar dataKey="performance" fill="hsl(var(--primary))" name="Performance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Dia da Semana</CardTitle>
            <CardDescription>
              Descubra seus dias mais produtivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={orderedDailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'performance' ? `${value}%` : value,
                    name === 'performance' ? 'Performance' : 'Sessões'
                  ]}
                />
                <Bar dataKey="performance" fill="hsl(var(--secondary))" name="Performance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Duration Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Duração</CardTitle>
            <CardDescription>
              Performance vs duração das sessões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'performance' ? `${value}%` : value,
                    name === 'performance' ? 'Performance' : 'Quantidade'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="performance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Performance"
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Quantidade"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Slot Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Período</CardTitle>
            <CardDescription>
              Visão geral da produtividade ao longo do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subject Correlations */}
      <Card>
        <CardHeader>
          <CardTitle>Padrões por Matéria</CardTitle>
          <CardDescription>
            Melhores horários e dias para cada matéria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.subjectCorrelations.slice(0, 6).map((correlation, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{correlation.subject}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Melhor horário:</span>
                    <span className="font-medium">{correlation.bestHour}:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Melhor dia:</span>
                    <span className="font-medium">{correlation.bestDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance:</span>
                    <span className={cn(
                      'font-medium',
                      correlation.averagePerformance >= 0.8 ? 'text-green-500' :
                      correlation.averagePerformance >= 0.6 ? 'text-yellow-500' : 'text-red-500'
                    )}>
                      {Math.round(correlation.averagePerformance * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
          <CardDescription>
            Baseado na análise dos seus padrões de estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {generateInsights(analysis).map((insight, index) => (
              <div key={index} className="p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h4 className="font-semibold text-primary mb-1">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function analyzePatterns(sessions: StudySession[]): PatternAnalysis {
  // Hour analysis
  const hourStats: Record<number, { performances: number[]; count: number }> = {};
  
  sessions.forEach(session => {
    const hour = session.startTime.getHours();
    if (!hourStats[hour]) {
      hourStats[hour] = { performances: [], count: 0 };
    }
    
    const performance = getPerformanceScore(session.performance);
    hourStats[hour].performances.push(performance);
    hourStats[hour].count++;
  });

  const bestHours = Object.entries(hourStats).map(([hour, stats]) => ({
    hour: parseInt(hour),
    performance: stats.performances.reduce((a, b) => a + b, 0) / stats.performances.length,
    sessionsCount: stats.count
  }));

  // Day analysis
  const dayStats: Record<string, { performances: number[]; count: number }> = {};
  
  sessions.forEach(session => {
    const day = session.startTime.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
    
    if (!dayStats[capitalizedDay]) {
      dayStats[capitalizedDay] = { performances: [], count: 0 };
    }
    
    const performance = getPerformanceScore(session.performance);
    dayStats[capitalizedDay].performances.push(performance);
    dayStats[capitalizedDay].count++;
  });

  const bestDays = Object.entries(dayStats).map(([day, stats]) => ({
    day,
    performance: stats.performances.reduce((a, b) => a + b, 0) / stats.performances.length,
    sessionsCount: stats.count
  }));

  // Duration analysis
  const durationRanges = [
    { min: 0, max: 15, label: '0-15min' },
    { min: 15, max: 30, label: '15-30min' },
    { min: 30, max: 45, label: '30-45min' },
    { min: 45, max: 60, label: '45-60min' },
    { min: 60, max: 90, label: '60-90min' },
    { min: 90, max: 120, label: '90-120min' },
    { min: 120, max: Infinity, label: '120min+' }
  ];

  const durationStats = durationRanges.map(range => {
    const sessionsInRange = sessions.filter(s => s.duration >= range.min && s.duration < range.max);
    const performances = sessionsInRange.map(s => getPerformanceScore(s.performance));
    const avgPerformance = performances.length > 0 
      ? performances.reduce((a, b) => a + b, 0) / performances.length 
      : 0;

    return {
      range: range.label,
      count: sessionsInRange.length,
      performance: avgPerformance
    };
  });

  const averageDuration = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length)
    : 0;

  const optimalDuration = durationStats.length > 0 && durationStats.some(d => d.count > 0)
    ? durationStats.filter(d => d.count > 0).reduce((best, current) => 
        current.performance > best.performance ? current : best
      )
    : { range: '25-30min', count: 0, performance: 0 };

  // Subject correlations
  const subjectStats: Record<string, {
    sessions: StudySession[];
    performances: number[];
    hours: number[];
    days: string[];
  }> = {};

  sessions.forEach(session => {
    if (!subjectStats[session.subject]) {
      subjectStats[session.subject] = {
        sessions: [],
        performances: [],
        hours: [],
        days: []
      };
    }
    
    subjectStats[session.subject].sessions.push(session);
    subjectStats[session.subject].performances.push(getPerformanceScore(session.performance));
    subjectStats[session.subject].hours.push(session.startTime.getHours());
    subjectStats[session.subject].days.push(
      session.startTime.toLocaleDateString('pt-BR', { weekday: 'long' })
    );
  });

  const subjectCorrelations = Object.entries(subjectStats).map(([subject, stats]) => {
    const avgPerformance = stats.performances.reduce((a, b) => a + b, 0) / stats.performances.length;
    
    // Find best hour for this subject
    const hourCounts: Record<number, number> = {};
    stats.hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const bestHour = parseInt(Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '9');
    
    // Find best day for this subject
    const dayCounts: Record<string, number> = {};
    stats.days.forEach(day => {
      const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
      dayCounts[capitalizedDay] = (dayCounts[capitalizedDay] || 0) + 1;
    });
    const bestDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Segunda';

    return {
      subject,
      bestHour,
      bestDay,
      averagePerformance: avgPerformance
    };
  });

  return {
    bestHours,
    bestDays,
    durationAnalysis: {
      optimal: parseInt(optimalDuration.range.split('-')[0]) || averageDuration,
      average: averageDuration,
      distribution: durationStats
    },
    subjectCorrelations,
    performanceFactors: [] // Could be expanded later
  };
}

function getPerformanceScore(performance?: 'low' | 'medium' | 'high'): number {
  switch (performance) {
    case 'high': return 1;
    case 'medium': return 0.6;
    case 'low': return 0.3;
    default: return 0.5;
  }
}

function getTimeSlotPerformance(sessions: StudySession[], startHour: number, endHour: number): number {
  const timeSlotSessions = sessions.filter(session => {
    const hour = session.startTime.getHours();
    return hour >= startHour && hour < endHour;
  });

  if (timeSlotSessions.length === 0) return 0;

  const averagePerformance = timeSlotSessions.reduce((sum, session) => {
    return sum + getPerformanceScore(session.performance);
  }, 0) / timeSlotSessions.length;

  return Math.round(averagePerformance * 100);
}

function calculateConsistency(sessions: StudySession[]): number {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentSessions = sessions.filter(session => session.startTime >= last30Days);
  
  // Group by day
  const dailySessions: Record<string, StudySession[]> = {};
  recentSessions.forEach(session => {
    const day = session.startTime.toDateString();
    if (!dailySessions[day]) dailySessions[day] = [];
    dailySessions[day].push(session);
  });

  const studyDays = Object.keys(dailySessions).length;
  return Math.round((studyDays / 30) * 100);
}

function generateInsights(analysis: PatternAnalysis): Array<{ title: string; description: string }> {
  const insights: Array<{ title: string; description: string }> = [];
  
  if (analysis.bestHours.length === 0 || analysis.bestDays.length === 0) {
    insights.push({
      title: 'Comece a Estudar',
      description: 'Complete algumas sessões de estudo para gerar insights personalizados sobre seus padrões de aprendizado.'
    });
    return insights;
  }
  
  const bestHour = analysis.bestHours.reduce((best, current) => 
    current.performance > best.performance ? current : best
  );
  
  const bestDay = analysis.bestDays.reduce((best, current) => 
    current.performance > best.performance ? current : best
  );

  if (bestHour.performance > 0.7) {
    insights.push({
      title: 'Horário Ideal Identificado',
      description: `Você tem ${Math.round(bestHour.performance * 100)}% de performance às ${bestHour.hour}:00. Priorize matérias difíceis neste horário.`
    });
  }

  if (bestDay.performance > 0.7) {
    insights.push({
      title: 'Dia Mais Produtivo',
      description: `${bestDay.day} é seu dia mais produtivo (${Math.round(bestDay.performance * 100)}% performance). Considere estudar mais neste dia.`
    });
  }

  if (analysis.durationAnalysis.optimal > analysis.durationAnalysis.average) {
    insights.push({
      title: 'Aumente a Duração das Sessões',
      description: `Sessões de ${analysis.durationAnalysis.optimal} minutos mostram melhor performance que sua média atual de ${analysis.durationAnalysis.average} minutos.`
    });
  }

  const weakSubjects = analysis.subjectCorrelations.filter(s => s.averagePerformance < 0.6);
  if (weakSubjects.length > 0) {
    insights.push({
      title: 'Foque nos Pontos Fracos',
      description: `${weakSubjects.map(s => s.subject).join(', ')} precisa(m) de mais atenção. Considere estudar no seu horário mais produtivo.`
    });
  }

  return insights;
}