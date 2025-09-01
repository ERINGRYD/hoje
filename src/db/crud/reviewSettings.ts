import { getDBOrThrow, getScheduleSave } from '../singleton';

/**
 * Configurações personalizáveis para o sistema de revisão espaçada
 */

export interface ReviewSettings {
  id: string;
  // Configurações do algoritmo
  maxEaseFactor: number;          // Fator máximo de facilidade
  minEaseFactor: number;          // Fator mínimo de facilidade
  easeFactorModifier: number;     // Modificador do fator de facilidade
  
  // Intervalos iniciais
  initialInterval: number;        // Intervalo inicial em dias
  graduationInterval: number;     // Intervalo após graduação
  easyInterval: number;          // Intervalo para respostas fáceis
  
  // Configurações de repetição
  maxInterval: number;           // Intervalo máximo
  minInterval: number;           // Intervalo mínimo
  intervalMultiplier: number;    // Multiplicador de intervalo
  
  // Configurações de performance
  hardMultiplier: number;        // Multiplicador para respostas difíceis
  easyMultiplier: number;        // Multiplicador para respostas fáceis
  lapseMultiplier: number;       // Multiplicador para lapsos
  
  // Configurações de exame
  examModeEnabled: boolean;      // Se modo exame está ativo
  examUrgencyFactor: number;     // Fator de urgência do exame
  
  // Configurações de sessão
  dailyReviewLimit: number;      // Limite diário de revisões
  newCardsPerDay: number;        // Novos cartões por dia
  
  // Configurações de personalização
  adaptiveLearning: boolean;     // Aprendizado adaptativo
  personalizedIntervals: boolean; // Intervalos personalizados
  forgettingCurveAdjustment: boolean; // Ajuste da curva de esquecimento
  
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SETTINGS: Omit<ReviewSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  maxEaseFactor: 2.5,
  minEaseFactor: 1.3,
  easeFactorModifier: 0.15,
  
  initialInterval: 1,
  graduationInterval: 4,
  easyInterval: 7,
  
  maxInterval: 365,
  minInterval: 1,
  intervalMultiplier: 1.0,
  
  hardMultiplier: 0.8,
  easyMultiplier: 1.3,
  lapseMultiplier: 0.5,
  
  examModeEnabled: false,
  examUrgencyFactor: 0.7,
  
  dailyReviewLimit: 100,
  newCardsPerDay: 20,
  
  adaptiveLearning: true,
  personalizedIntervals: true,
  forgettingCurveAdjustment: true
};

/**
 * Obtém as configurações de revisão do usuário
 */
export const getReviewSettings = (): ReviewSettings => {
  const database = getDBOrThrow();

  try {
    const stmt = database.prepare(`
      SELECT * FROM app_settings 
      WHERE category = 'spaced_repetition' AND setting_key = 'review_settings'
    `);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const settings = JSON.parse(row.setting_value as string);
      stmt.free();
      
      return {
        id: row.id as string,
        ...settings,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string)
      };
    }
    stmt.free();
    
    // Cria configurações padrão se não existirem
    return createDefaultReviewSettings();
    
  } catch (error) {
    console.error('Error getting review settings:', error);
    return createDefaultReviewSettings();
  }
};

/**
 * Atualiza as configurações de revisão
 */
export const updateReviewSettings = (settings: Partial<ReviewSettings>): boolean => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();

  try {
    const current = getReviewSettings();
    const updated = { ...current, ...settings, updatedAt: new Date() };
    
    const stmt = database.prepare(`
      UPDATE app_settings 
      SET setting_value = ?, updated_at = datetime('now')
      WHERE category = 'spaced_repetition' AND setting_key = 'review_settings'
    `);
    
    stmt.run([JSON.stringify(updated)]);
    stmt.free();
    scheduleSave();
    
    return true;
  } catch (error) {
    console.error('Error updating review settings:', error);
    return false;
  }
};

/**
 * Cria configurações padrão
 */
