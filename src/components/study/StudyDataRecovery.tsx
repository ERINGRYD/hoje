import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useStudyContext } from '@/contexts/StudyContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Data recovery component for fixing common StudyContext issues
 */
const StudyDataRecovery: React.FC = () => {
  const { subjects, studyPlan, studySessions, isDBLoading, dbError } = useStudyContext();
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRecoverData = async () => {
    setIsRecovering(true);
    
    try {
      console.log('🚑 Starting data recovery process...');
      
      // Force sync subjects
      window.dispatchEvent(new CustomEvent('forceSyncSubjects'));
      
      // Check localStorage backups
      const planBackup = localStorage.getItem('activeStudyPlan');
      const sessionsBackup = localStorage.getItem('studySessions');
      
      if (planBackup) {
        console.log('📥 Found study plan backup, triggering recovery...');
        toast({
          title: "Backup Encontrado",
          description: "Encontrado backup do plano de estudos. Iniciando recuperação...",
        });
        
        // Reload page to reinitialize context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "Sem Backup",
          description: "Nenhum backup encontrado. Crie um novo plano de estudos.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      toast({
        title: "Erro na Recuperação",
        description: "Não foi possível recuperar os dados automaticamente.",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const handleForceSync = () => {
    console.log('🔄 Forcing subject synchronization...');
    window.dispatchEvent(new CustomEvent('forceSyncSubjects'));
    
    toast({
      title: "Sincronização Forçada",
      description: "Tentativa de sincronização dos temas iniciada.",
    });
  };

  const handleDebugLog = () => {
    console.log('🔍 Triggering debug log...');
    window.dispatchEvent(new CustomEvent('debugGetStudyContext'));
    
    // Also run integrity check if available
    if ((window as any).studyDebug) {
      (window as any).studyDebug.checkIntegrity();
    }
    
    toast({
      title: "Debug Executado",
      description: "Informações de debug foram registradas no console.",
    });
  };

  const getStatusSeverity = () => {
    if (dbError) return 'error';
    if (isDBLoading) return 'loading';
    if (subjects.length === 0 && studyPlan) return 'warning';
    if (subjects.length === 0) return 'error';
    return 'success';
  };

  const getStatusMessage = () => {
    if (dbError) return `Erro no banco de dados: ${dbError}`;
    if (isDBLoading) return 'Carregando dados do banco...';
    if (subjects.length === 0 && studyPlan) return 'Plano carregado mas temas não sincronizados';
    if (subjects.length === 0) return 'Nenhum tema disponível para estudo';
    return 'Sistema funcionando normalmente';
  };

  const getStatusIcon = () => {
    const severity = getStatusSeverity();
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'loading': return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const severity = getStatusSeverity();
  const needsAttention = ['error', 'warning'].includes(severity);

  return (
    <Card className={needsAttention ? 'border-destructive/50' : ''}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {getStatusIcon()}
          Diagnóstico e Recuperação de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={severity === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="flex items-center gap-2">
            {getStatusMessage()}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Plano de Estudos:</span>
              <Badge variant={studyPlan ? 'default' : 'destructive'}>
                {studyPlan ? 'OK' : 'Ausente'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Temas Carregados:</span>
              <Badge variant={subjects.length > 0 ? 'default' : 'destructive'}>
                {subjects.length}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Banco de Dados:</span>
              <Badge variant={dbError ? 'destructive' : isDBLoading ? 'secondary' : 'default'}>
                {dbError ? 'Erro' : isDBLoading ? 'Carregando' : 'OK'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Sessões:</span>
              <Badge variant="outline">
                {studySessions.length}
              </Badge>
            </div>
          </div>
        </div>

        {needsAttention && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ações de Recuperação:</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleForceSync}
                disabled={isRecovering}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRecoverData}
                disabled={isRecovering}
              >
                <Download className="h-3 w-3 mr-1" />
                {isRecovering ? 'Recuperando...' : 'Recuperar'}
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDebugLog}
              >
                <Info className="h-3 w-3 mr-1" />
                Debug
              </Button>
            </div>
          </div>
        )}

        {severity === 'success' && (
          <div className="text-sm text-muted-foreground">
            ✅ Todos os sistemas estão funcionando corretamente
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyDataRecovery;