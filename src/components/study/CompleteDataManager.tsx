import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2,
  RefreshCw,
  HardDrive,
  Clock,
  Calendar,
  BarChart3,
  Users,
  BookOpen,
  Target,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import {
  createCompleteSnapshot,
  getSavedCompleteSnapshots,
  restoreCompleteSnapshot,
  deleteCompleteSnapshot,
  exportCompleteSnapshot,
  importCompleteSnapshot,
  getSnapshotPreview
} from '@/utils/completeDataPersistence';
import { StudyPlan } from '@/types/study';

interface CompleteDataManagerProps {
  currentPlan: StudyPlan | null;
  onDataRestored: () => void;
}

const CompleteDataManager: React.FC<CompleteDataManagerProps> = ({
  currentPlan,
  onDataRestored
}) => {
  const [savedSnapshots, setSavedSnapshots] = useState(getSavedCompleteSnapshots());
  const [isOpen, setIsOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const refreshSnapshots = () => {
    setSavedSnapshots(getSavedCompleteSnapshots());
  };

  const handleCreateSnapshot = async () => {
    if (!currentPlan) {
      toast({
        title: "Erro",
        description: "Nenhum plano ativo para criar snapshot.",
        variant: "destructive"
      });
      return;
    }

    if (!snapshotName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite um nome para o snapshot.",
        variant: "destructive"
      });
      return;
    }

    try {
      const snapshotId = await createCompleteSnapshot(
        currentPlan, 
        snapshotName.trim(), 
        snapshotDescription.trim()
      );
      
      if (snapshotId) {
        toast({
          title: "Sucesso",
          description: `Snapshot completo "${snapshotName}" criado com sucesso!`
        });
        setSnapshotName('');
        setSnapshotDescription('');
        setShowCreateDialog(false);
        refreshSnapshots();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar snapshot completo.",
        variant: "destructive"
      });
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    const snapshot = savedSnapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja restaurar o snapshot "${snapshot.name}"?\n\n` +
      `⚠️ ATENÇÃO: Esta ação irá substituir TODOS os dados atuais:\n` +
      `• Planos de estudo\n` +
      `• Sessões e histórico\n` +
      `• Questões e tentativas\n` +
      `• Inimigos e batalhas\n` +
      `• Flashcards e revisões\n` +
      `• Estatísticas e métricas\n` +
      `• Configurações e metas\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!confirmed) return;

    try {
      const success = await restoreCompleteSnapshot(snapshotId);
      if (success) {
        toast({
          title: "Sucesso",
          description: `Snapshot "${snapshot.name}" restaurado com sucesso!`
        });
        setIsOpen(false);
        onDataRestored();
      } else {
        toast({
          title: "Erro",
          description: "Falha ao restaurar o snapshot.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro durante a restauração do snapshot.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSnapshot = (snapshotId: string, snapshotName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o snapshot "${snapshotName}"?`)) {
      if (deleteCompleteSnapshot(snapshotId)) {
        toast({
          title: "Sucesso",
          description: `Snapshot "${snapshotName}" excluído com sucesso!`
        });
        refreshSnapshots();
      } else {
        toast({
          title: "Erro",
          description: "Falha ao excluir o snapshot.",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportSnapshot = (snapshotId: string) => {
    const exportData = exportCompleteSnapshot(snapshotId);
    if (exportData) {
      const snapshot = savedSnapshots.find(s => s.id === snapshotId);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshot-completo-${snapshot?.name || snapshotId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Snapshot exportado com sucesso!"
      });
    } else {
      toast({
        title: "Erro",
        description: "Falha ao exportar o snapshot.",
        variant: "destructive"
      });
    }
  };

  const handleImportSnapshot = () => {
    if (!importData.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, cole os dados do snapshot.",
        variant: "destructive"
      });
      return;
    }

    const snapshotId = importCompleteSnapshot(importData);
    if (snapshotId) {
      toast({
        title: "Sucesso",
        description: "Snapshot importado com sucesso!"
      });
      setImportData('');
      setShowImportDialog(false);
      refreshSnapshots();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao importar o snapshot. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  const getSnapshotDetails = (snapshotId: string) => {
    const preview = getSnapshotPreview(snapshotId);
    return preview;
  };

  return (
    <div className="flex gap-2 mb-4">
      {/* Create Complete Snapshot */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!currentPlan}>
            <Database className="h-4 w-4 mr-2" />
            Salvar Estado Completo
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Snapshot Completo</DialogTitle>
            <DialogDescription>
              Salva TODOS os dados da aplicação: planos, sessões, questões, inimigos, estatísticas, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshotName">Nome do Snapshot</Label>
              <Input
                id="snapshotName"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Ex: Estado Completo ENEM 2024"
              />
            </div>
            <div>
              <Label htmlFor="snapshotDescription">Descrição (Opcional)</Label>
              <Textarea
                id="snapshotDescription"
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                placeholder="Descrição do snapshot..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSnapshot}>
              Criar Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Complete Snapshots */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <HardDrive className="h-4 w-4 mr-2" />
            Gerenciar Estados Completos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Estados Completos</DialogTitle>
            <DialogDescription>
              Snapshots completos incluem TODOS os dados: planos, sessões, questões, inimigos, estatísticas, etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={refreshSnapshots}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Snapshot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Importar Snapshot Completo</DialogTitle>
                    <DialogDescription>
                      Cole os dados JSON do snapshot exportado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      className="h-32"
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder="Cole aqui os dados JSON do snapshot..."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleImportSnapshot}>
                      Importar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Separator />

            {/* Snapshots List */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {savedSnapshots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-2" />
                    <p>Nenhum snapshot completo encontrado.</p>
                    <p className="text-sm">Crie um snapshot para começar!</p>
                  </div>
                ) : (
                  savedSnapshots.map((snapshot) => {
                    const preview = getSnapshotDetails(snapshot.id);
                    return (
                      <Card key={snapshot.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{snapshot.name}</h4>
                              <Badge variant="secondary">
                                <Database className="h-3 w-3 mr-1" />
                                Completo
                              </Badge>
                            </div>
                            
                            {snapshot.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {snapshot.description}
                              </p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(snapshot.createdAt), 'dd/MM/yyyy HH:mm')}
                              </span>
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                {preview?.stats.dataSize}
                              </span>
                            </div>
                            
                            {preview && (
                              <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {preview.stats.sessionsCount} sessões
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {preview.stats.questionsCount} questões
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {preview.stats.enemiesCount} inimigos
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreSnapshot(snapshot.id)}
                              title="Restaurar snapshot completo"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportSnapshot(snapshot.id)}
                              title="Exportar snapshot"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSnapshot(snapshot.id, snapshot.name)}
                              title="Excluir snapshot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompleteDataManager;