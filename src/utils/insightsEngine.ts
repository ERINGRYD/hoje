import { StudySession } from '@/types/study';
import { PerformanceMetric } from '@/db/crud/performanceMetrics';

export interface StudyInsight {
  id: string;
  type: 'weakness' | 'strength' | 'pattern' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestion?: string;
  data?: Record<string, any>;
  createdAt: Date;
}

export interface StudyPattern {
  bestHours: number[];
  bestDays: string[];
  averageSessionDuration: number;
  productivityScore: number;
  preferredSubjects: string[];
  burnoutRisk: number;
}

/**
 * Analisa sessões de estudo e gera insights automáticos
 */
export const generateInsights = (
  sessions: StudySession[],
  metrics: PerformanceMetric[]
): StudyInsight[] => {
  const insights: StudyInsight[] = [];
  
  // Análise de pontos fracos
  const subjectPerformance = analyzeSubjectPerformance(sessions);
  Object.entries(subjectPerformance).forEach(([subject, perf]) => {
    if (perf.averagePerformance < 0.6) {
      insights.push({
        id: `weakness_${subject}`,
        type: 'weakness',
        title: `Dificuldade em ${subject}`,
        description: `Performance baixa detectada (${Math.round(perf.averagePerformance * 100)}%)`,
        severity: perf.averagePerformance < 0.4 ? 'critical' : 'high',
        actionable: true,
        suggestion: `Considere aumentar o tempo de estudo ou revisar a metodologia para ${subject}`,
        data: { subject, performance: perf.averagePerformance },
        createdAt: new Date()
      });
    }
  });

  // Análise de padrões temporais
  const timePatterns = analyzeTimePatterns(sessions);
  if (timePatterns.bestHours.length > 0) {
    insights.push({
      id: 'best_hours',
      type: 'pattern',
      title: 'Horários mais produtivos identificados',
      description: `Você tem melhor performance entre ${timePatterns.bestHours[0]}h-${timePatterns.bestHours[timePatterns.bestHours.length - 1]}h`,
      severity: 'low',
      actionable: true,
      suggestion: 'Priorize estudar matérias difíceis nestes horários',
      data: { bestHours: timePatterns.bestHours },
      createdAt: new Date()
    });
  }

  // Análise de burnout
  const burnoutRisk = analyzeBurnoutRisk(sessions, metrics);
  if (burnoutRisk > 0.7) {
    insights.push({
      id: 'burnout_risk',
      type: 'alert',
      title: 'Risco de burnout detectado',
      description: 'Padrão de sobrecarga identificado nos últimos dias',
      severity: 'critical',
      actionable: true,
      suggestion: 'Considere reduzir a carga de estudos e incluir mais pausas',
      data: { burnoutRisk },
      createdAt: new Date()
    });
  }

  // Análise de consistência
  const consistency = analyzeConsistency(sessions);
  if (consistency < 0.5) {
    insights.push({
      id: 'consistency',
      type: 'recommendation',
      title: 'Melhore a consistência dos estudos',
      description: `Consistência atual: ${Math.round(consistency * 100)}%`,
      severity: 'medium',
      actionable: true,
      suggestion: 'Estabeleça uma rotina fixa de estudos para melhorar os resultados',
      data: { consistency },
      createdAt: new Date()
    });
  }

  return insights;
};

/**
 * Analisa padrões temporais de estudo
 */
