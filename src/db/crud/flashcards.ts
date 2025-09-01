import { getDBOrThrow } from '../singleton';

export interface Flashcard {
  id: string;
  topic_id: string;
  front: string;
  back: string;
  type: 'concept' | 'definition' | 'formula' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard';
  times_reviewed: number;
  last_reviewed?: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardWithTopic extends Flashcard {
  topic_name: string;
  subject_name: string;
}

/**
 * Create a new flashcard
 */
export const createFlashcard = async (flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at' | 'times_reviewed'>): Promise<string> => {
  const database = getDBOrThrow();
  const id = crypto.randomUUID();
  
  const stmt = database.prepare(`
    INSERT INTO flashcards (id, topic_id, front, back, type, difficulty)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    id,
    flashcard.topic_id,
    flashcard.front,
    flashcard.back,
    flashcard.type,
    flashcard.difficulty
  ]);
  
  return id;
};

/**
 * Get all flashcards with topic information
 */
export const getAllFlashcards = async (): Promise<FlashcardWithTopic[]> => {
  try {
    const database = getDBOrThrow();
    
    const stmt = database.prepare(`
      SELECT 
        f.*,
        t.name as topic_name,
        s.name as subject_name
      FROM flashcards f
      JOIN study_topics t ON f.topic_id = t.id
      JOIN study_subjects s ON t.subject_id = s.id
      ORDER BY f.created_at DESC
    `);
    
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    
    console.log('getAllFlashcards result:', results);
    return results as FlashcardWithTopic[];
  } catch (error) {
    console.error('Error in getAllFlashcards:', error);
    return [];
  }
};

/**
 * Get flashcards by topic
 */
export const getFlashcardsByTopic = async (topicId: string): Promise<Flashcard[]> => {
  try {
    const database = getDBOrThrow();
    
    const stmt = database.prepare(`
      SELECT * FROM flashcards 
      WHERE topic_id = ?
      ORDER BY created_at DESC
    `);
    
    const results = [];
    stmt.bind([topicId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    
    return results as Flashcard[];
  } catch (error) {
    console.error('Error in getFlashcardsByTopic:', error);
    return [];
  }
};

/**
 * Get a single flashcard by ID
 */
export const getFlashcardById = async (id: string): Promise<Flashcard | null> => {
  const database = getDBOrThrow();
  
  const stmt = database.prepare(`
    SELECT * FROM flashcards WHERE id = ?
  `);
  
  stmt.bind([id]);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  
  return result as Flashcard | null;
};

/**
 * Update a flashcard
 */
export const updateFlashcard = async (id: string, updates: Partial<Pick<Flashcard, 'front' | 'back' | 'type' | 'difficulty'>>): Promise<void> => {
  const database = getDBOrThrow();
  
  const fields = [];
  const values = [];
  
  if (updates.front !== undefined) {
    fields.push('front = ?');
    values.push(updates.front);
  }
  if (updates.back !== undefined) {
    fields.push('back = ?');
    values.push(updates.back);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(updates.difficulty);
  }
  
  if (fields.length === 0) return;
  
  const stmt = database.prepare(`
    UPDATE flashcards 
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  stmt.run([...values, id]);
};

/**
 * Update flashcard review statistics with spaced repetition algorithm
 */
export const updateFlashcardReview = async (id: string, quality: 'easy' | 'good' | 'hard' | 'again'): Promise<void> => {
  const database = getDBOrThrow();
  
  // Calculate next review interval based on quality
  let interval = 1; // days
  switch (quality) {
    case 'again':
      interval = 1;
      break;
    case 'hard':
      interval = 2;
      break;
    case 'good':
      interval = 4;
      break;
    case 'easy':
      interval = 7;
      break;
  }
  
  const stmt = database.prepare(`
    UPDATE flashcards 
    SET times_reviewed = times_reviewed + 1,
        last_reviewed = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run([id]);
};

/**
 * Delete a flashcard
 */
export const deleteFlashcard = async (id: string): Promise<void> => {
  const database = getDBOrThrow();
  
  const stmt = database.prepare(`
    DELETE FROM flashcards WHERE id = ?
  `);
  
  stmt.run([id]);
};

/**
 * Get flashcards ready for review (based on spaced repetition)
 */
export const getFlashcardsForReview = async (topicId?: string): Promise<FlashcardWithTopic[]> => {
  try {
    const database = getDBOrThrow();
    
    let query = `
      SELECT 
        f.*,
        t.name as topic_name,
        s.name as subject_name,
        er.next_review_date,
        er.is_blocked
      FROM flashcards f
      JOIN study_topics t ON f.topic_id = t.id
      JOIN study_subjects s ON t.subject_id = s.id
      LEFT JOIN enemy_reviews er ON f.topic_id = er.topic_id
      WHERE (er.next_review_date IS NULL OR er.next_review_date <= datetime('now'))
      AND (er.is_blocked IS NULL OR er.is_blocked = 0)
    `;
    
    const params = [];
    
    if (topicId) {
      query += ' AND f.topic_id = ?';
      params.push(topicId);
    }
    
    query += ' ORDER BY f.last_reviewed ASC NULLS FIRST, f.created_at ASC';
    
    const stmt = database.prepare(query);
    const results = [];
    
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    
    return results as FlashcardWithTopic[];
  } catch (error) {
    console.error('Error in getFlashcardsForReview:', error);
    return [];
  }
};

/**
 * Get all study topics with subject information
 */
export const getAllTopics = async () => {
  try {
    const database = getDBOrThrow();
    
    const stmt = database.prepare(`
      SELECT 
        t.id,
        t.name,
        t.subject_id,
        s.name as subject_name
      FROM study_topics t
      JOIN study_subjects s ON t.subject_id = s.id
      ORDER BY s.name, t.name
    `);
    
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    
    console.log('getAllTopics result:', results);
    return results;
  } catch (error) {
    console.error('Error in getAllTopics:', error);
    return [];
  }
};

/**
 * Get flashcard statistics
 */
export const getFlashcardStats = async (): Promise<{
  total: number;
  reviewed: number;
  needsReview: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
}> => {
  try {
    const database = getDBOrThrow();
    
    // Total count
    const totalStmt = database.prepare('SELECT COUNT(*) as count FROM flashcards');
    const totalResult = totalStmt.step() ? totalStmt.getAsObject() : { count: 0 };
    const total = (totalResult as any)?.count || 0;
    totalStmt.free();
    
    // Reviewed count
    const reviewedStmt = database.prepare('SELECT COUNT(*) as count FROM flashcards WHERE times_reviewed > 0');
    const reviewedResult = reviewedStmt.step() ? reviewedStmt.getAsObject() : { count: 0 };
    const reviewed = (reviewedResult as any)?.count || 0;
    reviewedStmt.free();
    
    // Needs review count
    const needsReviewStmt = database.prepare(`
      SELECT COUNT(*) as count FROM flashcards f
      LEFT JOIN enemy_reviews er ON f.topic_id = er.topic_id
      WHERE (er.next_review_date IS NULL OR er.next_review_date <= datetime('now'))
      AND (er.is_blocked IS NULL OR er.is_blocked = 0)
    `);
    const needsReviewResult = needsReviewStmt.step() ? needsReviewStmt.getAsObject() : { count: 0 };
    const needsReview = (needsReviewResult as any)?.count || 0;
    needsReviewStmt.free();
    
    // By difficulty
    const difficultyStmt = database.prepare('SELECT difficulty, COUNT(*) as count FROM flashcards GROUP BY difficulty');
    const difficultyResults = [];
    while (difficultyStmt.step()) {
      const row = difficultyStmt.getAsObject();
      difficultyResults.push(row);
    }
    difficultyStmt.free();
    
    const byDifficulty = difficultyResults.reduce((acc, row) => {
      acc[(row as any).difficulty] = (row as any).count;
      return acc;
    }, {} as Record<string, number>);
    
    // By type
    const typeStmt = database.prepare('SELECT type, COUNT(*) as count FROM flashcards GROUP BY type');
    const typeResults = [];
    while (typeStmt.step()) {
      const row = typeStmt.getAsObject();
      typeResults.push(row);
    }
    typeStmt.free();
    
    const byType = typeResults.reduce((acc, row) => {
      acc[(row as any).type] = (row as any).count;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total,
      reviewed,
      needsReview,
      byDifficulty,
      byType
    };
  } catch (error) {
    console.error('Error in getFlashcardStats:', error);
    return {
      total: 0,
      reviewed: 0,
      needsReview: 0,
      byDifficulty: {},
      byType: {}
    };
  }
};