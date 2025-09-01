/**
 * TypeScript types for Dexie-based Hero Task Database
 * These types correspond to the IndexedDB schema and provide strong typing
 */

// Core entity interfaces

export interface HeroProfile {
  id?: number; // Auto-increment primary key
  totalXp: number;
  level: number;
  heroName: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface Stage {
  id: string; // Format: stage-{journeyId}-{order}
  title: string;
  description?: string;
  order: number;
  tasks?: StageTask[]; // Embedded tasks (source of truth is tasks table)
  completed?: boolean;
  createdAt?: string;
}

export interface StageTask {
  id?: number; // Links to tasks table
  title: string;
  description?: string;
  completed?: boolean;
  priority?: number;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Journey {
  id?: number; // Auto-increment primary key
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  stages: Stage[]; // Embedded stages for quick access
  isActive?: boolean; // Current active journey flag
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Task {
  id?: number; // Auto-increment primary key
  stageId: string; // References Stage.id
  journeyId: string; // References Journey.id (string for consistency)
  title: string;
  description?: string;
  completed: boolean;
  priority: number; // 0-10 scale
  startDate?: string; // ISO string
  dueDate?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // Set when completed = true
}

export interface Habit {
  id: string; // Format: habit-{timestamp}-{hash}
  stageId: string; // References Stage.id
  journeyId: string; // References Journey.id
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  streak?: number;
  lastCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HeroAttribute {
  id: string; // e.g., 'focus', 'discipline', 'energy'
  name: string; // Display name
  level: number;
  xp: number;
  area: string; // e.g., 'mental', 'physical', 'intellectual'
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeHistory {
  id: string; // Format: history-{attributeId}-{timestamp}
  attributeId: string; // References HeroAttribute.id
  xpGained: number;
  source?: string; // What activity generated the XP
  createdAt: string;
}

export interface AttributeGoal {
  id: string; // Format: goal-{attributeId}-{timestamp}
  attributeId: string; // References HeroAttribute.id
  title: string;
  description?: string;
  targetLevel?: number;
  targetXp?: number;
  deadline?: string; // ISO string
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Utility types for database operations

export type CreateHeroProfile = Omit<HeroProfile, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateHeroProfile = Partial<Omit<HeroProfile, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export type CreateJourney = Omit<Journey, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateJourney = Partial<Omit<Journey, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export type CreateTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateTask = Partial<Omit<Task, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export type CreateHabit = Omit<Habit, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateHabit = Partial<Omit<Habit, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export type CreateHeroAttribute = Omit<HeroAttribute, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateHeroAttribute = Partial<Omit<HeroAttribute, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

export type CreateAttributeHistory = Omit<AttributeHistory, 'createdAt'> & {
  createdAt?: string;
};

export type CreateAttributeGoal = Omit<AttributeGoal, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateAttributeGoal = Partial<Omit<AttributeGoal, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

// Filter and query types

export interface TaskFilters {
  stageId?: string;
  journeyId?: string;
  completed?: boolean;
  priority?: number;
  dueDateBefore?: string;
  dueDateAfter?: string;
}

export interface HabitFilters {
  stageId?: string;
  journeyId?: string;
  isActive?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

export interface JourneyFilters {
  status?: 'active' | 'completed' | 'paused' | 'archived';
  isActive?: boolean;
}

// Statistics and analytics types

export interface DatabaseStats {
  heroProfile: number;
  journeys: number;
  tasks: number;
  habits: number;
  heroAttributes: number;
  attributeHistory: number;
  attributeGoals: number;
}

export interface JourneyStats {
  id: number;
  title: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalHabits: number;
  activeHabits: number;
}

export interface AttributeStats {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXpGained: number;
  recentActivity: AttributeHistory[];
}

// Backup and export types

export interface DatabaseExport {
  version: number;
  timestamp: string;
  data: {
    heroProfile: HeroProfile[];
    journeys: Journey[];
    tasks: Task[];
    habits: Habit[];
    heroAttributes: HeroAttribute[];
    attributeHistory: AttributeHistory[];
    attributeGoals: AttributeGoal[];
  };
}

// Migration types

export interface MigrationContext {
  version: number;
  previousVersion?: number;
  timestamp: string;
}

export interface SQLiteToHeroTaskMigration {
  studyPlans: Journey[];
  studySessions: Task[];
  appSettings: HeroProfile;
  studyGoals: AttributeGoal[];
  performanceMetrics: AttributeHistory[];
}