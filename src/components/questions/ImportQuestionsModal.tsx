import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Subject } from '@/types/questions';
import { toast } from '@/hooks/use-toast';
import { importQuestionsInBatch } from '@/db/crud/questions';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onQuestionsImported: () => void;
}

interface ImportQuestion {
  topicId?: string;
  title: string;
  content: string;
  options?: Array<{
    label: string;
    content: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  images?: string[];
  examiningBoard?: string;
  position?: string;
  examYear?: string;
  institution?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function ImportQuestionsModal({ isOpen, onClose, subjects, onQuestionsImported }: ImportQuestionsModalProps) {
  const [importData, setImportData] = useState<ImportQuestion[]>([]);
  const [defaultTopicId, setDefaultTopicId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const availableTopics = selectedSubject?.topics || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        const validatedQuestions = validateImportData(jsonContent);
        setImportData(validatedQuestions);
        setStep('preview');
      } catch (error) {
        toast({
          title: 'Erro no JSON',
          description: 'Arquivo JSON inválido ou mal formatado',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const validateImportData = (jsonData: any): ImportQuestion[] => {
    if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
      throw new Error('JSON deve conter um array "questions"');
    }

    return jsonData.questions.map((q: any, index: number) => {
      if (!q.title || !q.content) {
        throw new Error(`Questão ${index + 1}: título e conteúdo são obrigatórios`);
      }

      // Validate difficulty
      if (q.difficulty && !['easy', 'medium', 'hard'].includes(q.difficulty)) {
        throw new Error(`Questão ${index + 1}: dificuldade deve ser 'easy', 'medium' ou 'hard'`);
      }

      // Validate topicId if provided
      if (q.topicId) {
        const topicExists = subjects.some(subject => 
          subject.topics.some(topic => topic.id === q.topicId)
        );
        if (!topicExists) {
          console.warn(`Questão ${index + 1}: topicId "${q.topicId}" não encontrado`);
        }
      }

      return {
        topicId: q.topicId || undefined,
        title: q.title,
        content: q.content,
        options: q.options || undefined,
        correctAnswer: q.correctAnswer || undefined,
        explanation: q.explanation || undefined,
        difficulty: q.difficulty || 'medium',
        tags: q.tags || [],
        images: q.images || [],
        examiningBoard: q.examiningBoard || undefined,
        position: q.position || undefined,
        examYear: q.examYear || undefined,
        institution: q.institution || undefined
      };
    });
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      console.log(`🚀 Iniciando importação de ${importData.length} questões`);
      
      const result = await importQuestionsInBatch(
        importData.map(q => ({
          topicId: q.topicId || defaultTopicId,
          title: q.title,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium',
          tags: q.tags || [],
          images: q.images || [],
          examiningBoard: q.examiningBoard,
          position: q.position,
          examYear: q.examYear,
          institution: q.institution
        })),
        defaultTopicId
      );

      // Atualizar progresso para 100%
      setImportProgress(100);

      setImportResult({
        success: result.success,
        failed: result.failed,
        errors: result.errors
      });

      setIsImporting(false);
      setStep('result');

      if (result.success > 0) {
        console.log(`✅ Importação concluída: ${result.success} questões importadas`);
        toast({
          title: "Importação concluída!",
          description: `${result.success} questões foram importadas com sucesso.`,
        });
        onQuestionsImported();
      }

      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} questões falharam na importação`);
        toast({
          title: "Algumas questões falharam",
          description: `${result.failed} questões não puderam ser importadas. Verifique os detalhes.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Erro durante importação:', error);
      setIsImporting(false);
      setStep('upload');
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação das questões.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setImportData([]);
    setDefaultTopicId('');
    setSelectedSubjectId('');
    setImportResult(null);
    setStep('upload');
    setImportProgress(0);
    onClose();
  };

  const generateSampleJSON = () => {
    const sampleData = {
      questions: [
        {
          topicId: availableTopics[0]?.id || "topic_example",
          title: "Exemplo de Questão de Múltipla Escolha",
          content: "Qual é a capital do Brasil?",
          options: [
            { label: "A", content: "São Paulo", isCorrect: false },
            { label: "B", content: "Rio de Janeiro", isCorrect: false },
            { label: "C", content: "Brasília", isCorrect: true },
            { label: "D", content: "Belo Horizonte", isCorrect: false }
          ],
          correctAnswer: "Brasília",
          explanation: "Brasília é a capital federal do Brasil desde 1960.",
          difficulty: "easy",
          tags: ["geografia", "brasil", "capitais"],
          examiningBoard: "CESPE",
          position: "Técnico",
          examYear: "2024",
          institution: "UnB"
        },
        {
          title: "Exemplo de Questão Dissertativa",
          content: "Explique o conceito de função em matemática.",
          correctAnswer: "Função é uma relação entre dois conjuntos onde cada elemento do domínio se relaciona com exatamente um elemento do contradomínio.",
          explanation: "Conceito fundamental em matemática que estabelece correspondência entre elementos de conjuntos.",
          difficulty: "medium",
          tags: ["matemática", "função", "teoria"]
        }
      ]
    };

    const dataStr = JSON.stringify(sampleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exemplo-questoes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Arquivo baixado',
      description: 'Arquivo de exemplo baixado com sucesso!'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-study-primary" />
            Importar Questões JSON
          </DialogTitle>
          <DialogDescription>
            Importe questões em lote usando arquivo JSON
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Selecione um arquivo JSON</h3>
                  <p className="text-muted-foreground mb-4">
                    Faça upload de um arquivo JSON contendo as questões
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="h-4 w-4" />
                      Selecionar Arquivo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={generateSampleJSON}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Exemplo
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formato do JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "questions": [
    {
      "topicId": "topic_123", // Opcional: ID do tópico existente
      "title": "Título da Questão",
      "content": "Enunciado da questão...",
      "options": [
        { "label": "A", "content": "Alternativa A", "isCorrect": false },
        { "label": "B", "content": "Resposta correta", "isCorrect": true }
      ],
      "correctAnswer": "Resposta para questões dissertativas",
      "explanation": "Explicação opcional",
      "difficulty": "medium", // easy, medium, hard
      "tags": ["tag1", "tag2"],
      "examiningBoard": "CESPE",
      "position": "Analista",
      "examYear": "2024",
      "institution": "UnB"
    }
  ]
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Preview: {importData.length} questões encontradas
              </h3>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
            </div>

            {/* Default topic selection for questions without topicId */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações de Importação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Matéria Padrão</Label>
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
                    <Label>Tópico Padrão</Label>
                    <Select 
                      value={defaultTopicId} 
                      onValueChange={setDefaultTopicId}
                      disabled={!selectedSubjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tópico" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTopics.map(topic => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  O tópico padrão será usado para questões que não especificarem um topicId
                </p>
              </CardContent>
            </Card>

            {/* Questions preview */}
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {importData.map((question, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-medium">{question.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {question.content}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary">{question.difficulty || 'medium'}</Badge>
                            {question.options && (
                              <Badge variant="outline">{question.options.length} opções</Badge>
                            )}
                            {question.tags?.map(tag => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        {question.topicId ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importData.length === 0 || (!defaultTopicId && importData.some(q => !q.topicId))}
                className="flex-1"
              >
                Importar {importData.length} Questões
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-6">
            {isImporting ? (
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Importando questões...</h3>
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(importProgress)}% concluído
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Importação Concluída</h3>
                    <div className="flex justify-center gap-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult?.success || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Sucessos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult?.failed || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Falhas</div>
                      </div>
                    </div>
                  </div>
                </div>

                {importResult && importResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-red-600">Erros encontrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <ul className="space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={handleClose} className="w-full">
                  Fechar
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}