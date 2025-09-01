/**
 * StudyAppDatabase - Centralized database class following HeroTask pattern
 * Manages SQLite database with IndexedDB persistence, migrations, and initialization
 */

import initSqlJs, { Database } from 'sql.js';
import * as idbKeyval from 'idb-keyval';
import { migrateKeyIfNeeded } from '../db/keyMigration';
import schema from '../db/schema.sql?raw';

// Database version and configuration
const DB_VERSION = 2;
const IDB_KEY = 'lovable_sqlite_db';
const MIGRATIONS_KEY = `study_app_migrations_v${DB_VERSION}`;

export class StudyAppDatabase {
  private db: Database | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Single instance pattern
  private static instance: StudyAppDatabase | null = null;

  static getInstance(): StudyAppDatabase {
    if (!StudyAppDatabase.instance) {
      StudyAppDatabase.instance = new StudyAppDatabase();
    }
    return StudyAppDatabase.instance;
  }

  /**
   * Initialize database - must be called before any operations
   */
  async initialize(): Promise<Database> {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    try {
      console.log('🚀 Initializing StudyAppDatabase...');
      
      // Migrate old IndexedDB key if needed
      await migrateKeyIfNeeded();
      
      // Initialize SQL.js
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Load or create database
      this.db = await this.loadOrCreateDatabase(SQL);
      
      // Run post-initialization migrations
      await this.runPostInitMigrations();
      
      // Initialize default data
      await this.initializeDefaultData();
      
      this.isInitialized = true;
      console.log('✅ StudyAppDatabase initialized successfully');
      
      return this.db;
    } catch (error) {
      console.error('💥 Failed to initialize StudyAppDatabase:', error);
      throw error;
    }
  }

