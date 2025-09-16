import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react';
import { useStudyContext } from '@/contexts/StudyContext';

/**
 * Debug component to show StudyContext status
 * Helpful for troubleshooting subject/topic loading issues
 */
const StudyContextStatus: React.FC = () => {
  const { subjects, studyPlan, studySessions, isDBLoading, dbError } = useStudyContext();

  const handleForceSync = () => {
    console.log('🔄 StudyContextStatus: Forcing subject sync...');
    window.dispatchEvent(new CustomEvent('forceSyncSubjects'));
  };

  const handleDebugLog = () => {
    console.log('🔍 StudyContextStatus: Triggering debug...');
    window.dispatchEvent(new CustomEvent('debugGetStudyContext'));
  };

  const getStatusColor = () => {
    if (dbError) return 'destructive';
    if (isDBLoading) return 'secondary';
    if (subjects.length === 0) return 'destructive';
    return 'default';
  };

  const getStatusIcon = () => {
    if (dbError) return <AlertCircle className="h-4 w-4" />;
    if (isDBLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (subjects.length === 0) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (dbError) return 'Erro no banco de dados';
    if (isDBLoading) return 'Carregando dados...';
    if (subjects.length === 0) return 'Nenhum tema carregado';
    return 'Dados carregados com sucesso';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Status do Sistema de Estudos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
          <Badge variant={getStatusColor()}>
            {isDBLoading ? 'Carregando' : subjects.length > 0 ? 'OK' : 'Erro'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-lg">{subjects.length}</div>
            <div className="text-muted-foreground">Matérias</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-lg">
              {subjects.reduce((total, subject) => total + (subject.topics?.length || 0), 0)}
            </div>
            <div className="text-muted-foreground">Tópicos</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-lg">{studySessions.length}</div>
            <div className="text-muted-foreground">Sessões</div>
          </div>
        </div>

        {studyPlan && (
          <div className="text-xs text-muted-foreground">
            <div>Plano: {studyPlan.id || 'Sem ID'}</div>
            <div>Tipo: {studyPlan.type}</div>
            <div>Matérias no plano: {studyPlan.subjects?.length || 0}</div>
          </div>
        )}

        {dbError && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            Erro: {dbError}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleForceSync}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Sincronizar
          </Button>
          <Button size="sm" variant="outline" onClick={handleDebugLog}>
            Debug
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyContextStatus;