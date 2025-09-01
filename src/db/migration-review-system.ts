import { getDBOrThrow, getScheduleSave } from './singleton';

/**
 * Migração para adicionar campos do sistema de revisão espaçada inteligente
 */
export const migrateReviewSystem = (): boolean => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();
  
  try {
    console.log('Starting intelligent review system migration...');
    
    // Verifica se as colunas já existem
    const checkStmt = database.prepare("PRAGMA table_info(enemy_reviews)");
    const columns = [];
    
    while (checkStmt.step()) {
      const row = checkStmt.getAsObject();
      columns.push(row.name);
    }
    checkStmt.free();
    
    // Adiciona novas colunas se não existirem
    if (!columns.includes('ease_factor')) {
      database.run('ALTER TABLE enemy_reviews ADD COLUMN ease_factor REAL DEFAULT 2.5');
      console.log('Added ease_factor column');
    }
    
    if (!columns.includes('average_quality')) {
      database.run('ALTER TABLE enemy_reviews ADD COLUMN average_quality REAL DEFAULT 0');
      console.log('Added average_quality column');
    }
    
    if (!columns.includes('streak_count')) {
      database.run('ALTER TABLE enemy_reviews ADD COLUMN streak_count INTEGER DEFAULT 0');
      console.log('Added streak_count column');
    }
    
    if (!columns.includes('failure_count')) {
      database.run('ALTER TABLE enemy_reviews ADD COLUMN failure_count INTEGER DEFAULT 0');
      console.log('Added failure_count column');
    }
    
    if (!columns.includes('personalized_multiplier')) {
      database.run('ALTER TABLE enemy_reviews ADD COLUMN personalized_multiplier REAL DEFAULT 1.0');
      console.log('Added personalized_multiplier column');
    }
    
    // Inicializa dados existentes com valores padrão inteligentes
    const initStmt = database.prepare(`
      UPDATE enemy_reviews 
      SET 
        ease_factor = CASE 
          WHEN ease_factor IS NULL THEN 2.5 
          ELSE ease_factor 
        END,
        average_quality = CASE 
          WHEN average_quality IS NULL THEN 
            CASE 
              WHEN total_reviews > 0 THEN 3.0 
              ELSE 0 
            END
          ELSE average_quality 
        END,
        streak_count = CASE 
          WHEN streak_count IS NULL THEN 0 
          ELSE streak_count 
        END,
        failure_count = CASE 
          WHEN failure_count IS NULL THEN 0 
          ELSE failure_count 
        END,
        personalized_multiplier = CASE 
          WHEN personalized_multiplier IS NULL THEN 1.0 
          ELSE personalized_multiplier 
        END
      WHERE ease_factor IS NULL 
         OR average_quality IS NULL 
         OR streak_count IS NULL 
         OR failure_count IS NULL 
         OR personalized_multiplier IS NULL
    `);
    
    const changes = initStmt.run();
    initStmt.free();
    
    if (changes > 0) {
      console.log(`Initialized ${changes} existing review records with default values`);
    }
    
    scheduleSave();
    console.log('Intelligent review system migration completed successfully');
    
    return true;
  } catch (error) {
    console.error('Error migrating review system:', error);
    return false;
  }
};

/**
 * Reverte a migração (para testes)
 */
export const revertReviewSystemMigration = (): boolean => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();
  
  try {
    console.log('Reverting review system migration...');
    
    // SQLite não suporta DROP COLUMN, então precisamos recriar a tabela
    database.run(`
      CREATE TABLE enemy_reviews_backup AS 
      SELECT 
        id, topic_id, current_review_cycle, next_review_date, 
        last_review_date, is_blocked, total_reviews, exam_date,
        created_at, updated_at
      FROM enemy_reviews
    `);
    
    database.run('DROP TABLE enemy_reviews');
    
    database.run(`
      CREATE TABLE enemy_reviews (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL,
        current_review_cycle INTEGER DEFAULT 0,
        next_review_date TEXT NOT NULL,
        last_review_date TEXT,
        is_blocked BOOLEAN DEFAULT TRUE,
        total_reviews INTEGER DEFAULT 0,
        exam_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE
      )
    `);
    
    database.run(`
      INSERT INTO enemy_reviews SELECT * FROM enemy_reviews_backup
    `);
    
    database.run('DROP TABLE enemy_reviews_backup');
    
    // Recria índices
    database.run('CREATE INDEX IF NOT EXISTS idx_enemy_reviews_topic_id ON enemy_reviews(topic_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_enemy_reviews_next_review_date ON enemy_reviews(next_review_date)');
    database.run('CREATE INDEX IF NOT EXISTS idx_enemy_reviews_is_blocked ON enemy_reviews(is_blocked)');
    
    scheduleSave();
    console.log('Review system migration reverted successfully');
    
    return true;
  } catch (error) {
    console.error('Error reverting review system migration:', error);
    return false;
  }
};