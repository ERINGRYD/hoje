/**
 * React hooks for Dexie-based Hero Task Database
 * Provides reactive, strongly-typed access to the database using liveQuery
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from '@/components/ui/use-toast';
import { heroTaskDB } from './database';
import {
  HeroProfile,
  CreateHeroProfile,
  UpdateHeroProfile,
  Journey,
  CreateJourney,
  UpdateJourney,
  Task,
  CreateTask,
  UpdateTask,
  Habit,
  CreateHabit,
  UpdateHabit,
  HeroAttribute,
  CreateHeroAttribute,
  UpdateHeroAttribute,
  AttributeHistory,
  CreateAttributeHistory,
  AttributeGoal,
  CreateAttributeGoal,
  UpdateAttributeGoal,
  TaskFilters,
  HabitFilters,
  JourneyFilters
} from './types';

// Helper function to generate unique IDs
const generateId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

// Helper function to set timestamps
const withTimestamps = <T extends Record<string, any>>(
  data: T,
  isUpdate: boolean = false
): T => {
  const now = new Date().toISOString();
  return {
    ...data,
    ...(isUpdate ? {} : { createdAt: data.createdAt || now }),
    updatedAt: now
  };
};

/**
 * Hook for managing hero profile
 */
export const useHeroProfile = () => {
  // Get current profile (should only be one)
  const profile = useLiveQuery(async () => {
    const profiles = await heroTaskDB.heroProfile.orderBy('createdAt').reverse().limit(1).toArray();
    return profiles[0] || null;
  });

  const createProfile = async (data: CreateHeroProfile): Promise<number> => {
    try {
      const profileData = withTimestamps(data) as Omit<HeroProfile, 'id'>;
      const id = await heroTaskDB.heroProfile.add(profileData);
      
      toast({
        title: 'Perfil criado',
        description: `Bem-vindo, ${data.heroName}!`
      });
      
      return id;
    } catch (error) {
      console.error('Error creating hero profile:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar perfil.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateProfile = async (id: number, updates: UpdateHeroProfile): Promise<void> => {
    try {
      const updateData = withTimestamps(updates, true);
      await heroTaskDB.heroProfile.update(id, updateData);
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas.'
      });
    } catch (error) {
      console.error('Error updating hero profile:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar perfil.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    profile,
    createProfile,
    updateProfile,
    isLoading: profile === undefined
  };
};

/**
 * Hook for managing journeys
 */
export const useJourneys = (filters?: JourneyFilters) => {
  const journeys = useLiveQuery(async () => {
    let query = heroTaskDB.journeys.orderBy('createdAt').reverse();
    
    if (filters?.status) {
      query = heroTaskDB.journeys.where('status').equals(filters.status);
    }
    
    const results = await query.toArray();
    
    // Apply additional filters in memory if needed
    return results.filter(journey => {
      if (filters?.isActive !== undefined && journey.isActive !== filters.isActive) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const createJourney = async (data: CreateJourney): Promise<number> => {
    try {
      const journeyData = withTimestamps({
        ...data,
        stages: data.stages || []
      }) as Omit<Journey, 'id'>;
      
      const id = await heroTaskDB.journeys.add(journeyData);
      
      toast({
        title: 'Jornada criada',
        description: `"${data.title}" foi criada com sucesso!`
      });
      
      return id;
    } catch (error) {
      console.error('Error creating journey:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar jornada.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateJourney = async (id: number, updates: UpdateJourney): Promise<void> => {
    try {
      const updateData = withTimestamps(updates, true);
      await heroTaskDB.journeys.update(id, updateData);
      
      toast({
        title: 'Jornada atualizada',
        description: 'As alterações foram salvas.'
      });
    } catch (error) {
      console.error('Error updating journey:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar jornada.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteJourney = async (id: number): Promise<void> => {
    try {
      // Check for associated tasks and habits
      const [associatedTasks, associatedHabits] = await Promise.all([
        heroTaskDB.tasks.where('journeyId').equals(id.toString()).count(),
        heroTaskDB.habits.where('journeyId').equals(id.toString()).count()
      ]);

      if (associatedTasks > 0 || associatedHabits > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta jornada possui tarefas ou hábitos associados.',
          variant: 'destructive'
        });
        return;
      }

      await heroTaskDB.journeys.delete(id);
      
      toast({
        title: 'Jornada excluída',
        description: 'A jornada foi removida com sucesso.'
      });
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir jornada.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const setActiveJourney = async (id: number): Promise<void> => {
    try {
      await heroTaskDB.transaction('rw', heroTaskDB.journeys, async () => {
        // Deactivate all journeys
        await heroTaskDB.journeys.toCollection().modify({ isActive: false });
        // Activate selected journey
        await heroTaskDB.journeys.update(id, { isActive: true });
      });
      
      toast({
        title: 'Jornada ativada',
        description: 'Esta é agora sua jornada ativa.'
      });
    } catch (error) {
      console.error('Error setting active journey:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao ativar jornada.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    journeys,
    createJourney,
    updateJourney,
    deleteJourney,
    setActiveJourney,
    isLoading: journeys === undefined
  };
};

/**
 * Hook for managing tasks
 */
export const useTasks = (filters?: TaskFilters) => {
  const tasks = useLiveQuery(async () => {
    let query = heroTaskDB.tasks.orderBy('createdAt').reverse();
    
    // Use indexed queries when possible
    if (filters?.stageId) {
      query = heroTaskDB.tasks.where('stageId').equals(filters.stageId);
    } else if (filters?.journeyId) {
      query = heroTaskDB.tasks.where('journeyId').equals(filters.journeyId);
    } else if (filters?.completed !== undefined) {
      query = heroTaskDB.tasks.where('completed').equals(filters.completed ? 1 : 0);
    }
    
    const results = await query.toArray();
    
    // Apply additional filters in memory
    return results.filter(task => {
      if (filters?.priority !== undefined && task.priority !== filters.priority) {
        return false;
      }
      if (filters?.dueDateBefore && task.dueDate && task.dueDate > filters.dueDateBefore) {
        return false;
      }
      if (filters?.dueDateAfter && task.dueDate && task.dueDate < filters.dueDateAfter) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const createTask = async (data: CreateTask): Promise<number> => {
    try {
      const taskData = withTimestamps(data) as Omit<Task, 'id'>;
      const id = await heroTaskDB.tasks.add(taskData);
      
      toast({
        title: 'Tarefa criada',
        description: `"${data.title}" foi adicionada.`
      });
      
      return id;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar tarefa.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateTask = async (id: number, updates: UpdateTask): Promise<void> => {
    try {
      const updateData = withTimestamps(updates, true);
      
      // Set completedAt when marking as completed
      if (updates.completed === true && !updates.completedAt) {
        updateData.completedAt = new Date().toISOString();
      } else if (updates.completed === false) {
        updateData.completedAt = undefined;
      }
      
      await heroTaskDB.tasks.update(id, updateData);
      
      if (updates.completed === true) {
        toast({
          title: 'Tarefa concluída!',
          description: 'Parabéns pelo progresso!'
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar tarefa.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteTask = async (id: number): Promise<void> => {
    try {
      await heroTaskDB.tasks.delete(id);
      
      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi removida.'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir tarefa.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    isLoading: tasks === undefined
  };
};

/**
 * Hook for managing habits
 */
export const useHabits = (filters?: HabitFilters) => {
  const habits = useLiveQuery(async () => {
    let query = heroTaskDB.habits.orderBy('createdAt').reverse();
    
    // Use indexed queries when possible
    if (filters?.stageId) {
      query = heroTaskDB.habits.where('stageId').equals(filters.stageId);
    } else if (filters?.journeyId) {
      query = heroTaskDB.habits.where('journeyId').equals(filters.journeyId);
    } else if (filters?.isActive !== undefined) {
      query = heroTaskDB.habits.where('isActive').equals(filters.isActive ? 1 : 0);
    }
    
    const results = await query.toArray();
    
    // Apply additional filters in memory
    return results.filter(habit => {
      if (filters?.frequency && habit.frequency !== filters.frequency) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const createHabit = async (data: CreateHabit): Promise<string> => {
    try {
      const id = data.id || generateId('habit');
      const habitData = withTimestamps({ ...data, id }) as Habit;
      
      await heroTaskDB.habits.add(habitData);
      
      toast({
        title: 'Hábito criado',
        description: `"${data.title}" foi adicionado.`
      });
      
      return id;
    } catch (error) {
      console.error('Error creating habit:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar hábito.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateHabit = async (id: string, updates: UpdateHabit): Promise<void> => {
    try {
      const updateData = withTimestamps(updates, true);
      await heroTaskDB.habits.update(id, updateData);
      
      toast({
        title: 'Hábito atualizado',
        description: 'As alterações foram salvas.'
      });
    } catch (error) {
      console.error('Error updating habit:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar hábito.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteHabit = async (id: string): Promise<void> => {
    try {
      await heroTaskDB.habits.delete(id);
      
      toast({
        title: 'Hábito excluído',
        description: 'O hábito foi removido.'
      });
    } catch (error) {
      console.error('Error deleting habit:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir hábito.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const completeHabit = async (id: string): Promise<void> => {
    try {
      const habit = await heroTaskDB.habits.get(id);
      if (!habit) throw new Error('Habit not found');

      const now = new Date().toISOString();
      const newStreak = (habit.streak || 0) + 1;

      await heroTaskDB.habits.update(id, {
        lastCompletedAt: now,
        streak: newStreak,
        updatedAt: now
      });

      toast({
        title: 'Hábito concluído!',
        description: `Sequência: ${newStreak} dias`
      });
    } catch (error) {
      console.error('Error completing habit:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao marcar hábito como concluído.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    habits,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
    isLoading: habits === undefined
  };
};

/**
 * Hook for managing hero attributes
 */
export const useAttributeSystem = () => {
  const attributes = useLiveQuery(() => 
    heroTaskDB.heroAttributes.orderBy('area').toArray()
  );

  const attributeHistory = useLiveQuery(() =>
    heroTaskDB.attributeHistory.orderBy('createdAt').reverse().limit(50).toArray()
  );

  const attributeGoals = useLiveQuery(() =>
    heroTaskDB.attributeGoals.where('isActive').equals(1).toArray()
  );

  const createAttribute = async (data: CreateHeroAttribute): Promise<string> => {
    try {
      const attributeData = withTimestamps(data) as HeroAttribute;
      await heroTaskDB.heroAttributes.add(attributeData);
      
      toast({
        title: 'Atributo criado',
        description: `${data.name} foi adicionado ao seu perfil.`
      });
      
      return data.id;
    } catch (error) {
      console.error('Error creating attribute:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar atributo.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateAttribute = async (id: string, updates: UpdateHeroAttribute): Promise<void> => {
    try {
      const updateData = withTimestamps(updates, true);
      await heroTaskDB.heroAttributes.update(id, updateData);
    } catch (error) {
      console.error('Error updating attribute:', error);
      throw error;
    }
  };

  const addAttributeXp = async (attributeId: string, xpGained: number, source?: string): Promise<void> => {
    try {
      await heroTaskDB.transaction('rw', [heroTaskDB.heroAttributes, heroTaskDB.attributeHistory], async () => {
        // Update attribute XP
        const attribute = await heroTaskDB.heroAttributes.get(attributeId);
        if (!attribute) throw new Error('Attribute not found');

        const newXp = attribute.xp + xpGained;
        const newLevel = Math.floor(newXp / 100) + 1; // Simple leveling: 100 XP per level

        await heroTaskDB.heroAttributes.update(attributeId, {
          xp: newXp,
          level: newLevel,
          updatedAt: new Date().toISOString()
        });

        // Add history record
        const historyId = generateId('history');
        await heroTaskDB.attributeHistory.add({
          id: historyId,
          attributeId,
          xpGained,
          source,
          createdAt: new Date().toISOString()
        });

        if (newLevel > attribute.level) {
          toast({
            title: 'Level Up!',
            description: `${attribute.name} subiu para o nível ${newLevel}!`
          });
        }
      });
    } catch (error) {
      console.error('Error adding attribute XP:', error);
      throw error;
    }
  };

  const createAttributeGoal = async (data: CreateAttributeGoal): Promise<string> => {
    try {
      const id = data.id || generateId('goal');
      const goalData = withTimestamps({ ...data, id }) as AttributeGoal;
      
      await heroTaskDB.attributeGoals.add(goalData);
      
      toast({
        title: 'Meta criada',
        description: `Nova meta para ${data.title}.`
      });
      
      return id;
    } catch (error) {
      console.error('Error creating attribute goal:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar meta.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    attributes,
    attributeHistory,
    attributeGoals,
    createAttribute,
    updateAttribute,
    addAttributeXp,
    createAttributeGoal,
    isLoading: attributes === undefined
  };
};