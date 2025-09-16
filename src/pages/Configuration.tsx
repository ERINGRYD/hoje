import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, FolderOpen, Settings2, Brain, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CycleConfiguration from '@/components/study/CycleConfiguration';
import StudyPlanManager from '@/components/study/StudyPlanManager';
import StudyDataRecovery from '@/components/study/StudyDataRecovery';
import PlanAdjustmentModal from '@/components/study/PlanAdjustmentModal';
import SubjectTopicManager from '@/components/study/SubjectTopicManager';
import ReviewSettingsModal from '@/components/study/ReviewSettingsModal';
import ReviewStatsWidget from '@/components/study/ReviewStatsWidget';
import { useStudyContext } from '@/contexts/StudyContext';
import { StudyPlan } from '@/types/study';
import { migrateReviewSystem } from '@/db/migration-review-system';
import { clearAllData } from '@/db/db';
import { toast } from '@/hooks/use-toast';

const Configuration = () => {
  const navigate = useNavigate();
  const { studyPlan, setStudyPlan, subjects, setSubjects } = useStudyContext();
  const [subjectLevels] = useState<Record<string, string>>({});
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isReviewSettingsOpen, setIsReviewSettingsOpen] = useState(false);

  // Executa migração do sistema de revisão na inicialização
  React.useEffect(() => {
    const runMigration = async () => {
      try {
        const success = migrateReviewSystem();
        if (success) {
          console.log('Review system migration completed');
        }
      } catch (error) {
        console.error('Migration error:', error);
      }
    };
    runMigration();
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  const handleUpdatePlan = (updatedPlan: StudyPlan) => {
    console.log('📋 Configuration recebeu plano atualizado:', updatedPlan);
    setStudyPlan(updatedPlan);
    console.log('✅ StudyPlan atualizado no contexto');
  };

  const handleRegenerateCycle = () => {
    // Implementar lógica de regeneração se necessário
    console.log('Regenerating cycle...');
  };

  const handleClearAllData = async () => {
    const confirmed = confirm(
      'ATENÇÃO: Esta ação irá apagar TODOS os dados do aplicativo incluindo:\n\n' +
      '• Todos os planos de estudo\n' +
      '• Todas as sessões de estudo\n' +
      '• Todas as questões e flashcards\n' +
      '• Todo o progresso no sistema de batalhas\n' +
      '• Todas as configurações personalizadas\n' +
      '• Todos os dados de performance\n\n' +
      'Esta ação NÃO PODE ser desfeita.\n\n' +
      'Tem certeza que deseja continuar?'
    );
    
    if (confirmed) {
      const secondConfirmation = confirm(
        'ÚLTIMA CONFIRMAÇÃO:\n\n' +
        'Você está prestes a APAGAR TODOS OS DADOS.\n' +
        'Certifique-se de ter feito backup se necessário.\n\n' +
        'Continuar com a exclusão?'
      );
      
      if (secondConfirmation) {
        try {
          const success = clearAllData();
          if (success) {
            toast({
              title: "Dados Removidos",
              description: "Todos os dados foram apagados com sucesso. A página será recarregada.",
            });
            // Reload page after clearing data
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            toast({
              title: "Erro",
              description: "Não foi possível apagar todos os dados. Verifique o console para mais detalhes.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error clearing data:', error);
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao tentar apagar os dados.",
            variant: "destructive"
          });
        }
      }
    }
  };

  if (!studyPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Nenhum plano de estudo encontrado</p>
          <Button onClick={handleBack}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-bold text-study-primary">Configurações</h1>
          
          {/* Subject/Topic Manager Icon Button */}
          <SubjectTopicManager 
            subjects={subjects}
            onUpdateSubjects={setSubjects}
            trigger={
              <Button 
                variant="outline" 
                size="icon"
                className="ml-auto"
                title="Gerenciar Matérias, Tópicos e Subtópicos"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        <div className="space-y-6">
          {/* Plan Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ajustar Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (confirm('Deseja criar um novo plano? Isso substituirá o plano atual.')) {
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Novo Plano
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAdjustModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Ajustar Plano
                </Button>
                
                <StudyPlanManager 
                  currentPlan={studyPlan}
                  onPlanLoaded={handleUpdatePlan}
                  onPlanSaved={(planId) => console.log('Plan saved:', planId)}
                />
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleClearAllData}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar Todos os Dados
                </Button>
              </div>
              
              <PlanAdjustmentModal 
                isOpen={isAdjustModalOpen} 
                onClose={() => setIsAdjustModalOpen(false)}
                studyPlan={studyPlan}
                onUpdatePlan={handleUpdatePlan}
                onRegenerateCycle={handleRegenerateCycle}
              />
            </CardContent>
          </Card>

          {/* Cycle Configuration Section */}
          {studyPlan && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Ciclo</CardTitle>
              </CardHeader>
              <CardContent>
                <CycleConfiguration
                  studyPlan={studyPlan}
                  subjects={studyPlan.subjects}
                  subjectLevels={subjectLevels}
                  onUpdatePlan={handleUpdatePlan}
                  onRegenerateCycle={handleRegenerateCycle}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Data Recovery and Debugging Section */}
          <StudyDataRecovery />
        </div>
      </div>
    </div>
  );
};

export default Configuration;