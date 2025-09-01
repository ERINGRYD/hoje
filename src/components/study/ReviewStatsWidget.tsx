import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { calculateReviewStats } from '@/utils/spacedRepetition';
import { getEnemyReviewData, checkAndUnlockEnemies } from '@/db/crud/enemyReviews';

interface ReviewStats {
  totalCards: number;
  readyForReview: number;
  overdueCards: number;
  averageEaseFactor: number;
  averageInterval: number;
  retentionRate: number;
  cardsLearning: number;
  cardsMature: number;
}

interface ReviewStatsWidgetProps {
  onStartReview?: () => void;
  className?: string;
}

const ReviewStatsWidget: React.FC<ReviewStatsWidgetProps> = ({
  onStartReview,
  className = ""
}) => {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Atualiza a cada minuto
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Desbloqueia inimigos prontos para revisão
      const unlockedEnemies = checkAndUnlockEnemies();
      
      // Aqui você carregaria os dados reais do banco
      // Por enquanto, dados de exemplo
      const mockStats: ReviewStats = {
        totalCards: 45,
        readyForReview: 12,
        overdueCards: 3,
        averageEaseFactor: 2.3,
        averageInterval: 7.5,
        retentionRate: 0.85,
        cardsLearning: 8,
        cardsMature: 37
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading review stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const getRetentionColor = (rate: number) => {
    if (rate >= 0.9) return "text-green-600";
    if (rate >= 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  const getEaseColor = (ease: number) => {
    if (ease >= 2.3) return "text-green-600";
    if (ease >= 2.0) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>Sistema de Revisão Inteligente</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ações Principais */}
        <div className="grid grid-cols-1 gap-2">
          {stats.readyForReview > 0 && (
            <Button 
              onClick={onStartReview}
              className="w-full flex items-center justify-between"
              variant={stats.overdueCards > 0 ? "destructive" : "default"}
            >
              <div className="flex items-center space-x-2">
                {stats.overdueCards > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>
                  {stats.overdueCards > 0 
                    ? `${stats.overdueCards} Revisões Atrasadas` 
                    : 'Iniciar Revisão'
                  }
                </span>
              </div>
              <Badge variant="secondary">
                {stats.readyForReview}
              </Badge>
            </Button>
          )}
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-primary">{stats.totalCards}</div>
            <div className="text-xs text-muted-foreground">Total de Cartões</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className={`text-xl font-bold ${getRetentionColor(stats.retentionRate)}`}>
              {(stats.retentionRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Taxa de Retenção</div>
          </div>
        </div>

        {/* Progresso de Aprendizado */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso de Aprendizado</span>
            <span className="text-sm text-muted-foreground">
              {stats.cardsMature}/{stats.totalCards}
            </span>
          </div>
          <Progress 
            value={(stats.cardsMature / stats.totalCards) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Aprendendo: {stats.cardsLearning}</span>
            <span>Dominados: {stats.cardsMature}</span>
          </div>
        </div>

        {/* Métricas Detalhadas */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Target className="h-3 w-3 text-blue-500" />
            <div>
              <div className={`text-sm font-medium ${getEaseColor(stats.averageEaseFactor)}`}>
                {stats.averageEaseFactor.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Facilidade Média</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-orange-500" />
            <div>
              <div className="text-sm font-medium">
                {Math.round(stats.averageInterval)}d
              </div>
              <div className="text-xs text-muted-foreground">Intervalo Médio</div>
            </div>
          </div>
        </div>

        {/* Indicadores de Status */}
        <div className="flex flex-wrap gap-1 pt-2">
          {stats.readyForReview > 0 && (
            <Badge variant="outline" className="text-xs flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Prontos: {stats.readyForReview}</span>
            </Badge>
          )}
          
          {stats.overdueCards > 0 && (
            <Badge variant="destructive" className="text-xs flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Atrasados: {stats.overdueCards}</span>
            </Badge>
          )}
          
          <Badge variant="secondary" className="text-xs flex items-center space-x-1">
            <TrendingUp className="h-3 w-3" />
            <span>Algoritmo SM-2</span>
          </Badge>
        </div>

        {/* Próximas Revisões */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center justify-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>Próxima atualização automática em 1 min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewStatsWidget;