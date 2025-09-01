/**
 * Unified hooks for Study Database following HeroTask pattern
 * Provides clean, consistent interface for all database operations
 */

import { useState, useEffect, useCallback } from 'react';
import { studyDB } from '@/lib/studyDatabase';
import { StudyPlan, StudySubject, StudyTopic, StudySession } from '@/types/study';
import { toast } from '@/hooks/use-toast';

// Custom hook for database initialization status
export function useDatabase() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await studyDB.initialize();
        setIsInitialized(true);
        console.log('✅ Database hooks initialized');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Database initialization failed';
        setError(errorMessage);
        console.error('❌ Database initialization error:', err);
        toast({
          title: "Erro no Banco de Dados",
          description: "Falha ao inicializar o banco de dados. Algumas funcionalidades podem não funcionar.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    initDb();
  }, []);

  return { isLoading, error, isInitialized };
}

// Study Plans hook
export function useStudyPlans() {
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = studyDB.getDB();
      
      const stmt = db.prepare(`
        SELECT sp.*, p.type, p.exam_date, p.total_hours 
        FROM saved_plans sp
        JOIN study_plans p ON sp.plan_id = p.id
        ORDER BY sp.updated_at DESC
      `);
      
      const results = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          id: row.id as string,
          name: row.name as string,
          plan: {
            id: row.plan_id as string,
            type: row.type as string,
            examDate: row.exam_date ? new Date(row.exam_date as string) : undefined,
            totalHours: row.total_hours as number
          },
          createdAt: new Date(row.created_at as string),
          updatedAt: new Date(row.updated_at as string),
          isActive: Boolean(row.is_active)
        });
      }
      stmt.free();
      
      setSavedPlans(results);
      console.log('📋 Study plans refreshed:', results.length);
    } catch (error) {
      console.error('❌ Error refreshing plans:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar planos salvos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePlan = useCallback(async (plan: StudyPlan, name: string): Promise<string> => {
    try {
      const db = studyDB.getDB();
      const planId = plan.id || `plan_${Date.now()}`;

      // Save the study plan
      db.run(`
        INSERT OR REPLACE INTO study_plans (
          id, type, exam_date, days_until_exam, total_hours, focus_areas,
          intensity, methodology, weekly_hour_limit, data, cycle_data, weekly_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        planId,
        plan.type,
        plan.examDate ? new Date(plan.examDate).toISOString() : null,
        plan.daysUntilExam || null,
        plan.totalHours,
        JSON.stringify(plan.focusAreas || []),
        plan.intensity || null,
        plan.methodology || null,
        plan.weeklyHourLimit || null,
        JSON.stringify(plan.data || {}),
        JSON.stringify(plan.cycle || []),
        JSON.stringify(plan.weekly || [])
      ]);

      // Save subjects
      plan.subjects.forEach(subject => {
        db.run(`
          INSERT OR REPLACE INTO study_subjects (
            id, plan_id, name, weight, level, color, priority, last_studied, total_time, custom_subject
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          subject.id,
          planId,
          subject.name,
          subject.weight || 1.0,
          subject.level || null,
          subject.color || null,
          subject.priority || 0,
          subject.lastStudied ? new Date(subject.lastStudied).toISOString() : null,
          subject.totalTime || 0,
          subject.customSubject || false
        ]);

        // Save topics and subtopics
        subject.topics?.forEach(topic => {
          db.run(`
            INSERT OR REPLACE INTO study_topics (
              id, subject_id, name, weight, completed, last_studied, total_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            topic.id,
            subject.id,
            topic.name,
            topic.weight || 1.0,
            topic.completed || false,
            topic.lastStudied ? new Date(topic.lastStudied).toISOString() : null,
            topic.totalTime || 0
          ]);

          topic.subtopics?.forEach(subtopic => {
            db.run(`
              INSERT OR REPLACE INTO study_subtopics (
                id, topic_id, name, weight, completed, last_studied, total_time
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              subtopic.id,
              topic.id,
              subtopic.name,
              subtopic.weight || 1.0,
              subtopic.completed || false,
              subtopic.lastStudied ? new Date(subtopic.lastStudied).toISOString() : null,
              subtopic.totalTime || 0
            ]);
          });
        });
      });

      // Mark other plans as inactive and save named plan
      db.run('UPDATE saved_plans SET is_active = FALSE');
      db.run(`
        INSERT OR REPLACE INTO saved_plans (id, name, plan_id, is_active)
        VALUES (?, ?, ?, TRUE)
      `, [planId, name, planId]);

      studyDB.scheduleSave();
      await refreshPlans();
      
      toast({
        title: "Sucesso",
        description: `Plano "${name}" salvo com sucesso!`
      });
      
      return planId;
    } catch (error) {
      console.error('❌ Error saving plan:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar o plano",
        variant: "destructive"
      });
      throw error;
    }
  }, [refreshPlans]);

  const loadPlan = useCallback(async (planId: string): Promise<StudyPlan | null> => {
    try {
      const db = studyDB.getDB();
      
      // Load plan
      const planStmt = db.prepare('SELECT * FROM study_plans WHERE id = ?');
      const planResult = planStmt.getAsObject([planId]);
      planStmt.free();

      if (!planResult.id) return null;

      // Load subjects
      const subjectsStmt = db.prepare('SELECT * FROM study_subjects WHERE plan_id = ?');
      const subjects = [];
      
      subjectsStmt.bind([planId]);
      while (subjectsStmt.step()) {
        const subjectRow = subjectsStmt.getAsObject();
        
        // Load topics for this subject
        const topicsStmt = db.prepare('SELECT * FROM study_topics WHERE subject_id = ?');
        const topics = [];
        
        topicsStmt.bind([subjectRow.id]);
        while (topicsStmt.step()) {
          const topicRow = topicsStmt.getAsObject();
          
          // Load subtopics for this topic
          const subtopicsStmt = db.prepare('SELECT * FROM study_subtopics WHERE topic_id = ?');
          const subtopics = [];
          
          subtopicsStmt.bind([topicRow.id]);
          while (subtopicsStmt.step()) {
            const subtopicRow = subtopicsStmt.getAsObject();
            subtopics.push({
              id: subtopicRow.id as string,
              name: subtopicRow.name as string,
              topicId: subtopicRow.topic_id as string,
              weight: subtopicRow.weight as number,
              completed: Boolean(subtopicRow.completed),
              lastStudied: subtopicRow.last_studied ? new Date(subtopicRow.last_studied as string) : undefined,
              totalTime: subtopicRow.total_time as number
            });
          }
          subtopicsStmt.free();
          
          topics.push({
            id: topicRow.id as string,
            name: topicRow.name as string,
            subjectId: topicRow.subject_id as string,
            subtopics,
            weight: topicRow.weight as number,
            completed: Boolean(topicRow.completed),
            lastStudied: topicRow.last_studied ? new Date(topicRow.last_studied as string) : undefined,
            totalTime: topicRow.total_time as number
          });
        }
        topicsStmt.free();
        
        subjects.push({
          id: subjectRow.id as string,
          name: subjectRow.name as string,
          topics,
          weight: subjectRow.weight as number,
          level: subjectRow.level as 'beginner' | 'intermediate' | 'advanced' || undefined,
          color: subjectRow.color as string || undefined,
          priority: subjectRow.priority as number,
          lastStudied: subjectRow.last_studied ? new Date(subjectRow.last_studied as string) : undefined,
          totalTime: subjectRow.total_time as number,
          customSubject: Boolean(subjectRow.custom_subject)
        });
      }
      subjectsStmt.free();

      const plan: StudyPlan = {
        id: planResult.id as string,
        type: planResult.type as 'cycle' | 'schedule',
        examDate: planResult.exam_date ? new Date(planResult.exam_date as string) : undefined,
        daysUntilExam: planResult.days_until_exam as number || undefined,
        subjects,
        totalHours: planResult.total_hours as number,
        focusAreas: JSON.parse(planResult.focus_areas as string || '[]'),
        intensity: planResult.intensity as 'low' | 'medium' | 'high' || undefined,
        methodology: planResult.methodology as 'pomodoro' | 'timeboxing' | 'custom' || undefined,
        weeklyHourLimit: planResult.weekly_hour_limit as number || undefined,
        data: JSON.parse(planResult.data as string || '{}'),
        cycle: JSON.parse(planResult.cycle_data as string || '[]'),
        weekly: JSON.parse(planResult.weekly_data as string || '[]')
      };

      console.log('📖 Plan loaded successfully:', plan.id);
      return plan;
    } catch (error) {
      console.error('❌ Error loading plan:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar o plano",
        variant: "destructive"
      });
      return null;
    }
  }, []);

  const deletePlan = useCallback(async (planId: string): Promise<boolean> => {
    try {
      const db = studyDB.getDB();
      db.run('DELETE FROM study_plans WHERE id = ?', [planId]);
      studyDB.scheduleSave();
      await refreshPlans();
      
      toast({
        title: "Sucesso",
        description: "Plano excluído com sucesso"
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir o plano",
        variant: "destructive"
      });
      return false;
    }
  }, [refreshPlans]);

  // Initialize data on mount
  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  return {
    savedPlans,
    isLoading,
    refreshPlans,
    savePlan,
    loadPlan,
    deletePlan
  };
}

