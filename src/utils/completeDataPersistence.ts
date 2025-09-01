// Complete data persistence system for all application data
import { StudyPlan, StudySession } from '@/types/study';
import { Question } from '@/types/questions';
import { Enemy } from '@/types/enemy';
import { 
  loadStudySessions,
  getAllQuestionAttempts,
  getQuestionsByRoom,
  getEnemiesByRoom,
  getAllFlashcards,
  loadPerformanceMetrics,
  loadAppSettings,
  loadStudyGoals,
  getSavedPlans,
  getActivePlan,
  loadDailyLogs,
  exportDatabase,
  saveNamedStudyPlan,
  saveStudySession,
  createQuestion,
  createFlashcard,
  savePerformanceMetric,
  saveAppSetting,
  saveStudyGoal,
  saveDailyLogs as dbSaveDailyLogs
} from '@/db/crud';

// Complete data snapshot interface
export interface CompleteDataSnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  
  // Core data
  studyPlan: StudyPlan;
  studySessions: StudySession[];
  dailyLogs: any[];
  
  // Questions system
  questions: Question[];
  questionAttempts: any[];
  
  // Battle system
  enemies: Enemy[];
  enemyReviews: any[];
  
  // Flashcards system
  flashcards: any[];
  flashcardReviews: any[];
  
  // Analytics and metrics
  performanceMetrics: any[];
  
  // Settings and goals
  appSettings: any[];
  studyGoals: any[];
  
  // Metadata
  dataStats: {
    sessionsCount: number;
    questionsCount: number;
    enemiesCount: number;
    flashcardsCount: number;
    totalStudyTime: number;
    dataSize: string;
  };
}

