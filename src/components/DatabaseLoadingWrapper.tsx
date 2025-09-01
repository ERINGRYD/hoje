import React from 'react';
import { useDB } from '@/contexts/DBProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Database } from 'lucide-react';

interface DatabaseLoadingWrapperProps {
  children: React.ReactNode;
}

/**
 * Componente que exibe loading ou erro enquanto o banco SQLite está sendo inicializado
 * Usa o novo contexto global de banco de dados
 */
export const DatabaseLoadingWrapper: React.FC<DatabaseLoadingWrapperProps> = ({ children }) => {
  const { isLoading, error, db } = useDB();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <strong>Erro no banco de dados:</strong>
            <br />
            {error}
            <br />
            <small className="text-muted-foreground mt-2 block">
              Tente recarregar a página. Se o problema persistir, seus dados podem ter sido corrompidos.
            </small>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !db) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Carregando banco de dados...</h2>
            <p className="text-sm text-muted-foreground">
              Inicializando sistema de persistência
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};