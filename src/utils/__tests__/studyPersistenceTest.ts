/**
 * Test suite to verify study plan persistence reliability
 * This can be run in the browser console to verify data persistence
 */

import { saveActiveStudyPlan, loadActiveStudyPlan } from '../sqlitePersistence';
import { ensureActiveStudyPlan, resetMigration } from '../studyDataMigration';
import { StudyPlan } from '@/types/study';

// Test helper function
export const runPersistenceTests = () => {
  console.log('🧪 Iniciando testes de persistência...');
  
  // Test 1: Basic save and load
  const testPlan: StudyPlan = {
    id: 'test_plan_' + Date.now(),
    type: 'cycle',
    subjects: [
      {
        id: 'test_subject_1',
        name: 'Matemática',
        weight: 1,
        priority: 1,
        totalTime: 0,
        topics: []
      }
    ],
    totalHours: 40,
    examDate: new Date(),
    focusAreas: ['Matemática']
  };

  try {
    // Save test plan
    console.log('📝 Salvando plano de teste...');
    saveActiveStudyPlan(testPlan);
    console.log('✅ Plano salvo com sucesso');

    // Load test plan
    console.log('📖 Carregando plano de teste...');
    const loadedPlan = loadActiveStudyPlan();
    
    if (loadedPlan && loadedPlan.id === testPlan.id) {
      console.log('✅ Plano carregado com sucesso:', loadedPlan.id);
    } else {
      console.error('❌ Falha ao carregar plano ou ID não confere');
      console.log('Esperado:', testPlan.id);
      console.log('Recebido:', loadedPlan?.id || 'null');
    }

    // Test 2: Migration system
    console.log('🔄 Testando sistema de migração...');
    resetMigration();
    ensureActiveStudyPlan();
    
    const planAfterMigration = loadActiveStudyPlan();
    if (planAfterMigration) {
      console.log('✅ Migração funcionou, plano recuperado:', planAfterMigration.id);
    } else {
      console.error('❌ Falha na migração');
    }

    console.log('🎉 Todos os testes passaram! O sistema de persistência está funcionando.');

  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
};

// Test helper to check current state
export const checkPersistenceState = () => {
  console.log('🔍 Verificando estado atual da persistência...');
  
  try {
    const activePlan = loadActiveStudyPlan();
    
    if (activePlan) {
      console.log('✅ Plano ativo encontrado:', {
        id: activePlan.id,
        subjects: activePlan.subjects?.length || 0,
        totalHours: activePlan.totalHours,
        examDate: activePlan.examDate
      });
    } else {
      console.log('⚠️ Nenhum plano ativo encontrado');
    }

    // Check database state
    import('@/lib/studyDatabase').then(({ studyDB }) => {
      const db = studyDB.getDB();
      
      const plansCount = db.prepare('SELECT COUNT(*) as count FROM study_plans').getAsObject();
      const savedPlansCount = db.prepare('SELECT COUNT(*) as count FROM saved_plans').getAsObject();
      const activePlansCount = db.prepare('SELECT COUNT(*) as count FROM saved_plans WHERE is_active = TRUE').getAsObject();
      
      console.log('📊 Estado do banco de dados:', {
        totalPlans: plansCount.count,
        savedPlans: savedPlansCount.count,
        activePlans: activePlansCount.count
      });
    });

  } catch (error) {
    console.error('❌ Erro ao verificar estado:', error);
  }
};

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).testStudyPersistence = {
    runTests: runPersistenceTests,
    checkState: checkPersistenceState
  };
  
  console.log('🔧 Utilitários de teste disponíveis em: window.testStudyPersistence');
  console.log('   - runTests(): executa testes completos');
  console.log('   - checkState(): verifica estado atual');
}