// Backup and restore hook
export function useBackupRestore() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportData = useCallback(async (): Promise<string> => {
    try {
      setIsExporting(true);
      const jsonData = await studyDB.exportAllData();
      
      toast({
        title: "Sucesso",
        description: "Dados exportados com sucesso"
      });
      
      return jsonData;
    } catch (error) {
      console.error('❌ Export error:', error);
      toast({
        title: "Erro",
        description: "Falha ao exportar dados",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importData = useCallback(async (jsonData: string): Promise<void> => {
    try {
      setIsImporting(true);
      await studyDB.importAllData(jsonData);
      
      toast({
        title: "Sucesso",
        description: "Dados importados com sucesso. Recarregue a página para ver as mudanças."
      });
    } catch (error) {
      console.error('❌ Import error:', error);
      toast({
        title: "Erro",
        description: "Falha ao importar dados. Verifique se o arquivo é válido.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const createSQLiteBackup = useCallback((): Blob => {
    try {
      return studyDB.createBackup();
    } catch (error) {
      console.error('❌ Backup error:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar backup",
        variant: "destructive"
      });
      throw error;
    }
  }, []);

  return {
    exportData,
    importData,
    createSQLiteBackup,
    isExporting,
    isImporting
  };
}

// Database statistics hook
export function useDatabaseStats() {
  const [stats, setStats] = useState<Record<string, number>>({});

  const refreshStats = useCallback(() => {
    try {
      const currentStats = studyDB.getStats();
      setStats(currentStats);
    } catch (error) {
      console.error('❌ Error getting stats:', error);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, refreshStats };
}