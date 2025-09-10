/**
 * One-time migration to ensure data consistency and active plan stability
 */

import { studyDB } from '@/lib/studyDatabase';
import { saveTypedSetting, loadTypedSetting } from '@/db/crud/appSettings';

const MIGRATION_KEY = 'study_data_migration_v1_completed';

/**
 * Ensures there's always a stable active plan reference
 * Runs once per app initialization to fix any data inconsistencies
 */
export const ensureActiveStudyPlan = (): void => {
  try {
    // Check if migration already completed
    const migrationCompleted = localStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted === 'true') {
      console.log('✅ Migração de dados já concluída');
      return;
    }

    console.log('🔄 Iniciando migração de dados do plano ativo...');

    const db = studyDB.getDB();

    // Step 1: Check if there's an active plan in app_settings
    let activePlanId = loadTypedSetting<string>('active_plan_id', '');

    if (!activePlanId) {
      // Step 2: Try to find active plan from saved_plans
      const activeStmt = db.prepare('SELECT * FROM saved_plans WHERE is_active = TRUE LIMIT 1');
      const activeResult = activeStmt.getAsObject();
      activeStmt.free();

      if (activeResult.plan_id) {
        activePlanId = activeResult.plan_id as string;
        console.log('📋 Encontrado plano ativo em saved_plans:', activePlanId);
      } else {
        // Step 3: Fallback to most recent study_plans entry
        const recentStmt = db.prepare('SELECT * FROM study_plans ORDER BY created_at DESC LIMIT 1');
        const recentResult = recentStmt.getAsObject();
        recentStmt.free();

        if (recentResult.id) {
          activePlanId = recentResult.id as string;
          console.log('🔄 Usando plano mais recente:', activePlanId);

          // Create saved_plans entry for this plan
          db.run('UPDATE saved_plans SET is_active = FALSE'); // Mark others inactive
          db.run(`
            INSERT OR REPLACE INTO saved_plans (id, name, plan_id, is_active)
            VALUES (?, ?, ?, TRUE)
          `, [activePlanId, 'Plano Atual', activePlanId]);
        }
      }

      // Save the active plan ID to app settings
      if (activePlanId) {
        saveTypedSetting('active_plan_id', activePlanId, 'general', 'ID do plano de estudos ativo');
        console.log('✅ ID do plano ativo salvo:', activePlanId);
      }
    }

    // Step 4: Cleanup orphaned records (optional)
    db.run(`
      DELETE FROM saved_plans 
      WHERE plan_id NOT IN (SELECT id FROM study_plans)
    `);

    // Mark migration as completed
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('✅ Migração de dados concluída com sucesso');

  } catch (error) {
    console.error('❌ Erro na migração de dados:', error);
    // Don't block app startup on migration failure
  }
};

/**
 * Clear migration flag - useful for testing
 */
export const resetMigration = (): void => {
  localStorage.removeItem(MIGRATION_KEY);
  console.log('🔄 Flag de migração resetada');
};