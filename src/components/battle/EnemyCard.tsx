import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sword, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Calendar,
  Trophy,
  Zap,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';
import { Enemy } from '@/types/enemy';
import { cn } from '@/lib/utils';

interface EnemyCardProps {
  enemy: Enemy;
  onBattle: (enemy: Enemy) => void;
  onStatusUpdate?: (enemyId: string, updates: Partial<Enemy>) => void;
}

// Room configuration object for better maintainability
const ROOM_CONFIG = {
  triagem: {
    icon: Target,
    gradient: 'from-gray-500 to-gray-600',
    name: 'Triagem',
    borderColor: 'border-l-gray-500',
    badgeColor: 'border-gray-500 text-gray-600',
    buttonColor: '',
    statusBg: 'bg-gray-50 text-gray-700',
    progressColor: '[&>div]:bg-gray-500'
  },
  vermelha: {
    icon: AlertTriangle,
    gradient: 'from-red-500 to-red-600',
    name: 'Crítico',
    borderColor: 'border-l-red-500',
    badgeColor: 'border-red-500 text-red-600',
    buttonColor: 'border-red-500 text-red-600 hover:bg-red-50',
    statusBg: 'bg-red-50 text-red-700',
    progressColor: '[&>div]:bg-red-500'
  },
  amarela: {
    icon: Target,
    gradient: 'from-yellow-500 to-yellow-600',
    name: 'Desenvolvimento',
    borderColor: 'border-l-yellow-500',
    badgeColor: 'border-yellow-500 text-yellow-600',
    buttonColor: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50',
    statusBg: 'bg-yellow-50 text-yellow-700',
    progressColor: '[&>div]:bg-yellow-500'
  },
  verde: {
    icon: CheckCircle,
    gradient: 'from-green-500 to-green-600',
    name: 'Dominado',
    borderColor: 'border-l-green-500',
    badgeColor: 'border-green-500 text-green-600',
    buttonColor: 'border-green-500 text-green-600 hover:bg-green-50',
    statusBg: 'bg-green-50 text-green-700',
    progressColor: '[&>div]:bg-green-500'
  }
} as const;

type RoomType = keyof typeof ROOM_CONFIG;

// Custom hook to manage enemy status and auto-unlock
const useEnemyStatus = (enemy: Enemy, onStatusUpdate?: (enemyId: string, updates: Partial<Enemy>) => void) => {
  const [currentEnemy, setCurrentEnemy] = useState(enemy);

  // Check if enemy should be unlocked
  const checkAndUpdateStatus = () => {
    if (enemy.isBlocked && enemy.nextReviewDate) {
      const now = new Date();
      if (enemy.nextReviewDate <= now) {
        const updatedEnemy = { ...enemy, isBlocked: false };
        setCurrentEnemy(updatedEnemy);
        onStatusUpdate?.(enemy.id, { isBlocked: false });
        return updatedEnemy;
      }
    }
    return enemy;
  };

  useEffect(() => {
    // Initial check
    checkAndUpdateStatus();

    // Set up interval to check every minute
    const interval = setInterval(checkAndUpdateStatus, 60000);

    return () => clearInterval(interval);
  }, [enemy.isBlocked, enemy.nextReviewDate, enemy.id, onStatusUpdate]);

  // Update local state when enemy prop changes
  useEffect(() => {
    setCurrentEnemy(enemy);
  }, [enemy]);

  return currentEnemy;
};

// Utility functions
const formatDate = (date?: Date) => {
  if (!date) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(date);
};

const formatNextReviewDate = (date?: Date) => {
  if (!date) return 'Não agendada';
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays < 0) return 'Disponível agora';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
};

const getStatusMessage = (enemy: Enemy) => {
  // Check if should be unlocked but still blocked (edge case)
  if (enemy.isBlocked && enemy.nextReviewDate) {
    const today = new Date();
    const diffTime = enemy.nextReviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return 'Desbloqueado! Pronto para revisão.';
    }
    
    return `Bloqueado até ${formatNextReviewDate(enemy.nextReviewDate)}. Revisão ${enemy.totalReviews + 1}/5.`;
  }
  
  if (enemy.questionsAnswered === 0) {
    return 'Pronto para primeira batalha!';
  }
  
  if (enemy.room === 'verde') {
    return 'Inimigo dominado! Continue praticando para manter o domínio.';
  }
  
  if (enemy.room === 'vermelha') {
    return 'Estado crítico! Este inimigo precisa de atenção urgente.';
  }
  
  return 'Em desenvolvimento. Continue lutando para dominar este inimigo!';
};