const createDefaultReviewSettings = (): ReviewSettings => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();
  
  const id = `review_settings_${Date.now()}`;
  const now = new Date();
  
  const settings: ReviewSettings = {
    id,
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now
  };

  try {
    const stmt = database.prepare(`
      INSERT INTO app_settings (
        id, setting_key, setting_value, setting_type, category, 
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      'review_settings',
      JSON.stringify(settings),
      'json',
      'spaced_repetition',
      'Configurações do sistema de repetição espaçada',
      now.toISOString(),
      now.toISOString()
    ]);
    stmt.free();
    scheduleSave();
    
  } catch (error) {
    console.error('Error creating default review settings:', error);
  }
  
  return settings;
};

/**
 * Obtém configurações específicas para um tipo de dificuldade
 */
export const getDifficultySettings = (
  difficulty: 'easy' | 'medium' | 'hard'
): Partial<ReviewSettings> => {
  const base = getReviewSettings();
  
  switch (difficulty) {
    case 'easy':
      return {
        ...base,
        initialInterval: Math.ceil(base.initialInterval * base.easyMultiplier),
        intervalMultiplier: base.intervalMultiplier * 1.1
      };
      
    case 'hard':
      return {
        ...base,
        initialInterval: Math.ceil(base.initialInterval * base.hardMultiplier),
        intervalMultiplier: base.intervalMultiplier * 0.9
      };
      
    default:
      return base;
  }
};

/**
 * Configurações otimizadas para modo exame
 */
export const getExamModeSettings = (daysUntilExam: number): Partial<ReviewSettings> => {
  const base = getReviewSettings();
  
  if (!base.examModeEnabled || daysUntilExam <= 0) {
    return base;
  }
  
  // Acelera revisões baseado na proximidade do exame
  const urgencyFactor = Math.max(0.3, Math.min(1, daysUntilExam / 90)) * base.examUrgencyFactor;
  
  return {
    ...base,
    maxInterval: Math.min(base.maxInterval, Math.ceil(daysUntilExam * 0.3)),
    intervalMultiplier: base.intervalMultiplier * urgencyFactor,
    dailyReviewLimit: Math.ceil(base.dailyReviewLimit * (2 - urgencyFactor)),
    newCardsPerDay: Math.ceil(base.newCardsPerDay * (1.5 - urgencyFactor * 0.5))
  };
};

/**
 * Aplica configurações personalizadas baseadas na performance do usuário
 */
export const getPersonalizedSettings = (
  retentionRate: number,
  averageResponseTime: number,
  totalReviews: number
): Partial<ReviewSettings> => {
  const base = getReviewSettings();
  
  if (!base.personalizedIntervals || totalReviews < 10) {
    return base;
  }
  
  // Ajusta baseado na taxa de retenção
  let intervalModifier = 1.0;
  if (retentionRate > 0.9) {
    intervalModifier = 1.2; // Usuário com alta retenção - aumenta intervalos
  } else if (retentionRate < 0.7) {
    intervalModifier = 0.8; // Usuário com baixa retenção - diminui intervalos
  }
  
  // Ajusta baseado no tempo de resposta
  let easeModifier = 1.0;
  if (averageResponseTime < 30) {
    easeModifier = 1.1; // Respostas rápidas - aumenta facilidade
  } else if (averageResponseTime > 120) {
    easeModifier = 0.9; // Respostas lentas - diminui facilidade
  }
  
  return {
    ...base,
    intervalMultiplier: base.intervalMultiplier * intervalModifier,
    easeFactorModifier: base.easeFactorModifier * easeModifier,
    maxEaseFactor: Math.min(3.0, base.maxEaseFactor * easeModifier),
    minEaseFactor: Math.max(1.1, base.minEaseFactor * easeModifier)
  };
};

/**
 * Resetar configurações para o padrão
 */
export const resetReviewSettings = (): boolean => {
  const database = getDBOrThrow();
  const scheduleSave = getScheduleSave();

  try {
    const stmt = database.prepare(`
      DELETE FROM app_settings 
      WHERE category = 'spaced_repetition' AND setting_key = 'review_settings'
    `);
    
    stmt.run();
    stmt.free();
    scheduleSave();
    
    // Recria as configurações padrão
    createDefaultReviewSettings();
    return true;
    
  } catch (error) {
    console.error('Error resetting review settings:', error);
    return false;
  }
};