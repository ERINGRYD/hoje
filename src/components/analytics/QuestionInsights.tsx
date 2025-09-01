import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QuestionAttempt } from '@/types/battle';
import { 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  BookOpen,
  Clock,
  Brain,
  Trophy,
  Lightbulb
} from 'lucide-react';

interface QuestionInsightsProps {
  attempts: (QuestionAttempt & { 
    questionTitle?: string; 
    difficulty?: 'easy' | 'medium' | 'hard'; 
    room?: 'triagem' | 'vermelha' | 'amarela' | 'verde';
    topicName?: string;
    subjectName?: string;
  })[];
}

export function QuestionInsights({ attempts }: QuestionInsightsProps) {
  const insights = useMemo(() => {
    if (!attempts?.length) {
      return {
        weakSubjects: [],
        improvementAreas: [],
        strengths: [],
        recommendations: [],
        confidenceIssues: [],
        timeManagement: null
      };
    }

    // Analyze weak subjects
    const subjectStats = attempts.reduce((acc, attempt) => {
      const subject = attempt.subjectName || 'Sem Matéria';
      if (!acc[subject]) {
        acc[subject] = { total: 0, correct: 0, topics: new Set() };
      }
      acc[subject].total++;
      if (attempt.isCorrect) acc[subject].correct++;
      if (attempt.topicName) acc[subject].topics.add(attempt.topicName);
      return acc;
    }, {} as Record<string, { total: number; correct: number; topics: Set<string> }>);

    const weakSubjects = Object.entries(subjectStats)
      .map(([subject, stats]) => ({
        subject,
        accuracy: (stats.correct / stats.total) * 100,
        total: stats.total,
        topicsCount: stats.topics.size
      }))
      .filter(s => s.total >= 5 && s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Analyze confidence issues
    const confidenceStats = attempts.reduce((acc, attempt) => {
      const key = `${attempt.confidenceLevel}-${attempt.isCorrect}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overconfident = (confidenceStats['certeza-false'] || 0);
    const underconfident = (confidenceStats['chute-true'] || 0);
    
    const confidenceIssues = [];
    if (overconfident > 5) {
      confidenceIssues.push({
        type: 'overconfident',
        count: overconfident,
        message: 'Você tem muita confiança em respostas incorretas'
      });
    }
    if (underconfident > 5) {
      confidenceIssues.push({
        type: 'underconfident',
        count: underconfident,
        message: 'Você acerta questões que acha que são "chute"'
      });
    }

    // Time management analysis
    const timedAttempts = attempts.filter(a => a.timeTaken);
    let timeManagement = null;
    
    if (timedAttempts.length > 10) {
      const avgTime = timedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / timedAttempts.length;
      const fastCorrect = timedAttempts.filter(a => a.isCorrect && (a.timeTaken || 0) < avgTime * 0.7).length;
      const slowIncorrect = timedAttempts.filter(a => !a.isCorrect && (a.timeTaken || 0) > avgTime * 1.3).length;
      
      timeManagement = {
        avgTime: Math.round(avgTime),
        fastCorrect,
        slowIncorrect,
        efficiency: (fastCorrect / timedAttempts.length) * 100
      };
    }

    // Improvement areas by room
    const roomStats = attempts.reduce((acc, attempt) => {
      const room = attempt.room || 'triagem';
      if (!acc[room]) {
        acc[room] = { total: 0, correct: 0 };
      }
      acc[room].total++;
      if (attempt.isCorrect) acc[room].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number }>);

    const improvementAreas = Object.entries(roomStats)
      .map(([room, stats]) => ({
        room,
        accuracy: (stats.correct / stats.total) * 100,
        total: stats.total
      }))
      .filter(r => r.total >= 3 && r.accuracy < 80)
      .sort((a, b) => a.accuracy - b.accuracy);

    // Identify strengths
    const strengths = [];
    const overallAccuracy = (attempts.filter(a => a.isCorrect).length / attempts.length) * 100;
    
    if (overallAccuracy > 80) {
      strengths.push('Excelente taxa de acurácia geral');
    }
    
    const hardQuestions = attempts.filter(a => a.difficulty === 'hard');
    if (hardQuestions.length > 0) {
      const hardAccuracy = (hardQuestions.filter(a => a.isCorrect).length / hardQuestions.length) * 100;
      if (hardAccuracy > 70) {
        strengths.push('Boa performance em questões difíceis');
      }
    }

    const recentAttempts = attempts.slice(0, 20);
    if (recentAttempts.length >= 10) {
      const recentAccuracy = (recentAttempts.filter(a => a.isCorrect).length / recentAttempts.length) * 100;
      const olderAttempts = attempts.slice(20, 40);
      if (olderAttempts.length >= 10) {
        const olderAccuracy = (olderAttempts.filter(a => a.isCorrect).length / olderAttempts.length) * 100;
        if (recentAccuracy > olderAccuracy + 10) {
          strengths.push('Melhoria consistente na performance');
        }
      }
    }

    // Generate recommendations
    const recommendations = [];
    
    if (weakSubjects.length > 0) {
      recommendations.push({
        type: 'study',
        title: `Revisar ${weakSubjects[0].subject}`,
        description: `Acurácia de apenas ${weakSubjects[0].accuracy.toFixed(1)}% nesta matéria`,
        priority: 'high'
      });
    }

    if (improvementAreas.length > 0 && improvementAreas[0].room === 'vermelha') {
      recommendations.push({
        type: 'practice',
        title: 'Focar na sala vermelha',
        description: 'Questões que você mais erra precisam de atenção especial',
        priority: 'high'
      });
    }

    if (confidenceIssues.length > 0) {
      recommendations.push({
        type: 'confidence',
        title: 'Calibrar confiança',
        description: 'Trabalhar na autoavaliação da certeza das respostas',
        priority: 'medium'
      });
    }

    if (timeManagement && timeManagement.efficiency < 30) {
      recommendations.push({
        type: 'speed',
        title: 'Melhorar velocidade',
        description: 'Treinar para responder questões mais rapidamente',
        priority: 'low'
      });
    }

    return {
      weakSubjects,
      improvementAreas,
      strengths,
      recommendations,
      confidenceIssues,
      timeManagement
    };
  }, [attempts]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-study-danger';
      case 'medium': return 'text-study-warning';
      case 'low': return 'text-study-info';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'study': return BookOpen;
      case 'practice': return Target;
      case 'confidence': return Brain;
      case 'speed': return Clock;
      default: return Lightbulb;
    }
  };

  return (
    <div className="space-y-6">
      {/* Strengths */}
      {insights.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-study-success" />
              Pontos Fortes
            </CardTitle>
            <CardDescription>Areas onde você está se saindo bem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-study-success rounded-full" />
                  <span>{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-study-accent" />
              Recomendações
            </CardTitle>
            <CardDescription>Sugestões para melhorar sua performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.recommendations.map((rec, index) => {
                const Icon = getPriorityIcon(rec.type);
                return (
                  <Alert key={index}>
                    <Icon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{rec.title}</div>
                          <div className="text-sm text-muted-foreground">{rec.description}</div>
                        </div>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weak Subjects */}
      {insights.weakSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-study-danger" />
              Matérias que Precisam de Atenção
            </CardTitle>
            <CardDescription>Matérias com baixa taxa de acurácia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.weakSubjects.map((subject, index) => (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-study-danger" />
                      <span className="font-medium">{subject.subject}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {subject.accuracy.toFixed(1)}% • {subject.total} questões • {subject.topicsCount} tópicos
                      </span>
                    </div>
                  </div>
                  <Progress value={subject.accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence Issues */}
      {insights.confidenceIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-study-warning" />
              Questões de Confiança
            </CardTitle>
            <CardDescription>Análise da calibração da sua autoconfiança</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.confidenceIssues.map((issue, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{issue.message}</span>
                      <Badge variant="outline">{issue.count} casos</Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Management */}
      {insights.timeManagement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-study-info" />
              Gestão de Tempo
            </CardTitle>
            <CardDescription>Análise do seu tempo de resposta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{insights.timeManagement.avgTime}s</div>
                <div className="text-sm text-muted-foreground">Tempo Médio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-study-success">{insights.timeManagement.fastCorrect}</div>
                <div className="text-sm text-muted-foreground">Respostas Rápidas e Corretas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-study-danger">{insights.timeManagement.slowIncorrect}</div>
                <div className="text-sm text-muted-foreground">Respostas Lentas e Incorretas</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Eficiência</span>
                <span className="text-sm text-muted-foreground">{insights.timeManagement.efficiency.toFixed(1)}%</span>
              </div>
              <Progress value={insights.timeManagement.efficiency} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {attempts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sem Dados Suficientes</CardTitle>
            <CardDescription>Responda mais questões para gerar insights personalizados</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Complete pelo menos 10 questões para ver insights detalhados sobre sua performance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}