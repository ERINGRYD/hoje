/**
 * Native Backup & Restore System for Study App
 * Following HeroTask pattern for offline-first data management
 */

import { studyDB } from '@/lib/studyDatabase';
import { toast } from '@/hooks/use-toast';

export interface BackupMetadata {
  version: number;
  exportedAt: string;
  appName: string;
  totalRecords: number;
  tables: string[];
}

/**
 * Create and download JSON backup
 */
export async function createJsonBackup(): Promise<void> {
  try {
    console.log('📤 Creating JSON backup...');
    
    const jsonData = await studyDB.exportAllData();
    const backup = JSON.parse(jsonData);
    
    // Add metadata
    const metadata: BackupMetadata = {
      version: backup.version,
      exportedAt: backup.exportedAt,
      appName: 'StudyApp',
      totalRecords: Object.values(backup.data as Record<string, any[]>).reduce((sum: number, table: any[]) => sum + (Array.isArray(table) ? table.length : 0), 0),
      tables: Object.keys(backup.data)
    };

    const finalBackup = {
      metadata,
      ...backup
    };

    // Create download
    const blob = new Blob([JSON.stringify(finalBackup, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Backup Criado",
      description: `Backup JSON baixado com ${metadata.totalRecords} registros`
    });

    console.log('✅ JSON backup created successfully');
  } catch (error) {
    console.error('❌ Error creating JSON backup:', error);
    toast({
      title: "Erro",
      description: "Falha ao criar backup JSON",
      variant: "destructive"
    });
    throw error;
  }
}

/**
 * Create and download SQLite backup
 */
export function createSQLiteBackup(): void {
  try {
    console.log('📤 Creating SQLite backup...');
    
    const blob = studyDB.createBackup();
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-app-database-${new Date().toISOString().split('T')[0]}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Backup SQLite Criado",
      description: "Arquivo de banco de dados baixado"
    });

    console.log('✅ SQLite backup created successfully');
  } catch (error) {
    console.error('❌ Error creating SQLite backup:', error);
    toast({
      title: "Erro",
      description: "Falha ao criar backup SQLite",
      variant: "destructive"
    });
    throw error;
  }
}

/**
 * Restore from JSON backup file
 */
export async function restoreFromJsonBackup(file: File): Promise<void> {
  try {
    console.log('📥 Restoring from JSON backup...');
    
    const text = await file.text();
    let backupData;
    
    try {
      backupData = JSON.parse(text);
    } catch (parseError) {
      throw new Error('Arquivo JSON inválido');
    }

    // Validate backup format
    if (!backupData.data || !backupData.version) {
      throw new Error('Formato de backup inválido');
    }

    // Show confirmation with metadata
    const metadata = backupData.metadata;
    const confirmMessage = metadata 
      ? `Restaurar backup de ${new Date(metadata.exportedAt).toLocaleDateString()} com ${metadata.totalRecords} registros?`
      : 'Restaurar este backup? Todos os dados atuais serão substituídos.';

    if (!confirm(confirmMessage + '\n\nEsta ação não pode ser desfeita.')) {
      return;
    }

    await studyDB.importAllData(text);

    toast({
      title: "Backup Restaurado",
      description: "Dados restaurados com sucesso. Recarregue a página.",
      duration: 5000
    });

    console.log('✅ JSON backup restored successfully');
    
    // Suggest page reload
    setTimeout(() => {
      if (confirm('Recarregar a página para ver os dados restaurados?')) {
        window.location.reload();
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error restoring JSON backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    toast({
      title: "Erro na Restauração",
      description: errorMessage,
      variant: "destructive"
    });
    throw error;
  }
}

/**
 * Validate backup file before restoration
 */
export async function validateBackupFile(file: File): Promise<{ isValid: boolean; metadata?: BackupMetadata; error?: string }> {
  try {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return { isValid: false, error: 'Apenas arquivos JSON são suportados' };
    }

    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.data || !data.version) {
      return { isValid: false, error: 'Formato de backup inválido' };
    }

    return { 
      isValid: true, 
      metadata: data.metadata 
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Arquivo JSON corrompido ou inválido' 
    };
  }
}

/**
 * Get backup statistics for current database
 */
export function getBackupStats(): { totalTables: number; totalRecords: number; tables: Record<string, number> } {
  try {
    const stats = studyDB.getStats();
    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return {
      totalTables: Object.keys(stats).length,
      totalRecords,
      tables: stats
    };
  } catch (error) {
    console.error('❌ Error getting backup stats:', error);
    return { totalTables: 0, totalRecords: 0, tables: {} };
  }
}

/**
 * Create automatic backup (for scheduled backups)
 */
export async function createAutomaticBackup(): Promise<boolean> {
  try {
    const stats = getBackupStats();
    
    // Only create backup if there's meaningful data
    if (stats.totalRecords < 5) {
      console.log('⏭️ Skipping automatic backup - insufficient data');
      return false;
    }

    const jsonData = await studyDB.exportAllData();
    const backupKey = `auto_backup_${new Date().toISOString().split('T')[0]}`;
    
    // Store in localStorage (with size limit)
    try {
      localStorage.setItem(backupKey, jsonData);
      
      // Keep only last 3 automatic backups
      const keys = Object.keys(localStorage).filter(key => key.startsWith('auto_backup_'));
      if (keys.length > 3) {
        keys.sort();
        keys.slice(0, -3).forEach(key => localStorage.removeItem(key));
      }
      
      console.log('✅ Automatic backup created');
      return true;
    } catch (storageError) {
      console.warn('⚠️ Could not store automatic backup in localStorage:', storageError);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating automatic backup:', error);
    return false;
  }
}

/**
 * Restore from automatic backup
 */
export async function restoreFromAutomaticBackup(backupKey: string): Promise<void> {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error('Backup automático não encontrado');
    }

    if (!confirm('Restaurar backup automático? Todos os dados atuais serão substituídos.')) {
      return;
    }

    await studyDB.importAllData(backupData);

    toast({
      title: "Backup Automático Restaurado",
      description: "Dados restaurados com sucesso",
    });

    console.log('✅ Automatic backup restored');
  } catch (error) {
    console.error('❌ Error restoring automatic backup:', error);
    toast({
      title: "Erro",
      description: "Falha ao restaurar backup automático",
      variant: "destructive"
    });
    throw error;
  }
}

/**
 * Get list of available automatic backups
 */
export function getAutomaticBackups(): Array<{ key: string; date: string; size: number }> {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('auto_backup_'));
    
    return keys.map(key => {
      const data = localStorage.getItem(key) || '';
      const date = key.replace('auto_backup_', '');
      
      return {
        key,
        date,
        size: new Blob([data]).size
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('❌ Error getting automatic backups:', error);
    return [];
  }
}
