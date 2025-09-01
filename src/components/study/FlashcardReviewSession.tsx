import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  Clock,
  Target
} from 'lucide-react';
import { FlashcardWithTopic, updateFlashcardReview } from '@/db/crud/flashcards';
import { useToast } from '@/hooks/use-toast';

interface FlashcardReviewSessionProps {
  cards: FlashcardWithTopic[];
  onComplete: () => void;
  onClose: () => void;
}

const FlashcardReviewSession: React.FC<FlashcardReviewSessionProps> = ({
  cards,
  onComplete,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: cards.length
  });
  const { toast } = useToast();

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  const handleAnswer = async (quality: 'easy' | 'good' | 'hard' | 'again') => {
    if (!currentCard) return;

    try {
      // Atualiza o flashcard com o resultado da revisão
      await updateFlashcardReview(currentCard.id, quality);
      
      // Atualiza estatísticas da sessão
      setSessionStats(prev => ({
        ...prev,
        correct: quality === 'again' ? prev.correct : prev.correct + 1,
        incorrect: quality === 'again' ? prev.incorrect + 1 : prev.incorrect
      }));

      // Próximo card ou finaliza sessão
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // Sessão completa
        toast({
          title: "Sessão Concluída!",
          description: `Revisão completa: ${sessionStats.correct + (quality === 'again' ? 0 : 1)}/${cards.length} corretas`
        });
        onComplete();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar resultado da revisão",
        variant: "destructive"
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return "bg-green-100 text-green-800";
      case 'medium': return "bg-yellow-100 text-yellow-800";
      case 'hard': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentCard) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Sessão de Revisão</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentCard.subject_name} - {currentCard.topic_name}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso: {currentIndex + 1}/{cards.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Card Info */}
          <div className="flex items-center justify-between">
            <Badge className={getDifficultyColor(currentCard.difficulty)}>
              {currentCard.difficulty}
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Revisado {currentCard.times_reviewed}x</span>
            </div>
          </div>

          {/* Question */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Pergunta:</h3>
                <p className="text-xl">{currentCard.front}</p>
              </div>
            </CardContent>
          </Card>

          {/* Answer */}
          {showAnswer && (
            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">Resposta:</h3>
                  <p className="text-xl text-green-900">{currentCard.back}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col space-y-4">
            {!showAnswer ? (
              <Button 
                onClick={() => setShowAnswer(true)}
                className="w-full"
                size="lg"
              >
                <Eye className="h-4 w-4 mr-2" />
                Mostrar Resposta
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="destructive"
                  onClick={() => handleAnswer('again')}
                  className="flex items-center justify-center space-x-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Errei</span>
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleAnswer('hard')}
                  className="flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Difícil</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleAnswer('good')}
                  className="flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Bom</span>
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleAnswer('easy')}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Fácil</span>
                </Button>
              </div>
            )}
          </div>

          {/* Session Stats */}
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{sessionStats.correct}</div>
              <div>Corretas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{sessionStats.incorrect}</div>
              <div>Incorretas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{cards.length - currentIndex - 1}</div>
              <div>Restantes</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlashcardReviewSession;