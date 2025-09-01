import { getDBOrThrow, getScheduleSave } from '../singleton';
import type { Room } from '@/types/battle';
import { addDays, isAfter, startOfDay } from 'date-fns';
import { 
  calculateNextReview, 
  createReviewCard, 
  updateUserProfile, 
  getCardsReadyForReview,
  calculateReviewStats,
  type ReviewCard, 
  type ReviewResult, 
  type UserProfile 
} from '@/utils/spacedRepetition';
import { getReviewSettings, getDifficultySettings, getExamModeSettings, getPersonalizedSettings } from './reviewSettings';

export interface EnemyReviewData {
  topicId: string;
  currentReviewCycle: number;
  nextReviewDate: Date;
  lastReviewDate?: Date;
  isBlocked: boolean;
  totalReviews: number;
  examDate?: Date;
  // Novos campos do sistema inteligente
  easeFactor: number;
  averageQuality: number;
  streakCount: number;
  failureCount: number;
  personalizedMultiplier: number;
  reviewHistory: ReviewHistoryEntry[];
}

export interface ReviewHistoryEntry {
  date: Date;
  quality: number;
  responseTime: number;
  wasCorrect: boolean;
  confidenceLevel: string;
}

/**
 * Calculate next review date using intelligent spaced repetition
 */
