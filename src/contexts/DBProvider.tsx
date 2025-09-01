import React, { createContext, useContext, useEffect, useState } from 'react';
import { studyDB } from '@/lib/studyDatabase';
import { setDB, setScheduleSave } from '../db/singleton';

type DBContextType = {
  db: any;
  scheduleSave: () => void;
  isLoading: boolean;
  error: string | null;
};

const DBContext = createContext<DBContextType | null>(null);

const IDB_KEY = 'lovable_sqlite_db';

// No longer needed - handled by StudyAppDatabase

/**
 * Provider do contexto do banco de dados SQLite
 * Inicializa o banco apenas uma vez e fornece acesso global
 */
export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setLocalDb] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  let saveTimeout: NodeJS.Timeout;

  /**
   * Agenda o salvamento do banco com debounce - agora delegado para StudyAppDatabase
   */
  function scheduleSave() {
    studyDB.scheduleSave();
  }

  useEffect(() => {
    let mounted = true;
    
    const initializeDatabase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🚀 Initializing StudyAppDatabase via DBProvider...');
        
        // Use new centralized database class
        const loadedDb = await studyDB.initialize();
        
        if (!mounted) return;
        
        setLocalDb(loadedDb);
        
        // Set the global database instance for singleton compatibility
        setDB(loadedDb);
        
        // Inject scheduleSave function into singleton for global access
        setScheduleSave(() => studyDB.scheduleSave());
        
        console.log('✅ StudyAppDatabase initialized successfully via DBProvider');
      } catch (err) {
        if (!mounted) return;
        const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
        setError(errorMessage);
        console.error('💥 Failed to initialize StudyAppDatabase:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();
    
    return () => {
      mounted = false;
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, []);

  return (
    <DBContext.Provider value={{ db, scheduleSave, isLoading, error }}>
      {children}
    </DBContext.Provider>
  );
}

/**
 * Hook para acessar o contexto do banco de dados
 */
export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx) {
    throw new Error('useDB must be used within DBProvider');
  }
  return ctx;
}