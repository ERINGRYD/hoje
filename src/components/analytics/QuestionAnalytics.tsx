import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { QuestionAttempt } from '@/types/battle';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Award
} from 'lucide-react';

interface QuestionAnalyticsProps {
  attempts: (QuestionAttempt & { 
    questionTitle?: string; 
    difficulty?: 'easy' | 'medium' | 'hard'; 
    room?: 'triagem' | 'vermelha' | 'amarela' | 'verde';
    topicName?: string;
    subjectName?: string;
  })[];
  accuracyByRoom: Record<string, { total: number; correct: number; accuracy: number }>;
  errorAnalysis: Record<string, number>;
}

const ROOM_COLORS = {
  triagem: 'hsl(var(--study-info))',
  vermelha: 'hsl(var(--study-danger))',
  amarela: 'hsl(var(--study-warning))',
  verde: 'hsl(var(--study-success))'
};

const DIFFICULTY_COLORS = {
  easy: 'hsl(var(--study-success))',
  medium: 'hsl(var(--study-warning))',
  hard: 'hsl(var(--study-danger))'
};

const CONFIDENCE_COLORS = {
  certeza: 'hsl(var(--study-success))',
  duvida: 'hsl(var(--study-warning))',
  chute: 'hsl(var(--study-danger))'
};