export const calculateNextReviewDate = (
  room: Room, 
  currentCycle: number, 
  examDate?: Date,
  quality?: number,
  responseTime?: number,
  confidenceLevel?: string
): Date => {
  // Fallback para compatibilidade com sistema antigo
  if (quality === undefined) {
    const reviewIntervals = [1, 3, 7, 15, 30];
    let daysToAdd = reviewIntervals[currentCycle] || 30;
    
    if (currentCycle === 0) {
      if (room === 'vermelha') {
        daysToAdd = 1;
      } else if (room === 'amarela') {
        daysToAdd = 3;
      } else if (room === 'verde') {
        daysToAdd = 7;
      }
    }
    
    const nextDate = addDays(new Date(), daysToAdd);
    
    if (examDate && isAfter(nextDate, examDate)) {
      return examDate;
    }
    
    return nextDate;
  }

  // Sistema inteligente - converte room para qualidade
  let adjustedQuality = quality;
  if (room === 'vermelha' && quality > 2) adjustedQuality = 2;
  if (room === 'amarela' && quality > 3) adjustedQuality = 3;
  
  // Obtém configurações personalizadas
  const settings = getReviewSettings();
  const examSettings = examDate ? getExamModeSettings(Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : settings;
  
  // Cria resultado de revisão
  const result: ReviewResult = {
    quality: adjustedQuality,
    responseTime: responseTime || 60,
    confidenceLevel: (confidenceLevel as any) || 'certeza',
    wasCorrect: quality >= 3
  };
  
  // Obtém perfil do usuário (simplificado para compatibilidade)
  const userProfile = getUserProfile();
  
  // Cria card temporário para cálculo
  const tempCard: ReviewCard = {
    id: `temp_${Date.now()}`,
    topicId: 'temp',
    easeFactor: 2.5,
    interval: Math.max(1, currentCycle),
    repetition: currentCycle,
    nextReviewDate: new Date(),
    averageQuality: quality,
    totalReviews: currentCycle,
    streakCount: quality >= 3 ? currentCycle : 0,
    failureCount: quality < 3 ? 1 : 0,
    isBlocked: true,
    personalizedMultiplier: 1.0,
    examDate
  };
  
  // Calcula próxima revisão usando algoritmo inteligente
  const updated = calculateNextReview(tempCard, result, userProfile);
  
  return updated.nextReviewDate || addDays(new Date(), 1);
};

/**
 * Obtém ou cria perfil do usuário para algoritmo inteligente
 */
export const getUserProfile = (): UserProfile => {
  // Implementação simplificada - pode ser expandida com dados reais do banco
  return {
    averageRetentionRate: 0.75,
    preferredDifficulty: 0.6,
    averageResponseTime: 45,
    learningVelocity: 0.7,
    forgettingCurve: 0.5,
    totalReviewsSessions: 10
  };
};

/**
 * Create or update enemy review schedule
 */
export const createOrUpdateEnemyReview = (
  topicId: string, 
  room: Room, 
  examDate?: Date
): void => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();

  try {
    // Check if review already exists
    const existingStmt = database.prepare(`
      SELECT * FROM enemy_reviews WHERE topic_id = ?
    `);
    existingStmt.bind([topicId]);
    
    if (existingStmt.step()) {
      // Update existing review
      const existing = existingStmt.getAsObject();
      const nextReviewDate = calculateNextReviewDate(
        room, 
        existing.current_review_cycle as number, 
        examDate
      );
      
      const updateStmt = database.prepare(`
        UPDATE enemy_reviews 
        SET 
          next_review_date = ?,
          exam_date = ?,
          updated_at = datetime('now')
        WHERE topic_id = ?
      `);
      updateStmt.run([nextReviewDate.toISOString(), examDate?.toISOString() || null, topicId]);
      updateStmt.free();
    } else {
      // Create new review
      const nextReviewDate = calculateNextReviewDate(room, 0, examDate);
      const reviewId = `review_${topicId}_${Date.now()}`;
      
      const insertStmt = database.prepare(`
        INSERT INTO enemy_reviews (
          id, topic_id, current_review_cycle, next_review_date, 
          is_blocked, total_reviews, exam_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run([
        reviewId,
        topicId,
        0, // Starting cycle
        nextReviewDate.toISOString(),
        true, // Initially blocked
        0, // No reviews yet
        examDate?.toISOString() || null
      ]);
      insertStmt.free();
      
      // Create study session for red room (today)
      if (room === 'vermelha') {
        createStudySessionForToday(topicId);
      }
    }
    
    existingStmt.free();
    scheduleSave();
  } catch (error) {
    console.error('Error creating/updating enemy review:', error);
  }
};

/**
 * Complete a review and advance to next cycle (Enhanced with intelligent algorithm)
 */
export const completeEnemyReview = (
  topicId: string, 
  examDate?: Date, 
  quality?: number,
  responseTime?: number,
  confidenceLevel?: string
): Room | null => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();

  try {
    const stmt = database.prepare(`
      SELECT er.*, t.name as topic_name, s.name as subject_name
      FROM enemy_reviews er
      JOIN study_topics t ON er.topic_id = t.id
      JOIN study_subjects s ON t.subject_id = s.id
      WHERE er.topic_id = ?
    `);
    stmt.bind([topicId]);
    
    if (stmt.step()) {
      const review = stmt.getAsObject();
      const currentCycle = review.current_review_cycle as number;
      const newCycle = Math.min(currentCycle + 1, 5); // Max 5 cycles (30 days)
      
      // Calculate room based on current performance
      const roomStmt = database.prepare(`
        SELECT 
          COUNT(qa.id) as questions_answered,
          SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as questions_correct
        FROM questions q
        LEFT JOIN question_attempts qa ON qa.question_id = q.id
        WHERE q.topic_id = ? AND qa.id IS NOT NULL
      `);
      roomStmt.bind([topicId]);
      
      let newRoom: Room = 'triagem';
      if (roomStmt.step()) {
        const roomData = roomStmt.getAsObject();
        const questionsAnswered = roomData.questions_answered as number;
        const questionsCorrect = roomData.questions_correct as number;
        const accuracyRate = questionsAnswered > 0 ? (questionsCorrect / questionsAnswered) * 100 : 0;
        
        if (questionsAnswered === 0) {
          newRoom = 'triagem';
        } else if (accuracyRate < 70) {
          newRoom = 'vermelha';
        } else if (accuracyRate < 85) {
          newRoom = 'amarela';
        } else {
          newRoom = 'verde';
        }
      }
      roomStmt.free();
      
      const nextReviewDate = calculateNextReviewDate(
        newRoom, 
        newCycle, 
        examDate, 
        quality, 
        responseTime, 
        confidenceLevel
      );
      
      // Calcula novos parâmetros inteligentes
      let newEaseFactor = 2.5;
      let newAverageQuality = quality || 3;
      let newStreakCount = 0;
      let newFailureCount = 0;
      
      if (quality !== undefined) {
        const wasCorrect = quality >= 3;
        newStreakCount = wasCorrect ? (review.streak_count as number || 0) + 1 : 0;
        newFailureCount = wasCorrect ? 0 : (review.failure_count as number || 0) + 1;
        
        // Atualiza fator de facilidade
        const currentEase = review.ease_factor as number || 2.5;
        newEaseFactor = Math.max(1.3, Math.min(2.5, 
          currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ));
        
        // Atualiza qualidade média
        const currentAvg = review.average_quality as number || 0;
        const totalReviews = review.total_reviews as number || 0;
        newAverageQuality = (currentAvg * totalReviews + quality) / (totalReviews + 1);
      }
      
      // Update review with enhanced data
      const updateStmt = database.prepare(`
        UPDATE enemy_reviews 
        SET 
          current_review_cycle = ?,
          next_review_date = ?,
          last_review_date = datetime('now'),
          is_blocked = ?,
          total_reviews = total_reviews + 1,
          ease_factor = ?,
          average_quality = ?,
          streak_count = ?,
          failure_count = ?,
          updated_at = datetime('now')
        WHERE topic_id = ?
      `);
      
      updateStmt.run([
        newCycle,
        nextReviewDate.toISOString(),
        true, // Block again until next review
        newEaseFactor,
        newAverageQuality,
        newStreakCount,
        newFailureCount,
        topicId
      ]);
      updateStmt.free();
      
      stmt.free();
      scheduleSave();
      return newRoom;
    }
    
    stmt.free();
    return null;
  } catch (error) {
    console.error('Error completing enemy review:', error);
    return null;
  }
};

/**
 * Check and unlock enemies that are ready for review
 */
export const checkAndUnlockEnemies = (): string[] => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();
  const today = startOfDay(new Date()).toISOString();
  
  try {
    // Find enemies ready for unlock
    const selectStmt = database.prepare(`
      SELECT topic_id FROM enemy_reviews 
      WHERE is_blocked = 1 AND next_review_date <= ?
    `);
    selectStmt.bind([today]);
    
    const unlockedTopics: string[] = [];
    while (selectStmt.step()) {
      const row = selectStmt.getAsObject();
      unlockedTopics.push(row.topic_id as string);
    }
    selectStmt.free();
    
    if (unlockedTopics.length > 0) {
      // Unlock them
      const updateStmt = database.prepare(`
        UPDATE enemy_reviews 
        SET is_blocked = 0, updated_at = datetime('now')
        WHERE topic_id = ?
      `);
      
      unlockedTopics.forEach(topicId => {
        updateStmt.run([topicId]);
      });
      updateStmt.free();
      
      scheduleSave();
      console.log(`Unlocked ${unlockedTopics.length} enemies for review`);
    }
    
    return unlockedTopics;
  } catch (error) {
    console.error('Error checking/unlocking enemies:', error);
    return [];
  }
};

/**
 * Get enemy review data
 */
export const getEnemyReviewData = (topicId: string): EnemyReviewData | null => {
  const database = getDBOrThrow();

  try {
    const stmt = database.prepare(`
      SELECT * FROM enemy_reviews WHERE topic_id = ?
    `);
    stmt.bind([topicId]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const data: EnemyReviewData = {
        topicId: row.topic_id as string,
        currentReviewCycle: row.current_review_cycle as number,
        nextReviewDate: new Date(row.next_review_date as string),
        lastReviewDate: row.last_review_date ? new Date(row.last_review_date as string) : undefined,
        isBlocked: Boolean(row.is_blocked),
        totalReviews: row.total_reviews as number,
        examDate: row.exam_date ? new Date(row.exam_date as string) : undefined,
        // Novos campos do sistema inteligente
        easeFactor: (row.ease_factor as number) || 2.5,
        averageQuality: (row.average_quality as number) || 0,
        streakCount: (row.streak_count as number) || 0,
        failureCount: (row.failure_count as number) || 0,
        personalizedMultiplier: (row.personalized_multiplier as number) || 1.0,
        reviewHistory: [] // Por enquanto vazio, pode ser expandido
      };
      
      stmt.free();
      return data;
    }
    
    stmt.free();
    return null;
  } catch (error) {
    console.error('Error getting enemy review data:', error);
    return null;
  }
};

/**
 * Create a study session for today (for red room enemies)
 */
const createStudySessionForToday = (topicId: string): void => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();
  
  try {
    // Get topic and subject info
    const topicStmt = database.prepare(`
      SELECT t.name as topic_name, s.name as subject_name
      FROM study_topics t
      JOIN study_subjects s ON t.subject_id = s.id
      WHERE t.id = ?
    `);
    topicStmt.bind([topicId]);
    
    if (topicStmt.step()) {
      const topicData = topicStmt.getAsObject();
      const sessionId = `session_${topicId}_${Date.now()}`;
      const now = new Date().toISOString();
      
      const insertStmt = database.prepare(`
        INSERT INTO study_sessions (
          id, subject, topic, start_time, duration, 
          completed, notes, performance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run([
        sessionId,
        topicData.subject_name as string,
        topicData.topic_name as string,
        now,
        30, // 30 minutes suggested
        false,
        'Sessão de revisão agendada - Inimigo crítico',
        'medium'
      ]);
      insertStmt.free();
      
      console.log(`Created study session for critical enemy: ${topicData.topic_name}`);
    }
    
    topicStmt.free();
    scheduleSave();
  } catch (error) {
    console.error('Error creating study session:', error);
  }
};

/**
 * Recalculate all review dates when exam date changes
 */
export const recalculateAllReviewDates = (newExamDate?: Date): void => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();

  try {
    const stmt = database.prepare(`
      SELECT er.*, q.room
      FROM enemy_reviews er
      JOIN questions q ON q.topic_id = er.topic_id
      GROUP BY er.topic_id
    `);
    
    const updateStmt = database.prepare(`
      UPDATE enemy_reviews 
      SET next_review_date = ?, exam_date = ?, updated_at = datetime('now')
      WHERE topic_id = ?
    `);
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const nextReviewDate = calculateNextReviewDate(
        row.room as Room,
        row.current_review_cycle as number,
        newExamDate
      );
      
      updateStmt.run([
        nextReviewDate.toISOString(),
        newExamDate?.toISOString() || null,
        row.topic_id as string
      ]);
    }
    
    stmt.free();
    updateStmt.free();
    scheduleSave();
    
    console.log('Recalculated all review dates for new exam date');
  } catch (error) {
    console.error('Error recalculating review dates:', error);
  }
};