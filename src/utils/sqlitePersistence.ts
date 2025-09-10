// SQLite-based persistence layer with IndexedDB support
import { StudyPlan, StudySession } from '@/types/study';
import { 
  saveStudyPlan as dbSaveStudyPlan,
  loadStudyPlan as dbLoadStudyPlan,
  deleteStudyPlan as dbDeleteStudyPlan,
  saveNamedStudyPlan,
  getSavedPlans as dbGetSavedPlans,
  getActivePlan as dbGetActivePlan,
  saveStudySession,
  loadStudySessions,
  saveDailyLogs as dbSaveDailyLogs,
  loadDailyLogs as dbLoadDailyLogs,
  exportDatabase,
  // New CRUD functions
  AppSetting,
  StudyGoal,
  PerformanceMetric,
  saveAppSetting,
  loadAppSetting,
  loadAppSettings,
  deleteAppSetting,
  saveTypedSetting,
  loadTypedSetting,
  saveStudyGoal,
  loadStudyGoal,
  loadStudyGoals,
  updateStudyGoalProgress,
  deleteStudyGoal,
  loadGoalsBySubject,
  loadUpcomingGoals,
  savePerformanceMetric,
  loadPerformanceMetric,
  loadPerformanceMetrics,
  deletePerformanceMetric,
  loadDailyMetrics,
  loadWeeklyMetrics,
  loadMonthlyMetrics,
  calculateDailyMetrics
} from '@/db/crud';
import { withDatabase, safeDatabaseOperation } from '@/utils/databaseUtils';
import { studyDB } from '@/lib/studyDatabase';

// Active study plan operations with safe database access
export const saveActiveStudyPlan = (plan: StudyPlan): void => {
  safeDatabaseOperation(() => {
    console.log('💾 Salvando plano ativo:', plan.id || 'sem-id');
    
    // Use stable ID for active plan
    const activeId = plan.id || 'active_plan';
    const planWithId = { ...plan, id: activeId };
    
    // Save to study_plans table
    dbSaveStudyPlan(planWithId);
    
    // Ensure there's always a stable "Plano Atual" entry in saved_plans
    try {
      const db = studyDB.getDB();
      
      // Mark all other plans as inactive
      db.run('UPDATE saved_plans SET is_active = FALSE');
      
      // Create or update the active plan entry
      db.run(`
        INSERT OR REPLACE INTO saved_plans (id, name, plan_id, is_active)
        VALUES (?, ?, ?, TRUE)
      `, [activeId, 'Plano Atual', activeId]);
      
      // Save active plan ID to app settings for extra reliability
      saveTypedSetting('active_plan_id', activeId, 'general', 'ID do plano de estudos ativo');
      
      console.log('✅ Plano ativo salvo com sucesso:', activeId);
    } catch (error) {
      console.error('❌ Erro ao salvar referência do plano ativo:', error);
      throw error;
    }
  });
};

export const loadActiveStudyPlan = (): StudyPlan | null => {
  return withDatabase(() => {
    console.log('📖 Carregando plano ativo...');
    
    try {
      // Priority 1: Load from app_settings active_plan_id
      const activePlanId = loadTypedSetting<string>('active_plan_id', '');
      if (activePlanId) {
        console.log('🎯 Tentando carregar pela configuração:', activePlanId);
        const plan = dbLoadStudyPlan(activePlanId);
        if (plan) {
          console.log('✅ Plano carregado via configuração:', plan.id);
          return plan;
        }
      }

      // Priority 2: Load from saved_plans with is_active = TRUE
      const activePlan = dbGetActivePlan();
      if (activePlan?.plan) {
        console.log('✅ Plano carregado via saved_plans:', activePlan.plan.id);
        return activePlan.plan;
      }

      // Priority 3: Fallback to most recent study_plans entry
      const db = studyDB.getDB();
      const stmt = db.prepare('SELECT * FROM study_plans ORDER BY created_at DESC LIMIT 1');
      const result = stmt.getAsObject();
      stmt.free();

      if (result.id) {
        console.log('🔄 Usando fallback - plano mais recente:', result.id);
        const plan = dbLoadStudyPlan(result.id as string);
        if (plan) {
          // Auto-repair: make this the active plan
          saveActiveStudyPlan(plan);
          console.log('✅ Plano restaurado e marcado como ativo:', plan.id);
          return plan;
        }
      }

      console.log('⚠️ Nenhum plano ativo encontrado');
      return null;
    } catch (error) {
      console.error('❌ Erro ao carregar plano ativo:', error);
      return null;
    }
  }, null);
};