  /**
   * Get database instance (throws if not initialized)
   */
  getDB(): Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Schedule save with debounce
   */
  scheduleSave(): void {
    if (!this.db) return;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveDatabase();
    }, 1000);
  }

  /**
   * Save database to IndexedDB
   */
  private async saveDatabase(): Promise<void> {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      await idbKeyval.set(IDB_KEY, data);
      console.log('💾 Database saved to IndexedDB');
    } catch (error) {
      console.error('❌ Error saving database to IndexedDB:', error);
    }
  }

  /**
   * Load database from IndexedDB or create new
   */
  private async loadOrCreateDatabase(SQL: any): Promise<Database> {
    try {
      const buffer = await idbKeyval.get(IDB_KEY);
      if (buffer) {
        console.log('📂 Loading existing database from IndexedDB');
        const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        return new SQL.Database(arr);
      } else {
        console.log('🆕 Creating new database with schema');
        const newDb = new SQL.Database();
        newDb.exec(schema);
        await this.saveDatabase();
        return newDb;
      }
    } catch (error) {
      console.error('⚠️ Error loading database, creating fallback:', error);
      const newDb = new SQL.Database();
      newDb.exec(schema);
      return newDb;
    }
  }

  /**
   * Run post-initialization migrations (similar to HeroTask pattern)
   */
  private async runPostInitMigrations(): Promise<void> {
    try {
      const hasRunMigrations = localStorage.getItem(MIGRATIONS_KEY);
      if (hasRunMigrations) {
        console.log('🔄 Migrations already completed for this version');
        return;
      }

      console.log('🔧 Running post-initialization migrations...');
      
      // Example migration: standardize IDs
      await this.migrateToStringIds();
      
      // Mark migrations as completed
      localStorage.setItem(MIGRATIONS_KEY, 'true');
      console.log('✅ Post-initialization migrations completed');
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Migrate all IDs to consistent string format (following HeroTask pattern)
   */
  private async migrateToStringIds(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Check if migration is needed by looking for numeric IDs
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM study_plans 
        WHERE typeof(id) = 'integer' OR id GLOB '[0-9]*'
      `);
      const result = stmt.getAsObject();
      stmt.free();
      
      if ((result.count as number) > 0) {
        console.log('📝 Migrating numeric IDs to string format...');
        
        // This is a simplified migration - in real scenarios you'd want more robust ID generation
        this.db.exec(`
          UPDATE study_plans 
          SET id = 'plan_' || id 
          WHERE typeof(id) = 'integer' OR (id GLOB '[0-9]*' AND id NOT LIKE 'plan_%');
        `);
        
        await this.saveDatabase();
        console.log('✅ ID migration completed');
      }
    } catch (error) {
      console.error('❌ Error during ID migration:', error);
    }
  }

  /**
   * Initialize default data (similar to HeroTask initializeHeroAttributes)
   */
  private async initializeDefaultData(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Initialize default user progress if not exists
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM user_progress');
      const result = stmt.getAsObject();
      stmt.free();
      
      if ((result.count as number) === 0) {
        console.log('🎯 Initializing default user progress...');
        this.db.run(`
          INSERT INTO user_progress (id, total_xp, current_level, xp_for_next_level)
          VALUES ('user_progress', 0, 1, 100)
        `);
        
        await this.saveDatabase();
        console.log('✅ Default user progress initialized');
      }
      
      // Initialize default app settings if needed
      await this.initializeDefaultSettings();
      
    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }

  /**
   * Initialize default application settings
   */
  private async initializeDefaultSettings(): Promise<void> {
    if (!this.db) return;
    
    try {
      const defaultSettings = [
        { key: 'pomodoro_work_duration', value: '25', type: 'number', category: 'pomodoro', description: 'Work session duration in minutes' },
        { key: 'pomodoro_break_duration', value: '5', type: 'number', category: 'pomodoro', description: 'Short break duration in minutes' },
        { key: 'pomodoro_long_break_duration', value: '15', type: 'number', category: 'pomodoro', description: 'Long break duration in minutes' },
        { key: 'theme_mode', value: 'system', type: 'string', category: 'theme', description: 'Theme mode preference' },
        { key: 'notifications_enabled', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable notifications' }
      ];

      for (const setting of defaultSettings) {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM app_settings WHERE setting_key = ?');
        const result = stmt.getAsObject([setting.key]);
        stmt.free();
        
        if ((result.count as number) === 0) {
          this.db.run(`
            INSERT INTO app_settings (id, setting_key, setting_value, setting_type, category, description)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            `setting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            setting.key,
            setting.value,
            setting.type,
            setting.category,
            setting.description
          ]);
        }
      }
      
      await this.saveDatabase();
    } catch (error) {
      console.error('❌ Error initializing default settings:', error);
    }
  }

  /**
   * Create backup of entire database
   */
  createBackup(): Blob {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const uint8Array = this.db.export();
    return new Blob([uint8Array], { type: 'application/x-sqlite3' });
  }

  /**
   * Export all data as JSON (HeroTask-style backup)
   */
  async exportAllData(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const exportData = {
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        data: {} as Record<string, any[]>
      };

      // Get all table names
      const tablesStmt = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      const tables = [];
      while (tablesStmt.step()) {
        const row = tablesStmt.getAsObject();
        tables.push(row.name as string);
      }
      tablesStmt.free();

      // Export each table
      for (const tableName of tables) {
        const dataStmt = this.db.prepare(`SELECT * FROM ${tableName}`);
        const tableData = [];
        
        while (dataStmt.step()) {
          tableData.push(dataStmt.getAsObject());
        }
        dataStmt.free();
        
        exportData.data[tableName] = tableData;
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON backup
   */
  async importAllData(jsonData: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.version || !importData.data) {
        throw new Error('Invalid backup format');
      }

      console.log('📥 Importing database backup...');
      
      // Begin transaction
      this.db.run('BEGIN TRANSACTION');

      try {
        // Clear existing data (except for structure)
        const tables = Object.keys(importData.data);
        for (const table of tables) {
          this.db.run(`DELETE FROM ${table}`);
        }

        // Import data
        for (const [tableName, tableData] of Object.entries(importData.data)) {
          if (!Array.isArray(tableData)) continue;
          
          for (const row of tableData) {
            const columns = Object.keys(row);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => row[col]);
            
            this.db.run(`
              INSERT INTO ${tableName} (${columns.join(', ')})
              VALUES (${placeholders})
            `, values);
          }
        }

        // Commit transaction
        this.db.run('COMMIT');
        
        await this.saveDatabase();
        console.log('✅ Database import completed successfully');
      } catch (error) {
        // Rollback on error
        this.db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw error;
    }
  }

  /**
   * Get database statistics (useful for debugging)
   */
  getStats(): Record<string, number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: Record<string, number> = {};
    
    try {
      const tables = [
        'study_plans', 'study_subjects', 'study_topics', 'study_subtopics',
        'study_sessions', 'saved_plans', 'questions', 'flashcards',
        'user_progress', 'app_settings', 'study_goals', 'performance_metrics'
      ];

      for (const table of tables) {
        try {
          const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
          const result = stmt.getAsObject();
          stmt.free();
          stats[table] = result.count as number;
        } catch (error) {
          // Table might not exist in older schemas
          stats[table] = 0;
        }
      }
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
    }

    return stats;
  }

  /**
   * Close database and cleanup
   */
  close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.isInitialized = false;
    StudyAppDatabase.instance = null;
  }
}

// Export singleton instance for global access
export const studyDB = StudyAppDatabase.getInstance();