export function QuestionAnalytics({ attempts, accuracyByRoom, errorAnalysis }: QuestionAnalyticsProps) {
  const analytics = useMemo(() => {
    if (!attempts?.length) {
      return {
        totalAttempts: 0,
        correctAttempts: 0,
        accuracyRate: 0,
        avgTimeTaken: 0,
        totalXpEarned: 0,
        difficultyStats: [],
        confidenceStats: [],
        roomStats: [],
        dailyProgress: [],
        subjectStats: []
      };
    }

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.isCorrect).length;
    const accuracyRate = (correctAttempts / totalAttempts) * 100;
    const avgTimeTaken = attempts
      .filter(a => a.timeTaken)
      .reduce((sum, a) => sum + (a.timeTaken || 0), 0) / 
      attempts.filter(a => a.timeTaken).length || 0;
    const totalXpEarned = attempts.reduce((sum, a) => sum + a.xpEarned, 0);

    // Difficulty statistics
    const difficultyMap = attempts.reduce((acc, attempt) => {
      const diff = attempt.difficulty || 'medium';
      if (!acc[diff]) {
        acc[diff] = { total: 0, correct: 0 };
      }
      acc[diff].total++;
      if (attempt.isCorrect) acc[diff].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number }>);

    const difficultyStats = Object.entries(difficultyMap).map(([difficulty, stats]) => ({
      difficulty,
      total: stats.total,
      correct: stats.correct,
      accuracy: (stats.correct / stats.total) * 100,
      percentage: (stats.total / totalAttempts) * 100
    }));

    // Confidence statistics
    const confidenceMap = attempts.reduce((acc, attempt) => {
      const conf = attempt.confidenceLevel;
      if (!acc[conf]) {
        acc[conf] = { total: 0, correct: 0 };
      }
      acc[conf].total++;
      if (attempt.isCorrect) acc[conf].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number }>);

    const confidenceStats = Object.entries(confidenceMap).map(([confidence, stats]) => ({
      confidence,
      total: stats.total,
      correct: stats.correct,
      accuracy: (stats.correct / stats.total) * 100,
      percentage: (stats.total / totalAttempts) * 100
    }));

    // Room statistics
    const roomStats = Object.entries(accuracyByRoom).map(([room, stats]) => ({
      room,
      ...stats
    }));

    // Daily progress (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyProgress = last7Days.map(date => {
      const dayAttempts = attempts.filter(a => 
        a.createdAt.toISOString().split('T')[0] === date
      );
      const dayCorrect = dayAttempts.filter(a => a.isCorrect).length;
      
      return {
        date,
        attempts: dayAttempts.length,
        correct: dayCorrect,
        accuracy: dayAttempts.length > 0 ? (dayCorrect / dayAttempts.length) * 100 : 0,
        xp: dayAttempts.reduce((sum, a) => sum + a.xpEarned, 0)
      };
    });

    // Subject statistics
    const subjectMap = attempts.reduce((acc, attempt) => {
      const subject = attempt.subjectName || 'Sem Matéria';
      if (!acc[subject]) {
        acc[subject] = { total: 0, correct: 0 };
      }
      acc[subject].total++;
      if (attempt.isCorrect) acc[subject].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number }>);

    const subjectStats = Object.entries(subjectMap)
      .map(([subject, stats]) => ({
        subject,
        total: stats.total,
        correct: stats.correct,
        accuracy: (stats.correct / stats.total) * 100
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalAttempts,
      correctAttempts,
      accuracyRate,
      avgTimeTaken,
      totalXpEarned,
      difficultyStats,
      confidenceStats,
      roomStats,
      dailyProgress,
      subjectStats
    };
  }, [attempts, accuracyByRoom]);

  const errorData = Object.entries(errorAnalysis).map(([errorType, count]) => ({
    name: errorType === 'undefined' ? 'Não Definido' : 
          errorType === 'interpretacao' ? 'Interpretação' :
          errorType === 'conteudo' ? 'Conteúdo' :
          errorType === 'distracao' ? 'Distração' : 'Não Definido',
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Tentativas</p>
                <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
              </div>
              <Target className="h-8 w-8 text-study-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Acurácia</p>
                <p className="text-2xl font-bold">{analytics.accuracyRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-study-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{analytics.avgTimeTaken.toFixed(0)}s</p>
              </div>
              <Timer className="h-8 w-8 text-study-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">XP Total</p>
                <p className="text-2xl font-bold">{analytics.totalXpEarned}</p>
              </div>
              <Award className="h-8 w-8 text-study-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy by Room */}
        <Card>
          <CardHeader>
            <CardTitle>Acurácia por Sala</CardTitle>
            <CardDescription>Performance nas diferentes salas de estudo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.roomStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="room" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'accuracy' ? `${value}%` : value,
                    name === 'accuracy' ? 'Acurácia' : 
                    name === 'total' ? 'Total' : 'Corretas'
                  ]}
                />
                <Legend />
                <Bar dataKey="accuracy" fill="hsl(var(--study-primary))" name="Acurácia %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Dificuldade</CardTitle>
            <CardDescription>Performance por nível de dificuldade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.difficultyStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ difficulty, percentage }) => `${difficulty} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {analytics.difficultyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DIFFICULTY_COLORS[entry.difficulty as keyof typeof DIFFICULTY_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Questões']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Diário (7 dias)</CardTitle>
            <CardDescription>Evolução da performance ao longo da semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.dailyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value, name) => [
                    name === 'accuracy' ? `${value}%` : value,
                    name === 'accuracy' ? 'Acurácia' : 
                    name === 'attempts' ? 'Tentativas' : 'XP'
                  ]}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="accuracy" 
                  stackId="1"
                  stroke="hsl(var(--study-primary))" 
                  fill="hsl(var(--study-primary))"
                  fillOpacity={0.3}
                  name="Acurácia %"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="xp" 
                  stroke="hsl(var(--study-accent))"
                  strokeWidth={2}
                  name="XP Ganho"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Erros</CardTitle>
            <CardDescription>Tipos de erro mais comuns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={errorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {errorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Matéria</CardTitle>
          <CardDescription>Top 5 matérias com mais questões respondidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.subjectStats.map((subject, index) => (
              <div key={subject.subject} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="font-medium">{subject.subject}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {subject.correct}/{subject.total} ({subject.accuracy.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <Progress value={subject.accuracy} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence vs Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Confiança vs Performance</CardTitle>
          <CardDescription>Análise da relação entre confiança declarada e acurácia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.confidenceStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="confidence" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'accuracy' ? `${value}%` : value,
                  name === 'accuracy' ? 'Acurácia' : 
                  name === 'total' ? 'Total' : 'Corretas'
                ]}
              />
              <Legend />
              <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
              <Bar dataKey="correct" fill="hsl(var(--study-success))" name="Corretas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}