export const EnemyCard: React.FC<EnemyCardProps> = ({ enemy, onBattle, onStatusUpdate }) => {
  // Use custom hook to manage status updates
  const currentEnemy = useEnemyStatus(enemy, onStatusUpdate);
  
  // Memoize room configuration to avoid recalculation
  const roomConfig = useMemo(() => {
    const roomType = (currentEnemy.room as RoomType) || 'triagem';
    return ROOM_CONFIG[roomType];
  }, [currentEnemy.room]);

  // Memoize computed values
  const statusMessage = useMemo(() => getStatusMessage(currentEnemy), [currentEnemy]);
  const nextReviewFormatted = useMemo(() => formatNextReviewDate(currentEnemy.nextReviewDate), [currentEnemy.nextReviewDate]);
  const lastBattleFormatted = useMemo(() => formatDate(currentEnemy.lastBattleDate), [currentEnemy.lastBattleDate]);

  const RoomIcon = roomConfig.icon;

  // Check if enemy is truly available (not blocked and either no review date or review date passed)
  const isAvailable = !currentEnemy.isBlocked && (
    !currentEnemy.nextReviewDate || 
    currentEnemy.nextReviewDate <= new Date()
  );

  return (
    <Card className={cn(
      "relative overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer",
      "border-l-4",
      roomConfig.borderColor
    )}>
      {/* Background gradient effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-5 group-hover:opacity-10 transition-opacity",
        roomConfig.gradient
      )} />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentEnemy.subjectColor }}
            />
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {currentEnemy.topicName}
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", roomConfig.badgeColor)}
                >
                  <RoomIcon className="h-3 w-3 mr-1" />
                  {roomConfig.name}
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm">
                {currentEnemy.subjectName}
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBattle(currentEnemy)}
            disabled={!isAvailable}
            className={cn(
              "gap-2 hover:scale-105 transition-transform",
              !isAvailable && "opacity-50 cursor-not-allowed",
              isAvailable && roomConfig.buttonColor
            )}
          >
            {!isAvailable ? (
              <>
                <Lock className="h-4 w-4" />
                Bloqueado
              </>
            ) : (
              <>
                <Sword className="h-4 w-4" />
                Batalhar
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Questões</span>
            </div>
            <p className="text-lg font-bold">{currentEnemy.totalQuestions}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Acertos</span>
            </div>
            <p className="text-lg font-bold">
              {currentEnemy.questionsAnswered > 0 ? 
                `${currentEnemy.questionsCorrect}/${currentEnemy.questionsAnswered}` : 
                '0/0'
              }
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">XP</span>
            </div>
            <p className="text-lg font-bold">{currentEnemy.totalXpEarned}</p>
          </div>
        </div>

        {/* Accuracy Rate Progress */}
        {currentEnemy.questionsAnswered > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Taxa de Acerto</span>
              <Badge 
                variant={currentEnemy.accuracyRate >= 85 ? 'default' : 
                       currentEnemy.accuracyRate >= 70 ? 'secondary' : 'destructive'}
              >
                {currentEnemy.accuracyRate.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={currentEnemy.accuracyRate} 
              className={cn("h-2", roomConfig.progressColor)}
            />
          </div>
        )}

        {/* Review Information */}
        {currentEnemy.nextReviewDate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Próxima revisão:</span>
              </div>
              <Badge 
                variant={!isAvailable ? "destructive" : "default"}
                className="text-xs"
              >
                {!isAvailable ? 
                  <Lock className="h-3 w-3 mr-1" /> : 
                  <Unlock className="h-3 w-3 mr-1" />
                }
                {nextReviewFormatted}
              </Badge>
            </div>
            
            {/* Review Progress */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ciclo de revisão:</span>
              <span>{currentEnemy.currentReviewCycle}/5 • {currentEnemy.totalReviews} revisões</span>
            </div>
          </div>
        )}

        {/* Last Battle Date */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Última batalha:</span>
          </div>
          <span className="font-medium">{lastBattleFormatted}</span>
        </div>

        {/* Status Message */}
        <div className={cn(
          "text-xs p-2 rounded-md",
          !isAvailable && "bg-destructive/10 text-destructive border border-destructive/20",
          isAvailable && roomConfig.statusBg
        )}>
          {statusMessage}
        </div>
      </CardContent>
    </Card>
  );
};