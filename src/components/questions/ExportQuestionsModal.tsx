import React, { useState } from 'react';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Subject } from '@/types/questions';
import { getQuestionsByTopic, getQuestionsByRoom } from '@/db/crud/questions';
import { toast } from '@/hooks/use-toast';
import type { Room } from '@/types/battle';

interface ExportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
}

export function ExportQuestionsModal({ isOpen, onClose, subjects }: ExportQuestionsModalProps) {
  const [exportType, setExportType] = useState<'topic' | 'subject' | 'room' | 'all'>('topic');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<Room>('triagem');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeStats, setIncludeStats] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const availableTopics = selectedSubject?.topics || [];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let questions: any[] = [];
      let filename = 'questoes';

      switch (exportType) {
        case 'topic':
          if (!selectedTopicId) {
            toast({
              title: 'Erro',
              description: 'Selecione um tópico para exportar',
              variant: 'destructive'
            });
            setIsExporting(false);
            return;
          }
          questions = getQuestionsByTopic(selectedTopicId);
          const topic = availableTopics.find(t => t.id === selectedTopicId);
          filename = `questoes-${topic?.name.toLowerCase().replace(/\s+/g, '-') || 'topico'}`;
          break;

        case 'subject':
          if (!selectedSubjectId) {
            toast({
              title: 'Erro',
              description: 'Selecione uma matéria para exportar',
              variant: 'destructive'
            });
            setIsExporting(false);
            return;
          }
          questions = selectedSubject?.topics.flatMap(topic => 
            getQuestionsByTopic(topic.id)
          ) || [];
          filename = `questoes-${selectedSubject?.name.toLowerCase().replace(/\s+/g, '-') || 'materia'}`;
          break;

        case 'room':
          questions = getQuestionsByRoom(selectedRoom);
          filename = `questoes-${selectedRoom}`;
          break;

        case 'all':
          questions = subjects.flatMap(subject =>
            subject.topics.flatMap(topic =>
              getQuestionsByTopic(topic.id)
            )
          );
          filename = 'questoes-todas';
          break;
      }

      if (questions.length === 0) {
        toast({
          title: 'Nenhuma questão encontrada',
          description: 'Não há questões para exportar com os filtros selecionados',
          variant: 'destructive'
        });
        setIsExporting(false);
        return;
      }

      // Format questions for export
      const exportData = {
        metadata: includeMetadata ? {
          exportDate: new Date().toISOString(),
          exportType,
          totalQuestions: questions.length,
          source: 'Sistema de Questões'
        } : undefined,
        questions: questions.map(q => ({
          topicId: q.topicId,
          title: q.title,
          content: q.content,
          options: q.options?.map((opt: any) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect
          })),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          tags: q.tags || [],
          images: q.images || [],
          examiningBoard: q.examiningBoard,
          position: q.position,
          examYear: q.examYear,
          institution: q.institution,
          ...(includeStats ? {
            timesAnswered: q.timesAnswered,
            timesCorrect: q.timesCorrect,
            accuracyRate: q.accuracyRate,
            room: q.room,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt,
            topicName: q.topicName,
            subjectName: q.subjectName
          } : {})
        }))
      };

      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `${questions.length} questões exportadas com sucesso!`
      });

      onClose();
    } catch (error) {
      console.error('Error exporting questions:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar as questões',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getQuestionCount = (): number => {
    switch (exportType) {
      case 'topic':
        return selectedTopicId ? availableTopics.find(t => t.id === selectedTopicId)?.questions.length || 0 : 0;
      case 'subject':
        return selectedSubject?.topics.reduce((acc, topic) => acc + topic.questions.length, 0) || 0;
      case 'room':
        try {
          return getQuestionsByRoom(selectedRoom).length;
        } catch {
          return 0;
        }
      case 'all':
        return subjects.reduce((acc, subject) => 
          acc + subject.topics.reduce((topicAcc, topic) => topicAcc + topic.questions.length, 0), 0
        );
      default:
        return 0;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-study-primary" />
            Exportar Questões
          </DialogTitle>
          <DialogDescription>
            Exporte questões em formato JSON para backup ou transferência
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export type selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Exportação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Filtro</Label>
                <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topic">Por Tópico</SelectItem>
                    <SelectItem value="subject">Por Matéria</SelectItem>
                    <SelectItem value="room">Por Sala (Triagem/Vermelha/Amarela/Verde)</SelectItem>
                    <SelectItem value="all">Todas as Questões</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportType === 'topic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Matéria</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma matéria" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tópico</Label>
                    <Select 
                      value={selectedTopicId} 
                      onValueChange={setSelectedTopicId}
                      disabled={!selectedSubjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tópico" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTopics.map(topic => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name} ({topic.questions.length} questões)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {exportType === 'subject' && (
                <div className="space-y-2">
                  <Label>Matéria</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => {
                        const questionCount = subject.topics.reduce((acc, topic) => acc + topic.questions.length, 0);
                        return (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({questionCount} questões)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {exportType === 'room' && (
                <div className="space-y-2">
                  <Label>Sala</Label>
                  <Select value={selectedRoom} onValueChange={(value: Room) => setSelectedRoom(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="triagem">Triagem</SelectItem>
                      <SelectItem value="vermelha">Sala Vermelha</SelectItem>
                      <SelectItem value="amarela">Sala Amarela</SelectItem>
                      <SelectItem value="verde">Sala Verde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opções de Exportação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="metadata" 
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="text-sm">
                  Incluir metadados (data de exportação, tipo, etc.)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="stats" 
                  checked={includeStats}
                  onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
                />
                <Label htmlFor="stats" className="text-sm">
                  Incluir estatísticas (tentativas, acertos, sala atual)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Questões a serem exportadas:</p>
                  <p className="text-sm text-muted-foreground">
                    {getQuestionCount()} questões serão incluídas no arquivo
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting || getQuestionCount() === 0}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}