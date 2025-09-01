import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudySession } from '@/types/study';
import { PerformanceMetric } from '@/db/crud/performanceMetrics';
import { generateInsights, StudyInsight } from '@/utils/insightsEngine';
import { predictPerformance, PerformancePrediction } from '@/utils/performancePrediction';
import { 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  Clock, 
  Trophy,
  BookOpen,
  Zap,
  Calendar,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightsPanelProps {
  sessions: StudySession[];
  metrics: PerformanceMetric[];
  targetExamDate?: Date;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  sessions, 
  metrics, 
  targetExamDate 
}) => {
  const insights = useMemo(() => {
    return generateInsights(sessions, metrics);
  }, [sessions, metrics]);

  const predictions = useMemo(() => {
    return predictPerformance(sessions, metrics, targetExamDate);
  }, [sessions, metrics, targetExamDate]);

  const getInsightIcon = (type: StudyInsight['type']) => {
    switch (type) {
      case 'weakness': return AlertTriangle;
      case 'strength': return Trophy;
      case 'pattern': return TrendingUp;
      case 'recommendation': return Lightbulb;
      case 'alert': return AlertTriangle;
      default: return Lightbulb;
    }
  };

  const getInsightColor = (severity: StudyInsight['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBadgeVariant = (severity: StudyInsight['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatTimeToMastery = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    return `${months}m`;
  };

  return (
    <div className="space-y-6">
      {/* Performance Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Predições de Performance
          </CardTitle>
          <CardDescription>
            Baseado no seu histórico de estudos e padrões identificados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className={cn('text-3xl font-bold', getPerformanceColor(predictions.examPerformance))}>
                {predictions.examPerformance}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Performance Prevista no Exame
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Confiança: {Math.round(predictions.confidenceLevel * 100)}%
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-blue-500">
                {Math.round(predictions.goalAchievementProbability * 100)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Chance de Atingir Metas
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-500">
                {predictions.recommendedStudyTime}h
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Horas Recomendadas/Dia
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-500">
                {Object.keys(predictions.timeToMastery).length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Matérias em Progresso
              </div>
            </div>
          </div>

          {/* Time to Mastery */}
          {Object.keys(predictions.timeToMastery).length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Tempo para Domínio
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(predictions.timeToMastery).map(([subject, hours]) => (
                  <div key={subject} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{subject}</span>
                    <Badge variant="outline">{formatTimeToMastery(hours)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weakness Improvement */}
          {Object.keys(predictions.weaknessImprovement).length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa de Melhoria (Pontos Fracos)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(predictions.weaknessImprovement).map(([subject, rate]) => (
                  <div key={subject} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{subject}</span>
                    <Badge variant="secondary">+{rate}%/h</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Insights Automáticos
          </CardTitle>
          <CardDescription>
            Análises baseadas nos seus padrões de estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Continue estudando para gerar insights personalizados!</p>
              </div>
            ) : (
              insights.map((insight) => {
                const Icon = getInsightIcon(insight.type);
                return (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={cn('h-5 w-5 mt-0.5', getInsightColor(insight.severity))} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge variant={getSeverityBadgeVariant(insight.severity)} className="text-xs">
                            {insight.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {insight.description}
                        </p>
                        {insight.suggestion && (
                          <Alert className="mt-3">
                            <Lightbulb className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              <strong>Sugestão:</strong> {insight.suggestion}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Ações Recomendadas
          </CardTitle>
          <CardDescription>
            Com base nos insights gerados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.filter(i => i.actionable).slice(0, 4).map((insight) => (
              <Button
                key={insight.id}
                variant="outline"
                className="h-auto p-4 text-left justify-start"
                onClick={() => {
                  // TODO: Implement action handler
                  console.log('Action for insight:', insight.id);
                }}
              >
                <div>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {insight.suggestion?.substring(0, 50)}...
                  </div>
                </div>
              </Button>
            ))}
            
            {insights.filter(i => i.actionable).length === 0 && (
              <div className="col-span-2 text-center py-4 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma ação específica recomendada no momento.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            Recomendações de Estudo
          </CardTitle>
          <CardDescription>
            Otimizações para seus próximos estudos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo de Estudo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Recomendamos {predictions.recommendedStudyTime} horas por dia baseado em suas metas e performance atual.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Foco Prioritário
                </h4>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(predictions.weaknessImprovement).length > 0 
                    ? `Concentre-se em: ${Object.keys(predictions.weaknessImprovement).slice(0, 2).join(', ')}`
                    : 'Mantenha o ritmo atual de estudos'
                  }
                </p>
              </div>
            </div>

            {predictions.goalAchievementProbability < 0.6 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Sua probabilidade de atingir as metas está baixa ({Math.round(predictions.goalAchievementProbability * 100)}%). 
                  Considere ajustar seu plano de estudos ou aumentar o tempo dedicado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};