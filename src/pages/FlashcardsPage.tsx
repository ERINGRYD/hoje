import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Clock, BarChart3, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllFlashcards, 
  getFlashcardsForReview, 
  getFlashcardStats,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  getAllTopics,
  type FlashcardWithTopic,
  type Flashcard
} from '@/db/crud/flashcards';
import FlashcardReviewSession from '@/components/study/FlashcardReviewSession';

const FlashcardsPage = () => {
  const [flashcards, setFlashcards] = useState<FlashcardWithTopic[]>([]);
  const [reviewCards, setReviewCards] = useState<FlashcardWithTopic[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    reviewed: 0,
    needsReview: 0,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>
  });
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [isReviewSessionActive, setIsReviewSessionActive] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    topic_id: '',
    front: '',
    back: '',
    type: 'concept' as 'concept' | 'definition' | 'formula' | 'custom',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading flashcards data...');
      
      console.log('Loading all flashcards...');
      const allCards = await getAllFlashcards();
      console.log('All flashcards loaded:', allCards.length);
      
      console.log('Loading review cards...');
      const reviewCardsData = await getFlashcardsForReview();
      console.log('Review cards loaded:', reviewCardsData.length);
      
      console.log('Loading flashcard stats...');
      const statsData = await getFlashcardStats();
      console.log('Stats loaded:', statsData);
      
      console.log('Loading topics...');
      const topicsData = await getAllTopics();
      console.log('Topics loaded:', topicsData.length);
      
      setFlashcards(allCards);
      setReviewCards(reviewCardsData);
      setStats(statsData);
      setTopics(topicsData);
      
      console.log('Flashcards data loaded successfully');
    } catch (error) {
      console.error('Error loading flashcards:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar flashcards: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!formData.topic_id || !formData.front.trim() || !formData.back.trim()) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      await createFlashcard(formData);
      toast({
        title: "Sucesso",
        description: "Flashcard criado com sucesso"
      });
      setIsCreateModalOpen(false);
      setFormData({
        topic_id: '',
        front: '',
        back: '',
        type: 'concept',
        difficulty: 'medium'
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar flashcard",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    try {
      await updateFlashcard(editingCard.id, {
        front: formData.front,
        back: formData.back,
        type: formData.type,
        difficulty: formData.difficulty
      });
      toast({
        title: "Sucesso",
        description: "Flashcard atualizado com sucesso"
      });
      setEditingCard(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar flashcard",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteFlashcard(id);
      toast({
        title: "Sucesso",
        description: "Flashcard excluído com sucesso"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir flashcard",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setFormData({
      topic_id: card.topic_id,
      front: card.front,
      back: card.back,
      type: card.type,
      difficulty: card.difficulty
    });
  };

  const filteredCards = flashcards.filter(card => {
    const matchesSearch = card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.topic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = filterTopic === 'all' || card.topic_id === filterTopic;
    return matchesSearch && matchesTopic;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concept': return <BookOpen className="h-4 w-4" />;
      case 'definition': return <Eye className="h-4 w-4" />;
      case 'formula': return <BarChart3 className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-center">Carregando flashcards...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground">Sistema de revisão espaçada para memorização eficiente</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Flashcard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">Tópico</Label>
                <Select value={formData.topic_id} onValueChange={(value) => setFormData({ ...formData, topic_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tópico" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.subject_name} - {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="front">Frente (Pergunta)</Label>
                <Textarea
                  id="front"
                  value={formData.front}
                  onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                  placeholder="Digite a pergunta ou conceito..."
                />
              </div>
              <div>
                <Label htmlFor="back">Verso (Resposta)</Label>
                <Textarea
                  id="back"
                  value={formData.back}
                  onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                  placeholder="Digite a resposta ou explicação..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">Conceito</SelectItem>
                      <SelectItem value="definition">Definição</SelectItem>
                      <SelectItem value="formula">Fórmula</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Dificuldade</Label>
                  <Select value={formData.difficulty} onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Fácil</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="hard">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateCard} className="w-full">
                Criar Flashcard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Cards</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Para Revisar</p>
                <p className="text-2xl font-bold">{stats.needsReview}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revisados</p>
                <p className="text-2xl font-bold">{stats.reviewed}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Revisão</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Todos os Cards</TabsTrigger>
          <TabsTrigger value="review">Para Revisar ({reviewCards.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar flashcards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="sm:max-w-sm">
                <SelectValue placeholder="Filtrar por tópico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tópicos</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.subject_name} - {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map(card => (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(card.type)}
                      <CardTitle className="text-sm">{card.topic_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(card)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{card.subject_name}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Frente:</p>
                      <p className="text-sm line-clamp-2">{card.front}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Verso:</p>
                      <p className="text-sm line-clamp-2 opacity-75">{card.back}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className={getDifficultyColor(card.difficulty)}>
                        {card.difficulty}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Revisado {card.times_reviewed}x
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="review" className="space-y-4">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Sistema de Revisão</h3>
            <p className="text-muted-foreground mb-4">
              {reviewCards.length > 0 
                ? `${reviewCards.length} cards prontos para revisão`
                : "Nenhum card precisa ser revisado no momento"
              }
            </p>
            {reviewCards.length > 0 && (
              <Button onClick={() => setIsReviewSessionActive(true)}>
                Iniciar Sessão de Revisão
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="front">Frente (Pergunta)</Label>
              <Textarea
                id="front"
                value={formData.front}
                onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                placeholder="Digite a pergunta ou conceito..."
              />
            </div>
            <div>
              <Label htmlFor="back">Verso (Resposta)</Label>
              <Textarea
                id="back"
                value={formData.back}
                onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                placeholder="Digite a resposta ou explicação..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Conceito</SelectItem>
                    <SelectItem value="definition">Definição</SelectItem>
                    <SelectItem value="formula">Fórmula</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select value={formData.difficulty} onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleUpdateCard} className="w-full">
              Atualizar Flashcard
            </Button>
           </div>
           </DialogContent>
         </Dialog>

         {/* Review Session */}
      {isReviewSessionActive && reviewCards.length > 0 && (
        <FlashcardReviewSession
          cards={reviewCards}
          onComplete={() => {
            setIsReviewSessionActive(false);
            loadData(); // Recarrega os dados após a sessão
          }}
          onClose={() => setIsReviewSessionActive(false)}
        />
      )}
    </div>
  );
};

export default FlashcardsPage;