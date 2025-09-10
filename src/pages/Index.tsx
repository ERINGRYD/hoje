import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BarChart3, BookOpen } from 'lucide-react';
import StudyPlanner from '@/components/StudyPlanner';
import Dashboard from '@/components/Dashboard';
import Statistics from '@/components/Statistics';
import { useStudyContext } from '@/contexts/StudyContext';
const IndexContent = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Add error boundary for context usage
  let contextData;
  try {
    contextData = useStudyContext();
  } catch (error) {
    console.error('Error accessing StudyContext:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Erro de Inicialização</h2>
          <p className="text-muted-foreground">Recarregue a página para tentar novamente.</p>
        </div>
      </div>
    );
  }
  
  const {
    studySessions,
    subjects,
    studyPlan,
    examDate,
    selectedExam,
    isDBLoading,
    dbError
  } = contextData;
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Show loading state while database initializes
  if (isDBLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Carregando...</h2>
          <p className="text-muted-foreground">Inicializando sistema de estudos</p>
        </div>
      </div>
    );
  }

  // Show error state if database failed to load
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Erro no Sistema</h2>
          <p className="text-muted-foreground">{dbError}</p>
          <p className="text-sm text-muted-foreground mt-2">Recarregue a página para tentar novamente.</p>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Planner
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard studySessions={studySessions} subjects={subjects} studyPlan={studyPlan} examDate={examDate} selectedExam={selectedExam} />
          </TabsContent>
          
          <TabsContent value="planner" className="mt-0">
            <StudyPlanner />
          </TabsContent>
          
          <TabsContent value="statistics" className="mt-0">
            <Statistics studySessions={studySessions} subjects={subjects} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
const Index = () => {
  return <IndexContent />;
};
export default Index;