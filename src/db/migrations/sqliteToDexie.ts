/**
 * Migration utility: SQLite to Dexie
 * Migrates data from the existing SQLite database to the new Dexie-based Hero Task Database
 */

import { heroTaskDB } from '../dexie/database';
import { Journey, Task, HeroProfile, HeroAttribute } from '../dexie/types';
import { StudyPlan, StudySession } from '@/types/study';
import { getDBOrThrow } from '../singleton';
import { withDatabase } from '@/utils/databaseUtils';

interface SQLiteData {
  studyPlans: StudyPlan[];
  studySessions: StudySession[];
  appSettings: Record<string, any>;
  studyGoals: any[];
  performanceMetrics: any[];
}

/**
 * Extract all data from SQLite database
 */
export const extractSQLiteData = (): SQLiteData | null => {
  return withDatabase(() => {
    const db = getDBOrThrow();
    
    console.log('📤 Extracting data from SQLite database...');
    
    try {
      // Extract study plans
      const studyPlansResult = db.exec('SELECT * FROM study_plans ORDER BY created_at DESC');
      const studyPlans: StudyPlan[] = studyPlansResult[0]?.values.map((row: any[]) => ({
        id: row[0],
        subjects: JSON.parse(row[1] || '[]'),
        cycle: JSON.parse(row[2] || '[]'),
        settings: JSON.parse(row[3] || '{}'),
        createdAt: row[4],
        updatedAt: row[5]
      })) || [];

      // Extract study sessions
      const sessionsResult = db.exec('SELECT * FROM study_sessions ORDER BY start_time DESC');
      const studySessions: StudySession[] = sessionsResult[0]?.values.map((row: any[]) => ({
        id: row[0],
        subjectId: row[1],
        topicId: row[2],
        subtopicId: row[3],
        duration: row[4],
        quality: row[5],
        notes: row[6],
        startTime: row[7],
        endTime: row[8],
        completed: Boolean(row[9]),
        createdAt: row[10]
      })) || [];

      // Extract app settings
      const settingsResult = db.exec('SELECT * FROM app_settings');
      const appSettings: Record<string, any> = {};
      settingsResult[0]?.values.forEach((row: any[]) => {
        appSettings[row[0]] = JSON.parse(row[1]);
      });

      // Extract study goals
      const goalsResult = db.exec('SELECT * FROM study_goals ORDER BY created_at DESC');
      const studyGoals = goalsResult[0]?.values.map((row: any[]) => ({
        id: row[0],
        title: row[1],
        description: row[2],
        targetType: row[3],
        targetValue: row[4],
        currentValue: row[5],
        deadline: row[6],
        priority: row[7],
        status: row[8],
        category: row[9],
        subjectId: row[10],
        topicId: row[11],
        createdAt: row[12],
        updatedAt: row[13]
      })) || [];

      // Extract performance metrics
      const metricsResult = db.exec('SELECT * FROM performance_metrics ORDER BY date DESC');
      const performanceMetrics = metricsResult[0]?.values.map((row: any[]) => ({
        id: row[0],
        date: row[1],
        studyTime: row[2],
        sessionsCount: row[3],
        completionRate: row[4],
        averageQuality: row[5],
        focusScore: row[6],
        subjectDistribution: JSON.parse(row[7] || '{}'),
        createdAt: row[8]
      })) || [];

      console.log(`✅ SQLite data extracted:
        - Study Plans: ${studyPlans.length}
        - Study Sessions: ${studySessions.length}
        - App Settings: ${Object.keys(appSettings).length}
        - Study Goals: ${studyGoals.length}
        - Performance Metrics: ${performanceMetrics.length}`);

      return {
        studyPlans,
        studySessions,
        appSettings,
        studyGoals,
        performanceMetrics
      };

    } catch (error) {
      console.error('❌ Failed to extract SQLite data:', error);
      return null;
    }
  }, null);
};

/**
 * Transform SQLite data to Dexie format
 */
