/**
 * Database Engine Provider
 * Manages the transition between SQLite and Dexie databases
 * Provides a unified interface and handles migration
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { heroTaskDB } from '@/db/dexie/database';
import { migrateSQLiteToDexie, isMigrationNeeded } from '@/db/migrations/sqliteToDexie';
import { toast } from '@/components/ui/use-toast';

export type DatabaseEngine = 'sqlite' | 'dexie';

interface EngineContextType {
  currentEngine: DatabaseEngine;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  switchEngine: (engine: DatabaseEngine) => Promise<void>;
  runMigration: () => Promise<boolean>;
}

const DBEngineContext = createContext<EngineContextType | null>(null);

interface DBEngineProviderProps {
  children: React.ReactNode;
  preferredEngine?: DatabaseEngine; // Allow override for testing
}

/**
 * Database Engine Provider Component
 * Manages the database engine selection and migration process
 */
export function DBEngineProvider({ 
  children, 
  preferredEngine = 'dexie' // Default to Dexie for new architecture
}: DBEngineProviderProps) {
  const [currentEngine, setCurrentEngine] = useState<DatabaseEngine>('sqlite'); // Start with SQLite for compatibility
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize the database engine system
   */
  const initializeEngine = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing Database Engine System...');

      // Initialize Dexie database
      console.log('📊 Initializing Dexie database...');
      await heroTaskDB.open();
      console.log('✅ Dexie database ready');

      // Check if migration is needed
      const needsMigration = await isMigrationNeeded();
      console.log(`🔍 Migration needed: ${needsMigration}`);

      if (needsMigration) {
        console.log('🔄 Running automatic migration...');
        
        toast({
          title: 'Migrando dados',
          description: 'Atualizando o banco de dados para a nova arquitetura...'
        });

        const migrationSuccess = await migrateSQLiteToDexie();
        
        if (migrationSuccess) {
          toast({
            title: 'Migração concluída',
            description: 'Dados migrados com sucesso para a nova arquitetura!'
          });
          
          // Switch to Dexie after successful migration
          setCurrentEngine('dexie');
        } else {
          console.warn('⚠️ Migration failed, staying with SQLite');
          toast({
            title: 'Falha na migração',
            description: 'Continuando com o sistema anterior. Funcionalidade não afetada.',
            variant: 'destructive'
          });
          
          // Stay with SQLite if migration fails
          setCurrentEngine('sqlite');
        }
      } else {
        // No migration needed, use preferred engine
        const targetEngine = preferredEngine;
        console.log(`✅ No migration needed, using ${targetEngine}`);
        setCurrentEngine(targetEngine);
      }

      setIsInitialized(true);
      console.log(`✅ Database Engine System initialized with ${currentEngine}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown database engine error';
      console.error('❌ Database Engine initialization failed:', err);
      setError(errorMessage);
      
      // Fallback to SQLite on initialization error
      setCurrentEngine('sqlite');

      toast({
        title: 'Erro na inicialização',
        description: 'Usando sistema de backup. Funcionalidade não afetada.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch between database engines
   */
  const switchEngine = async (engine: DatabaseEngine): Promise<void> => {
    if (engine === currentEngine) {
      console.log(`✅ Already using ${engine} engine`);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 Switching to ${engine} engine...`);

      if (engine === 'dexie') {
        // Ensure Dexie is initialized
        await heroTaskDB.open();
        
        // If switching to Dexie and there's SQLite data, offer migration
        const needsMigration = await isMigrationNeeded();
        if (needsMigration) {
          const migrationSuccess = await migrateSQLiteToDexie();
          if (!migrationSuccess) {
            throw new Error('Migration to Dexie failed');
          }
        }
      }

      setCurrentEngine(engine);
      
      toast({
        title: 'Engine alterado',
        description: `Agora usando ${engine === 'dexie' ? 'IndexedDB + Dexie' : 'SQLite'}.`
      });

      console.log(`✅ Switched to ${engine} engine successfully`);

    } catch (err) {
      console.error(`❌ Failed to switch to ${engine}:`, err);
      
      toast({
        title: 'Erro ao alterar engine',
        description: 'Mantendo engine atual.',
        variant: 'destructive'
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manually run migration
   */
  const runMigration = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      toast({
        title: 'Iniciando migração',
        description: 'Migrando dados do SQLite para Dexie...'
      });

      const success = await migrateSQLiteToDexie();
      
      if (success) {
        toast({
          title: 'Migração concluída',
          description: 'Dados migrados com sucesso!'
        });
        
        // Switch to Dexie after successful migration
        setCurrentEngine('dexie');
      } else {
        toast({
          title: 'Falha na migração',
          description: 'Não foi possível migrar os dados.',
          variant: 'destructive'
        });
      }

      return success;

    } catch (error) {
      console.error('❌ Manual migration failed:', error);
      
      toast({
        title: 'Erro na migração',
        description: 'Falha ao migrar os dados.',
        variant: 'destructive'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeEngine();
  }, [preferredEngine]);

  const contextValue: EngineContextType = {
    currentEngine,
    isLoading,
    isInitialized,
    error,
    switchEngine,
    runMigration
  };

  return (
    <DBEngineContext.Provider value={contextValue}>
      {children}
    </DBEngineContext.Provider>
  );
}

/**
 * Hook to access the database engine context
 */
export function useDBEngine(): EngineContextType {
  const context = useContext(DBEngineContext);
  if (!context) {
    throw new Error('useDBEngine must be used within DBEngineProvider');
  }
  return context;
}

/**
 * Hook to check if Dexie engine is active
 */
export function useDexieEngine(): boolean {
  const { currentEngine, isInitialized } = useDBEngine();
  return isInitialized && currentEngine === 'dexie';
}

/**
 * Hook to check if SQLite engine is active
 */
export function useSQLiteEngine(): boolean {
  const { currentEngine, isInitialized } = useDBEngine();
  return isInitialized && currentEngine === 'sqlite';
}