// Daily logs operations with safe database access
export const saveDailyLogs = (logs: any[]): void => {
  safeDatabaseOperation(() => {
    dbSaveDailyLogs(logs);
  });
};

export const loadDailyLogs = (): any[] => {
  return withDatabase(() => {
    return dbLoadDailyLogs();
  }, []);
};

// Advanced plan management
export const saveStudyPlan = (plan: StudyPlan, name: string): string => {
  try {
    return saveNamedStudyPlan(plan, name);
  } catch (error) {
    console.error('Error saving study plan:', error);
    return '';
  }
};

export const getSavedPlans = () => {
  try {
    return dbGetSavedPlans();
  } catch (error) {
    console.error('Error loading saved plans:', error);
    return [];
  }
};

export const loadStudyPlan = (planId: string): StudyPlan | null => {
  try {
    return dbLoadStudyPlan(planId);
  } catch (error) {
    console.error('Error loading study plan:', error);
    return null;
  }
};

export const deleteStudyPlan = (planId: string): boolean => {
  try {
    return dbDeleteStudyPlan(planId);
  } catch (error) {
    console.error('Error deleting study plan:', error);
    return false;
  }
};

export const getActivePlan = () => {
  try {
    return dbGetActivePlan();
  } catch (error) {
    console.error('Error getting active plan:', error);
    return null;
  }
};

// Study sessions
export const saveStudySessionData = (session: StudySession): void => {
  try {
    saveStudySession(session);
  } catch (error) {
    console.error('Error saving study session:', error);
  }
};

export const loadStudySessionsData = (): StudySession[] => {
  try {
    return loadStudySessions();
  } catch (error) {
    console.error('Error loading study sessions:', error);
    return [];
  }
};

// Export/Import functionality
export const exportStudyPlan = (planId: string): string | null => {
  try {
    const plan = loadStudyPlan(planId);
    if (plan) {
      const exportData = {
        plan,
        exportedAt: new Date()
      };
      return JSON.stringify(exportData, null, 2);
    }
    return null;
  } catch (error) {
    console.error('Error exporting study plan:', error);
    return null;
  }
};

export const importStudyPlan = (jsonData: string): string | null => {
  try {
    const importData = JSON.parse(jsonData);
    const planId = `imported_${Date.now()}`;
    const planName = `Imported Plan (${new Date().toLocaleDateString()})`;
    
    const plan: StudyPlan = { ...importData.plan, id: planId };
    return saveStudyPlan(plan, planName);
  } catch (error) {
    console.error('Error importing study plan:', error);
    return null;
  }
};

// Database backup and recovery
export const createBackup = (): Blob => {
  try {
    return exportDatabase();
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

// Re-export new CRUD functions for convenience
export {
  // App Settings
  saveAppSetting,
  loadAppSetting,
  loadAppSettings,
  deleteAppSetting,
  saveTypedSetting,
  loadTypedSetting,
  
  // Study Goals
  saveStudyGoal,
  loadStudyGoal,
  loadStudyGoals,
  updateStudyGoalProgress,
  deleteStudyGoal,
  loadGoalsBySubject,
  loadUpcomingGoals,
  
  // Performance Metrics
  savePerformanceMetric,
  loadPerformanceMetric,
  loadPerformanceMetrics,
  deletePerformanceMetric,
  loadDailyMetrics,
  loadWeeklyMetrics,
  loadMonthlyMetrics,
  calculateDailyMetrics
};

// Re-export types
export type { AppSetting, StudyGoal, PerformanceMetric };
