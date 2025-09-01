import { addDays, differenceInDays, isAfter } from 'date-fns';

/**
 * Algoritmo de Repetição Espaçada Inteligente (SM-2 Melhorado)
 * Baseado no SuperMemo SM-2 com melhorias personalizadas
 */

export interface ReviewCard {
  id: string;
  topicId: string;
  easeFactor: number;          // Fator de facilidade (1.3 - 2.5+)
  interval: number;            // Intervalo atual em dias
  repetition: number;          // Número de repetições
  nextReviewDate: Date;        // Próxima data de revisão
  lastReviewDate?: Date;       // Última revisão
  quality?: number;            // Qualidade da última resposta (0-5)
  averageQuality: number;      // Média histórica de qualidade
  totalReviews: number;        // Total de revisões realizadas
  streakCount: number;         // Sequência de acertos
  failureCount: number;        // Contador de falhas consecutivas
  isBlocked: boolean;          // Se está bloqueado até próxima revisão
  personalizedMultiplier: number; // Multiplicador personalizado
  examDate?: Date;             // Data do exame para ajustar urgência
}

export interface ReviewResult {
  quality: number;             // Qualidade da resposta (0-5)
  responseTime: number;        // Tempo de resposta em segundos
  confidenceLevel: 'certeza' | 'duvida' | 'chute';
  wasCorrect: boolean;
}

export interface UserProfile {
  averageRetentionRate: number; // Taxa média de retenção
  preferredDifficulty: number;  // Dificuldade preferida
  averageResponseTime: number;  // Tempo médio de resposta
  learningVelocity: number;     // Velocidade de aprendizado
  forgettingCurve: number;      // Curva personalizada de esquecimento
  totalReviewsSessions: number; // Total de sessões de revisão
}

/**
 * Calcula a próxima data de revisão usando SM-2 melhorado
 */
export const calculateNextReview = (
  card: ReviewCard, 
  result: ReviewResult, 
  userProfile: UserProfile
): Partial<ReviewCard> => {
  const { quality, responseTime, confidenceLevel, wasCorrect } = result;
  
  // Ajusta qualidade baseado em confiança
  let adjustedQuality = quality;
  if (confidenceLevel === 'chute' && wasCorrect) {
    adjustedQuality = Math.min(quality, 3); // Limita qualidade em chutes
  }
  
  // Calcula novo fator de facilidade
  const oldEaseFactor = card.easeFactor;
  let newEaseFactor = oldEaseFactor + (0.1 - (5 - adjustedQuality) * (0.08 + (5 - adjustedQuality) * 0.02));
  
  // Limita o fator de facilidade
  newEaseFactor = Math.max(1.3, Math.min(newEaseFactor, 2.5));
  
  // Personalização baseada no perfil do usuário
  const personalizedFactor = 1 + (userProfile.learningVelocity - 0.5) * 0.2;
  newEaseFactor *= personalizedFactor;
  
  let newInterval: number;
  let newRepetition = card.repetition;
  
  if (adjustedQuality < 3) {
    // Resposta incorreta - reinicia o ciclo
    newInterval = 1;
    newRepetition = 0;
    
    // Penalidade por falhas consecutivas
    if (card.failureCount >= 2) {
      newInterval = Math.max(1, Math.floor(card.interval * 0.3));
    }
  } else {
    // Resposta correta
    newRepetition = card.repetition + 1;
    
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      // Aplica o fator de facilidade
      newInterval = Math.ceil(card.interval * newEaseFactor);
      
      // Ajustes baseados na performance
      if (adjustedQuality >= 4) {
        // Resposta muito boa - pode aumentar intervalo
        const bonusMultiplier = 1 + ((adjustedQuality - 4) * 0.1);
        newInterval = Math.ceil(newInterval * bonusMultiplier);
      }
      
      // Ajuste baseado no tempo de resposta
      if (responseTime < userProfile.averageResponseTime * 0.7) {
        // Resposta rápida - aumenta intervalo
        newInterval = Math.ceil(newInterval * 1.1);
      } else if (responseTime > userProfile.averageResponseTime * 1.5) {
        // Resposta lenta - diminui intervalo
        newInterval = Math.ceil(newInterval * 0.9);
      }
    }
  }
  
  // Personalização baseada na curva de esquecimento do usuário
  const forgettingCurveAdjustment = 1 + (userProfile.forgettingCurve - 0.5) * 0.3;
  newInterval = Math.ceil(newInterval * forgettingCurveAdjustment);
  
  // Ajusta baseado na proximidade do exame
  if (card.examDate) {
    const daysUntilExam = differenceInDays(card.examDate, new Date());
    if (daysUntilExam > 0) {
      // Acelera revisões próximo ao exame
      const examUrgency = Math.max(0.5, Math.min(1, daysUntilExam / 60));
      newInterval = Math.ceil(newInterval * examUrgency);
      
      // Nunca agenda depois do exame
      const nextReviewDate = addDays(new Date(), newInterval);
      if (isAfter(nextReviewDate, card.examDate)) {
        newInterval = Math.max(1, differenceInDays(card.examDate, new Date()) - 1);
      }
    }
  }
  
  // Limita intervalos muito longos ou curtos
  newInterval = Math.max(1, Math.min(newInterval, 365));
  
  const nextReviewDate = addDays(new Date(), newInterval);
  const newAverageQuality = (card.averageQuality * card.totalReviews + adjustedQuality) / (card.totalReviews + 1);
  
  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetition: newRepetition,
    nextReviewDate,
    lastReviewDate: new Date(),
    quality: adjustedQuality,
    averageQuality: newAverageQuality,
    totalReviews: card.totalReviews + 1,
    streakCount: wasCorrect ? card.streakCount + 1 : 0,
    failureCount: wasCorrect ? 0 : card.failureCount + 1,
    isBlocked: true // Bloqueia até próxima data
  };
};

