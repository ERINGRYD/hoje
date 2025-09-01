import Dexie, { type EntityTable } from 'dexie';
import { 
  HeroProfile, 
  Journey, 
  Task, 
  Habit, 
  HeroAttribute, 
  AttributeHistory, 
  AttributeGoal 
} from './types';

/**
 * HeroTaskDatabase - Dexie-based IndexedDB database
 * Schema version 2 with full indexing and relationship support
 */
export class HeroTaskDatabase extends Dexie {
  // Define table schema with proper typing
  heroProfile!: EntityTable<HeroProfile, 'id'>;
  journeys!: EntityTable<Journey, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  heroAttributes!: EntityTable<HeroAttribute, 'id'>;
  attributeHistory!: EntityTable<AttributeHistory, 'id'>;
  attributeGoals!: EntityTable<AttributeGoal, 'id'>;

  constructor() {
    super('HeroTaskDatabase');
    
    // Schema version 2 with comprehensive indexing
    this.version(2).stores({
      // Hero profile - single record per user
      heroProfile: '++id, totalXp, level, heroName, createdAt',
      
      // Journeys with stages embedded - main planning unit
      journeys: '++id, status, createdAt, updatedAt, title, isActive',
      
      // Tasks - normalized from journey stages
      tasks: '++id, stageId, journeyId, title, completed, priority, startDate, dueDate, createdAt, updatedAt, completedAt',
      
      // Habits - recurring activities linked to stages/journeys
      habits: 'id, stageId, journeyId, isActive, updatedAt, createdAt, title',
      
      // Hero attributes - skill/stat system
      heroAttributes: 'id, level, xp, area, createdAt, updatedAt',
      
      // Attribute XP history - tracking progression
      attributeHistory: 'id, attributeId, createdAt, xpGained',
      
      // Attribute goals - targets for progression
      attributeGoals: 'id, attributeId, createdAt, updatedAt, isActive, targetLevel, targetXp'
    });

    // Run post-initialization migrations
    this.on('ready', () => this.runPostInitMigrations());
  }

  /**
   * Post-initialization migrations and data consistency checks
   * Runs once per database instance to normalize and fix data
   */
  private async runPostInitMigrations(): Promise<void> {
    const migrationKey = 'dexie_post_init_migrations_v2';
    
    try {
      // Check if migrations already ran
      const migrationFlag = localStorage.getItem(migrationKey);
      if (migrationFlag === 'completed') {
        console.log('✅ Post-init migrations already completed');
        return;
      }

      console.log('🔄 Running post-initialization migrations...');

      await this.transaction('rw', [
        this.journeys, 
        this.tasks, 
        this.habits, 
        this.heroProfile, 
        this.heroAttributes
      ], async () => {
        // Migration 1: Normalize stage IDs
        await this.migrateStageIds();
        
        // Migration 2: Sync tasks from journey stages
        await this.syncTasksFromJourneys();
        
        // Migration 3: Initialize default profile and attributes
        await this.initializeDefaults();
      });

      // Mark migrations as completed
      localStorage.setItem(migrationKey, 'completed');
      console.log('✅ Post-init migrations completed successfully');

    } catch (error) {
      console.error('❌ Post-init migrations failed:', error);
      // Don't block app startup on migration failure
    }
  }