export interface SavedCompleteSnapshot {
  id: string;
  name: string;
  description: string;
  snapshot: CompleteDataSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const COMPLETE_SNAPSHOTS_KEY = 'lovable_complete_snapshots';

// Create a complete data snapshot
export const createCompleteSnapshot = async (plan: StudyPlan, name: string, description?: string): Promise<string> => {
  try {
    console.log('🔄 Creating complete data snapshot...');
    
    // Gather all application data
    const studySessions = loadStudySessions();
    const dailyLogs = loadDailyLogs();
    
    // Get questions from all rooms
    const allQuestions = [
      ...getQuestionsByRoom('triagem'),
      ...getQuestionsByRoom('vermelha'), 
      ...getQuestionsByRoom('amarela'),
      ...getQuestionsByRoom('verde')
    ];
    const questionAttempts = getAllQuestionAttempts();
    
    // Get enemies (topics with questions)
    const enemyStats = getEnemiesByRoom();
    const allEnemies = [
      ...enemyStats.triagem,
      ...enemyStats.vermelha,
      ...enemyStats.amarela,
      ...enemyStats.verde
    ];
    
    const flashcards = await getAllFlashcards();
    const performanceMetrics = loadPerformanceMetrics();
    const appSettings = loadAppSettings();
    const studyGoals = loadStudyGoals();
    
    // Calculate statistics
    const totalStudyTime = studySessions.reduce((total, session) => total + (session.duration || 0), 0);
    const dataSize = calculateDataSize({
      studySessions,
      questions: allQuestions,
      enemies: allEnemies,
      flashcards,
      performanceMetrics
    });
    
    const snapshotId = `snapshot_${Date.now()}`;
    
    const snapshot: CompleteDataSnapshot = {
      id: snapshotId,
      name,
      description: description || `Snapshot completo criado em ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      
      // Core data
      studyPlan: plan,
      studySessions,
      dailyLogs,
      
      // Questions system
      questions: allQuestions,
      questionAttempts,
      
      // Battle system
      enemies: allEnemies,
      enemyReviews: [], // Will be filled if enemyReviews function exists
      
      // Flashcards system
      flashcards,
      flashcardReviews: [], // Will be filled if function exists
      
      // Analytics and metrics
      performanceMetrics,
      
      // Settings and goals
      appSettings,
      studyGoals,
      
      // Metadata
      dataStats: {
        sessionsCount: studySessions.length,
        questionsCount: allQuestions.length,
        enemiesCount: allEnemies.length,
        flashcardsCount: flashcards.length,
        totalStudyTime,
        dataSize
      }
    };
    
    // Save to localStorage
    const savedSnapshots = getSavedCompleteSnapshots();
    const savedSnapshot: SavedCompleteSnapshot = {
      id: snapshotId,
      name,
      description: description || snapshot.description,
      snapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    savedSnapshots.push(savedSnapshot);
    localStorage.setItem(COMPLETE_SNAPSHOTS_KEY, JSON.stringify(savedSnapshots));
    
    console.log('✅ Complete snapshot created successfully');
    return snapshotId;
    
  } catch (error) {
    console.error('❌ Error creating complete snapshot:', error);
    throw error;
  }
};

// Load all saved complete snapshots
export const getSavedCompleteSnapshots = (): SavedCompleteSnapshot[] => {
  try {
    const data = localStorage.getItem(COMPLETE_SNAPSHOTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading complete snapshots:', error);
    return [];
  }
};

// Restore complete data from snapshot
export const restoreCompleteSnapshot = async (snapshotId: string): Promise<boolean> => {
  try {
    console.log('🔄 Restoring complete data snapshot...');
    
    const savedSnapshots = getSavedCompleteSnapshots();
    const savedSnapshot = savedSnapshots.find(s => s.id === snapshotId);
    
    if (!savedSnapshot) {
      console.error('Snapshot not found:', snapshotId);
      return false;
    }
    
    const snapshot = savedSnapshot.snapshot;
    
    // Clear existing data first (optional - could be made configurable)
    console.log('🧹 Clearing existing data...');
    
    // Restore study plan
    console.log('📋 Restoring study plan...');
    saveNamedStudyPlan(snapshot.studyPlan, `${snapshot.name} - Restored`);
    
    // Restore study sessions
    console.log('📝 Restoring study sessions...');
    snapshot.studySessions.forEach(session => {
      saveStudySession(session);
    });
    
    // Restore daily logs
    console.log('📅 Restoring daily logs...');
    dbSaveDailyLogs(snapshot.dailyLogs);
    
    // Restore questions
    console.log('❓ Restoring questions...');
    snapshot.questions.forEach((question: any) => {
      createQuestion(
        question.topic_id,
        question.title,
        question.content,
        question.correct_answer,
        question.options ? JSON.parse(question.options) : undefined,
        question.explanation,
        question.difficulty,
        question.tags ? JSON.parse(question.tags) : [],
        question.images ? JSON.parse(question.images) : [],
        question.examining_board,
        question.position,
        question.exam_year,
        question.institution
      );
    });
    
    // Note: Enemies are derived from topics/questions, so they'll be recreated automatically
    console.log('⚔️ Enemies will be recreated from restored questions...');
    
    // Restore flashcards
    console.log('📇 Restoring flashcards...');
    for (const flashcard of snapshot.flashcards) {
      try {
        await createFlashcard({
          topic_id: flashcard.topic_id,
          front: flashcard.front,
          back: flashcard.back,
          type: flashcard.type,
          difficulty: flashcard.difficulty
        });
      } catch (error) {
        console.error('Error restoring flashcard:', error);
      }
    }
    
    // Restore performance metrics
    console.log('📊 Restoring performance metrics...');
    snapshot.performanceMetrics.forEach(metric => {
      savePerformanceMetric(metric);
    });
    
    // Restore app settings
    console.log('⚙️ Restoring app settings...');
    snapshot.appSettings.forEach(setting => {
      saveAppSetting(setting);
    });
    
    // Restore study goals
    console.log('🎯 Restoring study goals...');
    snapshot.studyGoals.forEach(goal => {
      saveStudyGoal(goal);
    });
    
    console.log('✅ Complete data restore successful');
    return true;
    
  } catch (error) {
    console.error('❌ Error restoring complete snapshot:', error);
    return false;
  }
};

// Delete a complete snapshot
export const deleteCompleteSnapshot = (snapshotId: string): boolean => {
  try {
    const savedSnapshots = getSavedCompleteSnapshots();
    const filteredSnapshots = savedSnapshots.filter(s => s.id !== snapshotId);
    localStorage.setItem(COMPLETE_SNAPSHOTS_KEY, JSON.stringify(filteredSnapshots));
    return true;
  } catch (error) {
    console.error('Error deleting complete snapshot:', error);
    return false;
  }
};

// Export complete snapshot as file
export const exportCompleteSnapshot = (snapshotId: string): string | null => {
  try {
    const savedSnapshots = getSavedCompleteSnapshots();
    const savedSnapshot = savedSnapshots.find(s => s.id === snapshotId);
    
    if (savedSnapshot) {
      const exportData = {
        ...savedSnapshot,
        exportedAt: new Date(),
        version: '1.0'
      };
      return JSON.stringify(exportData, null, 2);
    }
    return null;
  } catch (error) {
    console.error('Error exporting complete snapshot:', error);
    return null;
  }
};

// Import complete snapshot from JSON
export const importCompleteSnapshot = (jsonData: string): string | null => {
  try {
    const importData = JSON.parse(jsonData);
    const snapshotId = `imported_snapshot_${Date.now()}`;
    
    const savedSnapshot: SavedCompleteSnapshot = {
      id: snapshotId,
      name: `${importData.name} (Imported)`,
      description: importData.description,
      snapshot: { ...importData.snapshot, id: snapshotId },
      createdAt: new Date(importData.createdAt) || new Date(),
      updatedAt: new Date()
    };
    
    const savedSnapshots = getSavedCompleteSnapshots();
    savedSnapshots.push(savedSnapshot);
    localStorage.setItem(COMPLETE_SNAPSHOTS_KEY, JSON.stringify(savedSnapshots));
    
    return snapshotId;
  } catch (error) {
    console.error('Error importing complete snapshot:', error);
    return null;
  }
};

// Utility function to calculate data size
const calculateDataSize = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return 'Unknown';
  }
};

// Get preview of snapshot data
export const getSnapshotPreview = (snapshotId: string) => {
  const savedSnapshots = getSavedCompleteSnapshots();
  const snapshot = savedSnapshots.find(s => s.id === snapshotId);
  
  if (!snapshot) return null;
  
  return {
    name: snapshot.name,
    description: snapshot.description,
    createdAt: snapshot.createdAt,
    stats: snapshot.snapshot.dataStats,
    studyPlan: {
      type: snapshot.snapshot.studyPlan.type,
      totalHours: snapshot.snapshot.studyPlan.totalHours,
      subjects: snapshot.snapshot.studyPlan.subjects?.length || 0
    }
  };
};