/**
 * Cria um novo cartão de revisão
 */
export const createReviewCard = (
  id: string, 
  topicId: string, 
  examDate?: Date
): ReviewCard => {
  return {
    id,
    topicId,
    easeFactor: 2.5,
    interval: 1,
    repetition: 0,
    nextReviewDate: addDays(new Date(), 1),
    averageQuality: 0,
    totalReviews: 0,
    streakCount: 0,
    failureCount: 0,
    isBlocked: true,
    personalizedMultiplier: 1.0,
    examDate
  };
};

/**
 * Atualiza o perfil do usuário baseado na performance
 */
export const updateUserProfile = (
  profile: UserProfile, 
  reviews: ReviewCard[]
): UserProfile => {
  if (reviews.length === 0) return profile;
  
  const totalReviews = reviews.reduce((sum, card) => sum + card.totalReviews, 0);
  const totalQuality = reviews.reduce((sum, card) => sum + (card.averageQuality * card.totalReviews), 0);
  
  const newRetentionRate = totalReviews > 0 ? totalQuality / totalReviews / 5 : profile.averageRetentionRate;
  
  // Calcula velocidade de aprendizado baseada em streaks
  const averageStreak = reviews.reduce((sum, card) => sum + card.streakCount, 0) / reviews.length;
  const learningVelocity = Math.min(1, Math.max(0, averageStreak / 10));
  
  // Atualiza curva de esquecimento baseada nas falhas
  const failureRate = reviews.reduce((sum, card) => sum + card.failureCount, 0) / reviews.length;
  const forgettingCurve = Math.max(0.2, Math.min(0.8, 0.5 - failureRate * 0.1));
  
  return {
    ...profile,
    averageRetentionRate: (profile.averageRetentionRate + newRetentionRate) / 2,
    learningVelocity: (profile.learningVelocity + learningVelocity) / 2,
    forgettingCurve: (profile.forgettingCurve + forgettingCurve) / 2,
    totalReviewsSessions: profile.totalReviewsSessions + 1
  };
};

/**
 * Determina quais cartões estão prontos para revisão
 */
export const getCardsReadyForReview = (
  cards: ReviewCard[], 
  maxCards: number = 20
): ReviewCard[] => {
  const now = new Date();
  
  // Filtra cartões prontos para revisão
  const readyCards = cards.filter(card => 
    card.isBlocked && card.nextReviewDate <= now
  );
  
  // Ordena por prioridade (falhas recentes, próximo ao exame, etc.)
  return readyCards
    .sort((a, b) => {
      // Prioriza cartões com mais falhas
      if (a.failureCount !== b.failureCount) {
        return b.failureCount - a.failureCount;
      }
      
      // Depois por proximidade do exame
      if (a.examDate && b.examDate) {
        const aDaysToExam = differenceInDays(a.examDate, now);
        const bDaysToExam = differenceInDays(b.examDate, now);
        if (aDaysToExam !== bDaysToExam) {
          return aDaysToExam - bDaysToExam;
        }
      }
      
      // Por último, por data de revisão mais antiga
      return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
    })
    .slice(0, maxCards);
};

/**
 * Calcula estatísticas de revisão para dashboard
 */
export const calculateReviewStats = (cards: ReviewCard[]) => {
  const now = new Date();
  const ready = cards.filter(card => card.isBlocked && card.nextReviewDate <= now);
  const overdue = ready.filter(card => card.nextReviewDate < now);
  
  const averageEase = cards.reduce((sum, card) => sum + card.easeFactor, 0) / cards.length || 2.5;
  const averageInterval = cards.reduce((sum, card) => sum + card.interval, 0) / cards.length || 1;
  
  const retention = cards.filter(card => card.totalReviews > 0)
    .reduce((sum, card) => sum + card.averageQuality, 0) / 
    Math.max(1, cards.filter(card => card.totalReviews > 0).length) / 5;
  
  return {
    totalCards: cards.length,
    readyForReview: ready.length,
    overdueCards: overdue.length,
    averageEaseFactor: averageEase,
    averageInterval: averageInterval,
    retentionRate: retention,
    cardsLearning: cards.filter(card => card.repetition < 3).length,
    cardsMature: cards.filter(card => card.repetition >= 3).length
  };
};