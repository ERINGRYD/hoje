import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Sword, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  Trophy, 
  Zap,
  Users,
  FileText,
  TrendingUp,
  Crown,
  Loader2
} from 'lucide-react';
import { getEnemiesByRoom, getEnemyQuestions } from '@/db/crud/enemies';
import { getUserProgress } from '@/db/crud/battle';
import { checkAndUnlockEnemies, completeEnemyReview } from '@/db/crud/enemyReviews';
import { useStudyContext } from '@/contexts/StudyContext';
import { useDB } from '@/contexts/DBProvider';
import type { Room, UserProgress } from '@/types/battle';
import type { Enemy, EnemyStats } from '@/types/enemy';
import BattleArena from '@/components/battle/BattleArena';
import UserProgressWidget from '@/components/battle/UserProgressWidget';
import { EnemyCard } from '@/components/battle/EnemyCard';

const BattleFieldPage = () => {
  // Check if database is ready first
  const { isLoading: isDBLoading, error: dbError } = useDB();
  
  // Always call useStudyContext (hooks must be called unconditionally)
  const { subjects, isDBLoading: contextDBLoading, dbError: contextDBError } = useStudyContext();

  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [enemies, setEnemies] = useState<EnemyStats>({
    triagem: [],
    vermelha: [],
    amarela: [],
    verde: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [battleMode, setBattleMode] = useState(false);
  const [selectedEnemy, setSelectedEnemy] = useState<Enemy | null>(null);

  const rooms = [
    {
      id: 'triagem' as Room,
      name: 'Triagem',
      icon: Filter,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      description: 'Inimigos novos ou com poucas batalhas'
    },
    {
      id: 'vermelha' as Room,
      name: 'Sala Vermelha',
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      description: 'Taxa de acerto < 70% - Estado crítico'
    },
    {
      id: 'amarela' as Room,
      name: 'Sala Amarela',
      icon: Target,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      description: 'Taxa de acerto 70-85% - Em desenvolvimento'
    },
    {
      id: 'verde' as Room,
      name: 'Sala Verde',
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      description: 'Taxa de acerto > 85% - Dominados'
    }
  ];

  useEffect(() => {
    // Only load data when database is ready and not loading
    if (!isDBLoading && !dbError && !contextDBLoading && !contextDBError) {
      loadData();
    }
  }, [isDBLoading, dbError, contextDBLoading, contextDBError]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check and unlock enemies that are ready for review
      checkAndUnlockEnemies();
      
      const enemyStats = getEnemiesByRoom();
      const progress = getUserProgress();
      
      console.log('🔍 BattleFieldPage - Loaded enemies:', enemyStats);
      console.log('🔍 BattleFieldPage - Total enemies:', Object.values(enemyStats).flat().length);
      console.log('🔍 BattleFieldPage - Enemies by room:', {
        triagem: enemyStats.triagem.length,
        vermelha: enemyStats.vermelha.length,
        amarela: enemyStats.amarela.length,
        verde: enemyStats.verde.length
      });
      
      setEnemies(enemyStats);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all enemies from all rooms and apply filters
  const getAllFilteredEnemies = () => {
    const allEnemies = Object.values(enemies).flat();
    
    return allEnemies.filter(enemy => {
      const matchesSearch = enemy.topicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           enemy.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubject = selectedSubject === 'all' || enemy.subjectName === selectedSubject;
      const matchesRoom = selectedRoom === 'all' || enemy.room === selectedRoom;
      
      return matchesSearch && matchesSubject && matchesRoom;
    }).sort((a, b) => {
      // Priority order: vermelha (critical) -> amarela -> triagem -> verde
      const roomPriority = { vermelha: 0, amarela: 1, triagem: 2, verde: 3 };
      const aPriority = roomPriority[a.room as keyof typeof roomPriority] ?? 4;
      const bPriority = roomPriority[b.room as keyof typeof roomPriority] ?? 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same room, sort by last battle date (oldest first for practice)
      if (a.lastBattleDate && b.lastBattleDate) {
        return a.lastBattleDate.getTime() - b.lastBattleDate.getTime();
      }
      if (a.lastBattleDate && !b.lastBattleDate) return 1;
      if (!a.lastBattleDate && b.lastBattleDate) return -1;
      
      return 0;
    });
  };

  const handleEnemyStatusUpdate = (enemyId: string, updates: Partial<Enemy>) => {
    // Update the enemy in the local state when status changes (e.g., auto-unlock)
    setEnemies(prev => {
      const newEnemies = { ...prev };
      
      // Find and update the enemy in whichever room it's in
      Object.keys(newEnemies).forEach(roomKey => {
        const room = roomKey as Room;
        const enemyIndex = newEnemies[room].findIndex(e => e.id === enemyId);
        if (enemyIndex !== -1) {
          newEnemies[room][enemyIndex] = { ...newEnemies[room][enemyIndex], ...updates };
        }
      });
      
      return newEnemies;
    });
  };

  const handleBattleEnemy = (enemy: Enemy) => {
    // Only allow battle if enemy is not blocked
    if (!enemy.isBlocked) {
      setSelectedEnemy(enemy);
      setBattleMode(true);
    }
  };

  const handleBattleComplete = () => {
    // Complete enemy review if there was a selected enemy
    if (selectedEnemy) {
      completeEnemyReview(selectedEnemy.topicId);
    }
    
    setBattleMode(false);
    setSelectedEnemy(null);
    loadData(); // Reload to update enemy stats and rooms
  };

  // Show loading screen if database is loading or if there's an error
  if (isDBLoading || contextDBLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando Campo de Batalha...</p>
        </div>
      </div>
    );
  }

  if (dbError || contextDBError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Erro ao carregar o banco de dados: {dbError || contextDBError}</p>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalEnemies = Object.values(enemies).flat().length;
  const criticalEnemies = enemies.vermelha.length;
  const dominatedEnemies = enemies.verde.length;
  const totalQuestions = Object.values(enemies).flat().reduce((sum, enemy) => sum + enemy.totalQuestions, 0);

  if (battleMode && selectedEnemy) {
    const enemyQuestions = getEnemyQuestions(selectedEnemy.topicId);
    return (
      <BattleArena
        questionIds={enemyQuestions.map(q => q.id)}
        room={selectedEnemy.room}
        onComplete={handleBattleComplete}
        onBack={() => setBattleMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-yellow-500">
              <Sword className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-yellow-600 bg-clip-text text-transparent">
                ⚔️ Campo de Batalha
              </h1>
              <p className="text-muted-foreground">
                Enfrente seus inimigos e conquiste o conhecimento
              </p>
            </div>
          </div>
          
          {userProgress && <UserProgressWidget progress={userProgress} />}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEnemies}</p>
                  <p className="text-sm text-muted-foreground">Total de Inimigos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{criticalEnemies}</p>
                  <p className="text-sm text-muted-foreground">Críticos</p>
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Questões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar inimigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por matéria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as matérias</SelectItem>
              {subjects
                .filter((subject) => subject.name && subject.name.trim() !== '')
                .map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por sala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as salas</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  <div className="flex items-center gap-2">
                    <room.icon className="h-4 w-4" />
                    {room.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unified Enemy Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sword className="h-5 w-5" />
              Seus Inimigos
              <Badge variant="outline">
                {getAllFilteredEnemies().length} inimigos
              </Badge>
            </CardTitle>
            <CardDescription>
              Inimigos organizados por prioridade - críticos primeiro, depois em desenvolvimento
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-muted rounded-md animate-pulse" />
                ))}
              </div>
            ) : getAllFilteredEnemies().length === 0 ? (
              <div className="text-center py-12">
                <Sword className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  Nenhum inimigo encontrado
                </p>
                <p className="text-muted-foreground">
                  {totalEnemies === 0 
                    ? 'Adicione questões para criar novos inimigos' 
                    : 'Tente ajustar os filtros para encontrar seus inimigos'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAllFilteredEnemies().map((enemy) => (
                  <EnemyCard
                    key={enemy.id}
                    enemy={enemy}
                    onBattle={handleBattleEnemy}
                    onStatusUpdate={handleEnemyStatusUpdate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BattleFieldPage;