export const transformDataToDexie = (sqliteData: SQLiteData) => {
  console.log('🔄 Transforming SQLite data to Dexie format...');

  // Transform HeroProfile from app settings
  const heroProfile: Omit<HeroProfile, 'id'> = {
    totalXp: sqliteData.performanceMetrics.reduce((sum, metric) => sum + (metric.focusScore || 0), 0),
    level: Math.floor(sqliteData.performanceMetrics.length / 10) + 1, // Level based on activity
    heroName: sqliteData.appSettings.user_name || 'Hero',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Transform Journeys from study plans
  const journeys: Omit<Journey, 'id'>[] = sqliteData.studyPlans.map((plan, index) => {
    const stages = plan.subjects?.map((subject, subjectIndex) => ({
      id: `stage-${index}-${subjectIndex}`,
      title: subject.name || `Matéria ${subjectIndex + 1}`,
      description: `Estudo de ${subject.name}`,
      order: subjectIndex,
          tasks: subject.topics?.map((topic: any, topicIndex: number) => ({
            title: topic.name || `Tópico ${topicIndex + 1}`,
            description: `Estudar ${topic.name}`,
            completed: false,
            priority: topic.priority || 0,
            createdAt: new Date().toISOString()
          })) || [],
      completed: false,
      createdAt: new Date().toISOString()
    })) || [];

    return {
      title: `Plano de Estudos ${index + 1}`,
      description: `Plano criado em ${new Date().toLocaleDateString()}`,
      status: 'active' as const,
      stages,
      isActive: index === 0, // First plan is active
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Transform Tasks from study sessions
  const tasks: Omit<Task, 'id'>[] = sqliteData.studySessions.map((session, index) => {
    // Map performance to numeric priority
    const getPerformancePriority = (performance?: string): number => {
      switch (performance) {
        case 'high': return 8;
        case 'medium': return 5;
        case 'low': return 2;
        default: return 5;
      }
    };

    return {
      stageId: `stage-0-0`, // Default to first stage
      journeyId: '1', // Default to first journey
      title: `Sessão de Estudo ${index + 1}`,
      description: session.notes || 'Sessão de estudo migrada',
      completed: session.completed || false,
      priority: getPerformancePriority(session.performance),
      startDate: session.startTime ? new Date(session.startTime).toISOString() : undefined,
      dueDate: session.endTime ? new Date(session.endTime).toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: session.completed && session.endTime ? new Date(session.endTime).toISOString() : undefined
    };
  });

  // Transform HeroAttributes from performance data
  const heroAttributes: Omit<HeroAttribute, 'id'>[] = [];

  console.log(`✅ Data transformation completed:
    - Hero Profile: 1
    - Journeys: ${journeys.length}
    - Tasks: ${tasks.length}
    - Hero Attributes: ${heroAttributes.length}`);

  return {
    heroProfile,
    journeys,
    tasks,
    heroAttributes
  };
};

/**
 * Import transformed data into Dexie database
 */
export const importDataToDexie = async (transformedData: ReturnType<typeof transformDataToDexie>) => {
  console.log('📥 Importing data into Dexie database...');

  try {
    await heroTaskDB.transaction('rw', [
      heroTaskDB.heroProfile,
      heroTaskDB.journeys,
      heroTaskDB.tasks,
      heroTaskDB.heroAttributes
    ], async () => {
      // Import hero profile
      await heroTaskDB.heroProfile.add(transformedData.heroProfile);
      console.log('✅ Hero profile imported');

      // Import journeys
      if (transformedData.journeys.length > 0) {
        await heroTaskDB.journeys.bulkAdd(transformedData.journeys);
        console.log(`✅ ${transformedData.journeys.length} journeys imported`);
      }

      // Import tasks
      if (transformedData.tasks.length > 0) {
        await heroTaskDB.tasks.bulkAdd(transformedData.tasks);
        console.log(`✅ ${transformedData.tasks.length} tasks imported`);
      }

      // Import hero attributes
      if (transformedData.heroAttributes.length > 0) {
        await heroTaskDB.heroAttributes.bulkAdd(transformedData.heroAttributes);
        console.log(`✅ ${transformedData.heroAttributes.length} hero attributes imported`);
      }
    });

    console.log('✅ All data imported successfully to Dexie');
    return true;

  } catch (error) {
    console.error('❌ Failed to import data to Dexie:', error);
    throw error;
  }
};

/**
 * Main migration function: SQLite → Dexie
 */
export const migrateSQLiteToDexie = async (): Promise<boolean> => {
  try {
    console.log('🚀 Starting SQLite to Dexie migration...');

    // Check if migration already completed
    const migrationFlag = localStorage.getItem('sqlite_to_dexie_migration');
    if (migrationFlag === 'completed') {
      console.log('✅ Migration already completed');
      return true;
    }

    // Check if there's data in Dexie already
    const stats = await heroTaskDB.getStats();
    const hasExistingData = Object.values(stats).some(count => count > 0);
    
    if (hasExistingData) {
      console.log('ℹ️ Dexie database already contains data, skipping migration');
      localStorage.setItem('sqlite_to_dexie_migration', 'completed');
      return true;
    }

    // Extract data from SQLite
    const sqliteData = extractSQLiteData();
    if (!sqliteData) {
      console.log('ℹ️ No SQLite data found to migrate');
      localStorage.setItem('sqlite_to_dexie_migration', 'completed');
      return true;
    }

    // Check if there's meaningful data to migrate
    const hasData = sqliteData.studyPlans.length > 0 || 
                   sqliteData.studySessions.length > 0 || 
                   Object.keys(sqliteData.appSettings).length > 0;

    if (!hasData) {
      console.log('ℹ️ No meaningful data to migrate');
      localStorage.setItem('sqlite_to_dexie_migration', 'completed');
      return true;
    }

    // Transform and import data
    const transformedData = transformDataToDexie(sqliteData);
    await importDataToDexie(transformedData);

    // Mark migration as completed
    localStorage.setItem('sqlite_to_dexie_migration', 'completed');
    console.log('✅ SQLite to Dexie migration completed successfully');

    return true;

  } catch (error) {
    console.error('❌ SQLite to Dexie migration failed:', error);
    return false;
  }
};

/**
 * Check if migration is needed
 */
export const isMigrationNeeded = async (): Promise<boolean> => {
  const migrationFlag = localStorage.getItem('sqlite_to_dexie_migration');
  if (migrationFlag === 'completed') {
    return false;
  }

  // Check if there's data in SQLite to migrate
  const sqliteData = extractSQLiteData();
  if (!sqliteData) {
    return false;
  }

  const hasData = sqliteData.studyPlans.length > 0 || 
                 sqliteData.studySessions.length > 0 || 
                 Object.keys(sqliteData.appSettings).length > 0;

  return hasData;
};

/**
 * Reset migration flag (for testing/debugging)
 */
export const resetMigrationFlag = (): void => {
  localStorage.removeItem('sqlite_to_dexie_migration');
  console.log('🔄 Migration flag reset');
};