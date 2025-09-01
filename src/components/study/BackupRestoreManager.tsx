/**
 * Backup & Restore Manager Component
 * Native backup/restore functionality following HeroTask pattern
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Download, Upload, Database, FileJson, HardDrive, RotateCcw } from 'lucide-react';
import { 
  createJsonBackup, 
  createSQLiteBackup, 
  restoreFromJsonBackup, 
  validateBackupFile,
  getBackupStats,
  getAutomaticBackups,
  restoreFromAutomaticBackup
} from '@/utils/backupRestore';
import { useDatabaseStats } from '@/hooks/useStudyDatabase';

interface BackupRestoreManagerProps {
  onBackupCreated?: () => void;
  onDataRestored?: () => void;
}

export function BackupRestoreManager({ onBackupCreated, onDataRestored }: BackupRestoreManagerProps) {
  const { stats } = useDatabaseStats();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<{ isValid: boolean; metadata?: any; error?: string } | null>(null);
  
  const automaticBackups = getAutomaticBackups();
  const backupStats = getBackupStats();

  const handleCreateJsonBackup = async () => {
    try {
      setIsCreatingBackup(true);
      await createJsonBackup();
      onBackupCreated?.();
    } catch (error) {
      // Error already handled in createJsonBackup
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleCreateSQLiteBackup = () => {
    try {
      setIsCreatingBackup(true);
      createSQLiteBackup();
      onBackupCreated?.();
    } catch (error) {
      // Error already handled in createSQLiteBackup
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileValidation(null);
      return;
    }

    setSelectedFile(file);
    
    try {
      const validation = await validateBackupFile(file);
      setFileValidation(validation);
    } catch (error) {
      setFileValidation({ isValid: false, error: 'Erro ao validar arquivo' });
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile || !fileValidation?.isValid) return;

    try {
      setIsRestoring(true);
      await restoreFromJsonBackup(selectedFile);
      onDataRestored?.();
      
      // Reset form
      setSelectedFile(null);
      setFileValidation(null);
      const fileInput = document.getElementById('backup-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      // Error already handled in restoreFromJsonBackup
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreAutoBackup = async (backupKey: string) => {
    try {
      setIsRestoring(true);
      await restoreFromAutomaticBackup(backupKey);
      onDataRestored?.();
    } catch (error) {
      // Error already handled in restoreFromAutomaticBackup
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estatísticas do Banco de Dados
          </CardTitle>
          <CardDescription>
            Informações sobre os dados armazenados no seu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{backupStats.totalTables}</div>
              <div className="text-sm text-muted-foreground">Tabelas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{backupStats.totalRecords}</div>
              <div className="text-sm text-muted-foreground">Registros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.study_plans || 0}</div>
              <div className="text-sm text-muted-foreground">Planos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.questions || 0}</div>
              <div className="text-sm text-muted-foreground">Questões</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Criar Backup
          </CardTitle>
          <CardDescription>
            Faça backup dos seus dados para ter uma cópia de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                <span className="font-medium">Backup JSON</span>
                <Badge variant="secondary">Recomendado</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Backup completo em formato JSON. Compatível com importação e fácil de ler.
              </p>
              <Button 
                onClick={handleCreateJsonBackup}
                disabled={isCreatingBackup}
                className="w-full"
              >
                <FileJson className="h-4 w-4 mr-2" />
                {isCreatingBackup ? 'Criando...' : 'Backup JSON'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span className="font-medium">Backup SQLite</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Arquivo de banco de dados nativo. Útil para desenvolvimento e análise avançada.
              </p>
              <Button 
                onClick={handleCreateSQLiteBackup}
                disabled={isCreatingBackup}
                variant="outline"
                className="w-full"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                {isCreatingBackup ? 'Criando...' : 'Backup SQLite'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restaurar Backup
          </CardTitle>
          <CardDescription>
            Restaure dados de um backup anterior. <strong>Atenção:</strong> Todos os dados atuais serão substituídos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="backup-file" className="block text-sm font-medium mb-2">
                Selecionar arquivo de backup (JSON)
              </label>
              <input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {selectedFile && fileValidation && (
              <div className={`p-3 rounded-md border ${fileValidation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {fileValidation.isValid ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <span className="font-medium">✓ Arquivo válido</span>
                    </div>
                    {fileValidation.metadata && (
                      <div className="text-sm text-green-600">
                        <p>Data: {new Date(fileValidation.metadata.exportedAt).toLocaleString()}</p>
                        <p>Registros: {fileValidation.metadata.totalRecords}</p>
                        <p>Tabelas: {fileValidation.metadata.tables?.length || 0}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-700">
                    <span className="font-medium">✗ Arquivo inválido</span>
                    {fileValidation.error && (
                      <p className="text-sm mt-1">{fileValidation.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handleRestoreBackup}
              disabled={!selectedFile || !fileValidation?.isValid || isRestoring}
              variant="destructive"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Backups */}
      {automaticBackups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Backups Automáticos
            </CardTitle>
            <CardDescription>
              Backups criados automaticamente pelo sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {automaticBackups.map((backup) => (
                <div key={backup.key} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <div className="font-medium">{new Date(backup.date).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">{formatFileSize(backup.size)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreAutoBackup(backup.key)}
                    disabled={isRestoring}
                  >
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}