export const analyzeTimePatterns = (sessions: StudySession[]): StudyPattern => {
  const hourPerformance: Record<number, number[]> = {};
  const dayPerformance: Record<string, number[]> = {};
  const subjectTime: Record<string, number> = {};
  
  sessions.forEach(session => {
    const hour = session.startTime.getHours();
    const day = session.startTime.toLocaleDateString('pt-BR', { weekday: 'long' });
    const performanceScore = session.performance === 'high' ? 1 : session.performance === 'medium' ? 0.6 : 0.3;
    
    if (!hourPerformance[hour]) hourPerformance[hour] = [];
    if (!dayPerformance[day]) dayPerformance[day] = [];
    
    hourPerformance[hour].push(performanceScore);
    dayPerformance[day].push(performanceScore);
    
    subjectTime[session.subject] = (subjectTime[session.subject] || 0) + session.duration;
  });

  // Encontrar melhores horários
  const bestHours = Object.entries(hourPerformance)
    .map(([hour, scores]) => ({
      hour: parseInt(hour),
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .filter(h => h.avgScore >= 0.7)
    .sort((a, b) => b.avgScore - a.avgScore)
    .map(h => h.hour);

  // Encontrar melhores dias
  const bestDays = Object.entries(dayPerformance)
    .map(([day, scores]) => ({
      day,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .filter(d => d.avgScore >= 0.7)
    .sort((a, b) => b.avgScore - a.avgScore)
    .map(d => d.day);

  // Calcular duração média
  const averageSessionDuration = sessions.length > 0 
    ? sessions.reduce((total, s) => total + s.duration, 0) / sessions.length 
    : 0;

  // Matérias preferidas (mais tempo gasto)
  const preferredSubjects = Object.entries(subjectTime)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([subject]) => subject);

  return {
    bestHours,
    bestDays,
    averageSessionDuration,
    productivityScore: calculateProductivityScore(sessions),
    preferredSubjects,
    burnoutRisk: analyzeBurnoutRisk(sessions, [])
  };
};

const analyzeSubjectPerformance = (sessions: StudySession[]) => {
  const subjectData: Record<string, { performances: number[], totalTime: number }> = {};
  
  sessions.forEach(session => {
    if (!subjectData[session.subject]) {
      subjectData[session.subject] = { performances: [], totalTime: 0 };
    }
    
    const score = session.performance === 'high' ? 1 : session.performance === 'medium' ? 0.6 : 0.3;
    subjectData[session.subject].performances.push(score);
    subjectData[session.subject].totalTime += session.duration;
  });

  return Object.fromEntries(
    Object.entries(subjectData).map(([subject, data]) => [
      subject,
      {
        averagePerformance: data.performances.reduce((a, b) => a + b, 0) / data.performances.length,
        totalTime: data.totalTime,
        sessionCount: data.performances.length
      }
    ])
  );
};

const analyzeBurnoutRisk = (sessions: StudySession[], metrics: PerformanceMetric[]): number => {
  const last7Days = sessions.filter(s => {
    const daysDiff = (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  if (last7Days.length === 0) return 0;

  const dailyHours = last7Days.reduce((total, s) => total + s.duration, 0) / 60 / 7;
  const avgPerformance = last7Days.reduce((total, s) => {
    const score = s.performance === 'high' ? 1 : s.performance === 'medium' ? 0.6 : 0.3;
    return total + score;
  }, 0) / last7Days.length;

  // Risco alto se muitas horas + baixa performance
  const hoursRisk = dailyHours > 8 ? 0.8 : dailyHours > 6 ? 0.5 : 0.2;
  const performanceRisk = avgPerformance < 0.5 ? 0.8 : avgPerformance < 0.7 ? 0.4 : 0.1;

  return Math.min((hoursRisk + performanceRisk) / 2, 1);
};

const analyzeConsistency = (sessions: StudySession[]): number => {
  const last30Days = sessions.filter(s => {
    const daysDiff = (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });

  if (last30Days.length === 0) return 0;

  // Agrupar por dia
  const dailySessions: Record<string, StudySession[]> = {};
  last30Days.forEach(session => {
    const day = session.startTime.toDateString();
    if (!dailySessions[day]) dailySessions[day] = [];
    dailySessions[day].push(session);
  });

  const studyDays = Object.keys(dailySessions).length;
  return studyDays / 30; // Consistência = % de dias estudados
};

const calculateProductivityScore = (sessions: StudySession[]): number => {
  if (sessions.length === 0) return 0;
  
  const completedSessions = sessions.filter(s => s.completed).length;
  const avgPerformance = sessions.reduce((total, s) => {
    const score = s.performance === 'high' ? 1 : s.performance === 'medium' ? 0.6 : 0.3;
    return total + score;
  }, 0) / sessions.length;

  const completionRate = completedSessions / sessions.length;
  return (completionRate * 0.6 + avgPerformance * 0.4) * 100;
};