  /**
   * Migration 1: Normalize stage IDs to format stage-{journeyId}-{order}
   * Updates references in habits and tasks
   */
  private async migrateStageIds(): Promise<void> {
    console.log('🔄 Migrating stage IDs...');
    
    const journeys = await this.journeys.toArray();
    const stageIdMap = new Map<string, string>();
    
    // Build stage ID mapping
    for (const journey of journeys) {
      if (journey.stages) {
        journey.stages.forEach((stage, index) => {
          const oldId = stage.id;
          const newId = `stage-${journey.id}-${index}`;
          
          if (oldId !== newId) {
            stageIdMap.set(oldId, newId);
            stage.id = newId;
          }
        });
        
        // Update journey with normalized stage IDs
        await this.journeys.update(journey.id!, { stages: journey.stages });
      }
    }
    
    // Update habits with new stage IDs
    if (stageIdMap.size > 0) {
      const habits = await this.habits.toArray();
      
      for (const habit of habits) {
        const newStageId = stageIdMap.get(habit.stageId);
        if (newStageId && newStageId !== habit.stageId) {
          await this.habits.update(habit.id, { 
            stageId: newStageId,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`✅ Stage ID migration completed (${stageIdMap.size} IDs updated)`);
  }

  /**
   * Migration 2: Sync tasks from journey stages to tasks table
   * Preserves existing task IDs and generates new ones when needed
   */
  private async syncTasksFromJourneys(): Promise<void> {
    console.log('🔄 Syncing tasks from journeys...');
    
    const journeys = await this.journeys.toArray();
    let syncedCount = 0;
    
    for (const journey of journeys) {
      if (journey.stages) {
        for (const stage of journey.stages) {
          if (stage.tasks) {
            for (const task of stage.tasks) {
              // Check if task already exists in tasks table
              const existingTask = task.id ? await this.tasks.get(task.id) : null;
              
              if (!existingTask) {
                // Create new task record
                const taskRecord: Omit<Task, 'id'> = {
                  stageId: stage.id,
                  journeyId: journey.id!.toString(),
                  title: task.title || 'Untitled Task',
                  description: task.description,
                  completed: task.completed || false,
                  priority: task.priority || 0,
                  startDate: task.startDate,
                  dueDate: task.dueDate,
                  createdAt: task.createdAt || new Date().toISOString(),
                  updatedAt: task.updatedAt || new Date().toISOString(),
                  completedAt: task.completedAt
                };
                
                // Generate ID if task doesn't have one
                if (task.id) {
                  await this.tasks.add({ ...taskRecord, id: task.id });
                } else {
                  const newId = await this.tasks.add(taskRecord);
                  task.id = newId;
                }
                
                syncedCount++;
              }
            }
          }
        }
        
        // Update journey with task IDs
        await this.journeys.update(journey.id!, { stages: journey.stages });
      }
    }
    
    console.log(`✅ Task sync completed (${syncedCount} tasks synced)`);
  }

  /**
   * Migration 3: Initialize default profile and hero attributes
   */
  private async initializeDefaults(): Promise<void> {
    console.log('🔄 Initializing defaults...');
    
    // Initialize default profile if none exists
    const profileCount = await this.heroProfile.count();
    if (profileCount === 0) {
      await this.heroProfile.add({
        totalXp: 0,
        level: 1,
        heroName: 'Hero',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Default hero profile created');
    }
    
    // Initialize base attributes if none exist
    const attributeCount = await this.heroAttributes.count();
    if (attributeCount === 0) {
      const baseAttributes = [
        { id: 'focus', name: 'Focus', area: 'mental' },
        { id: 'discipline', name: 'Discipline', area: 'mental' },
        { id: 'energy', name: 'Energy', area: 'physical' },
        { id: 'knowledge', name: 'Knowledge', area: 'intellectual' },
        { id: 'creativity', name: 'Creativity', area: 'creative' },
        { id: 'social', name: 'Social', area: 'social' }
      ];
      
      const now = new Date().toISOString();
      
      for (const attr of baseAttributes) {
        await this.heroAttributes.add({
          id: attr.id,
          name: attr.name,
          level: 1,
          xp: 0,
          area: attr.area,
          createdAt: now,
          updatedAt: now
        });
      }
      
      console.log(`✅ Base attributes initialized (${baseAttributes.length} attributes)`);
    }
  }

  /**
   * Export all data as JSON for backup/migration purposes
   */
  async exportAllData(): Promise<object> {
    console.log('📤 Exporting all database data...');
    
    const [
      heroProfile,
      journeys,
      tasks,
      habits,
      heroAttributes,
      attributeHistory,
      attributeGoals
    ] = await Promise.all([
      this.heroProfile.toArray(),
      this.journeys.toArray(),
      this.tasks.toArray(),
      this.habits.toArray(),
      this.heroAttributes.toArray(),
      this.attributeHistory.toArray(),
      this.attributeGoals.toArray()
    ]);

    const exportData = {
      version: 2,
      timestamp: new Date().toISOString(),
      data: {
        heroProfile,
        journeys,
        tasks,
        habits,
        heroAttributes,
        attributeHistory,
        attributeGoals
      }
    };

    console.log('✅ Data export completed');
    return exportData;
  }

  /**
   * Import data from JSON backup
   */
  async importAllData(importData: any): Promise<void> {
    console.log('📥 Importing database data...');
    
    if (!importData.data) {
      throw new Error('Invalid import data structure');
    }

    await this.transaction('rw', [
      this.heroProfile,
      this.journeys,
      this.tasks,
      this.habits,
      this.heroAttributes,
      this.attributeHistory,
      this.attributeGoals
    ], async () => {
      // Clear existing data
      await Promise.all([
        this.heroProfile.clear(),
        this.journeys.clear(),
        this.tasks.clear(),
        this.habits.clear(),
        this.heroAttributes.clear(),
        this.attributeHistory.clear(),
        this.attributeGoals.clear()
      ]);

      // Import new data
      const { data } = importData;
      
      await Promise.all([
        data.heroProfile?.length ? this.heroProfile.bulkAdd(data.heroProfile) : Promise.resolve(),
        data.journeys?.length ? this.journeys.bulkAdd(data.journeys) : Promise.resolve(),
        data.tasks?.length ? this.tasks.bulkAdd(data.tasks) : Promise.resolve(),
        data.habits?.length ? this.habits.bulkAdd(data.habits) : Promise.resolve(),
        data.heroAttributes?.length ? this.heroAttributes.bulkAdd(data.heroAttributes) : Promise.resolve(),
        data.attributeHistory?.length ? this.attributeHistory.bulkAdd(data.attributeHistory) : Promise.resolve(),
        data.attributeGoals?.length ? this.attributeGoals.bulkAdd(data.attributeGoals) : Promise.resolve()
      ]);
    });

    console.log('✅ Data import completed');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    heroProfile: number;
    journeys: number;
    tasks: number;
    habits: number;
    heroAttributes: number;
    attributeHistory: number;
    attributeGoals: number;
  }> {
    const [
      heroProfileCount,
      journeysCount,
      tasksCount,
      habitsCount,
      heroAttributesCount,
      attributeHistoryCount,
      attributeGoalsCount
    ] = await Promise.all([
      this.heroProfile.count(),
      this.journeys.count(),
      this.tasks.count(),
      this.habits.count(),
      this.heroAttributes.count(),
      this.attributeHistory.count(),
      this.attributeGoals.count()
    ]);

    return {
      heroProfile: heroProfileCount,
      journeys: journeysCount,
      tasks: tasksCount,
      habits: habitsCount,
      heroAttributes: heroAttributesCount,
      attributeHistory: attributeHistoryCount,
      attributeGoals: attributeGoalsCount
    };
  }
}

// Export singleton instance
export const heroTaskDB = new HeroTaskDatabase();