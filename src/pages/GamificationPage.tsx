import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Sword, 
  Target, 
  Zap,
  Crown,
  Users,
  TrendingUp,
  Clock,
  Award,
  Star,
  Gamepad2,
  Loader2
} from 'lucide-react';
import { getUserProgress } from '@/db/crud/battle';
import { getEnemiesByRoom } from '@/db/crud/enemies';
import { useDB } from '@/contexts/DBProvider';
import type { UserProgress } from '@/types/battle';
import type { EnemyStats } from '@/types/enemy';
import UserProgressWidget from '@/components/battle/UserProgressWidget';

const GamificationPage = () => {
  const navigate = useNavigate();
  const { isLoading: isDBLoading, error: dbError } = useDB();
  
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [enemies, setEnemies] = useState<EnemyStats>({
    triagem: [],
    vermelha: [],
    amarela: [],
    verde: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDBLoading && !dbError) {
      loadData();
    }
  }, [isDBLoading, dbError]);

  const loadData = async () => {
    setLoading(true);
    try {
      const progress = getUserProgress();
      const enemyStats = getEnemiesByRoom();
      
      setUserProgress(progress);
      setEnemies(enemyStats);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isDBLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sistema de gamificação...</p>
        </div>
      </div>
    );
  }

  const totalEnemies = Object.values(enemies).flat().length;
  const criticalEnemies = enemies.vermelha.length;
  const dominatedEnemies = enemies.verde.length;
  const inProgressEnemies = enemies.amarela.length;
  const newEnemies = enemies.triagem.length;

  // Calculate progress percentage
  const progressPercentage = totalEnemies > 0 ? (dominatedEnemies / totalEnemies) * 100 : 0;

  // Achievement system
  const achievements = [
    {
      id: 'first_battle',
      title: 'Primeira Batalha',
      description: 'Complete sua primeira batalha',
      icon: Sword,
      unlocked: userProgress && userProgress.questionsAnswered > 0,
      color: 'text-blue-500'
    },
    {
      id: 'level_5',
      title: 'Nível 5',
      description: 'Alcance o nível 5',
      icon: Star,
      unlocked: userProgress && userProgress.currentLevel >= 5,
      color: 'text-yellow-500'
    },
    {
      id: 'dominate_10',
      title: 'Dominador',
      description: 'Domine 10 inimigos',
      icon: Crown,
      unlocked: dominatedEnemies >= 10,
      color: 'text-green-500'
    },
    {
      id: 'streak_7',
      title: 'Consistente',
      description: 'Mantenha uma sequência de 7 dias',
      icon: Trophy,
      unlocked: userProgress && userProgress.streakDays >= 7,
      color: 'text-purple-500'
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎮 Gamificação
              </h1>
              <p className="text-muted-foreground">
                Seu progresso nos jogos e desafios de estudo
              </p>
            </div>
          </div>
          
          {userProgress && <UserProgressWidget progress={userProgress} />}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userProgress?.currentLevel || 0}</p>
                  <p className="text-sm text-muted-foreground">Nível Atual</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Zap className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userProgress?.totalXp || 0}</p>
                  <p className="text-sm text-muted-foreground">XP Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Crown className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dominatedEnemies}</p>
                  <p className="text-sm text-muted-foreground">Dominados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unlockedAchievements}</p>
                  <p className="text-sm text-muted-foreground">Conquistas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progresso Geral
            </CardTitle>
            <CardDescription>
              Seu desempenho no sistema de batalhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Inimigos Dominados</span>
                <span>{dominatedEnemies}/{totalEnemies}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{newEnemies}</div>
                <div className="text-xs text-muted-foreground">Novos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{criticalEnemies}</div>
                <div className="text-xs text-muted-foreground">Críticos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{inProgressEnemies}</div>
                <div className="text-xs text-muted-foreground">Em Progresso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dominatedEnemies}</div>
                <div className="text-xs text-muted-foreground">Dominados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Conquistas
              <Badge variant="outline">
                {unlockedAchievements}/{achievements.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Desbloqueie conquistas ao atingir marcos importantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div 
                    key={achievement.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      achievement.unlocked 
                        ? 'bg-muted/50 border-primary/20' 
                        : 'bg-muted/20 border-muted opacity-60'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        achievement.unlocked ? achievement.color : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        {achievement.unlocked && (
                          <Badge variant="secondary" className="text-xs">
                            Desbloqueado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Game Modes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Modos de Jogo
            </CardTitle>
            <CardDescription>
              Diferentes formas de estudar e se divertir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-r from-red-50 to-yellow-50 dark:from-red-950/20 dark:to-yellow-950/20">
                <div className="flex items-center space-x-3 mb-3">
                  <Sword className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold">Campo de Batalha</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enfrente seus inimigos em batalhas épicas de conhecimento
                </p>
                <Button 
                  onClick={() => navigate('/battle')}
                  className="w-full bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-700 hover:to-yellow-700"
                >
                  Entrar na Batalha
                </Button>
              </div>
              
              <div className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <div className="flex items-center space-x-3 mb-3">
                  <Target className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold">Banco de Questões</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Gerencie e pratique com seu arsenal de questões
                </p>
                <Button 
                  onClick={() => navigate('/questions')}
                  variant="outline"
                  className="w-full"
                >
                  Ver Questões
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamificationPage;