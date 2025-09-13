
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudySubject, StudySession, StudyPlan, ExamType } from '@/types/study';
import { loadActiveStudyPlan, saveActiveStudyPlan } from '@/utils/sqlitePersistence';
import { migrateFromLocalStorage } from '@/db/migration';
import { useDB } from '@/contexts/DBProvider';
import { loadStudySessions, saveStudySession } from '@/db/db';

interface StudyContextType {
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  subjects: StudySubject[];
  setSubjects: React.Dispatch<React.SetStateAction<StudySubject[]>>;
  studyPlan: StudyPlan | null;
  setStudyPlan: React.Dispatch<React.SetStateAction<StudyPlan | null>>;
  examDate?: Date;
  setExamDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  selectedExam: string;
  setSelectedExam: React.Dispatch<React.SetStateAction<string>>;
  examTypes: ExamType[];
  isDBLoading: boolean;
  dbError: string | null;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const useStudyContext = () => {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
};

interface StudyProviderProps {
  children: ReactNode;
}

export const StudyProvider: React.FC<StudyProviderProps> = ({ children }) => {
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [examDate, setExamDate] = useState<Date | undefined>();
  const [selectedExam, setSelectedExam] = useState('');

  // Use the global database context with error handling
  const dbContext = useDB();
  if (!dbContext) {
    throw new Error('StudyProvider must be wrapped by DBProvider');
  }
  
  const { db, isLoading: isDBLoading, error: dbError } = dbContext;
  const isInitialized = !!db && !isDBLoading;

  // Initialize app data after database is ready
  useEffect(() => {
    const initializeApp = async () => {
      if (!isInitialized) return;

      try {
        await migrateFromLocalStorage();
        
        // Ensure active plan stability - run migration
        const { ensureActiveStudyPlan } = await import('@/utils/studyDataMigration');
        ensureActiveStudyPlan();
        
        const savedPlan = loadActiveStudyPlan();
        if (savedPlan) {
          const planWithDefaults = savedPlan.cycleStart
            ? savedPlan
            : { ...savedPlan, cycleStart: new Date() };
          setStudyPlan(planWithDefaults);
          
          // CRITICAL FIX: Sync subjects from study plan
          if (planWithDefaults.subjects && planWithDefaults.subjects.length > 0) {
            console.log('🔄 Sincronizando subjects do plano:', planWithDefaults.subjects.length);
            setSubjects(planWithDefaults.subjects);
          }
          
          if (planWithDefaults.examDate) {
            setExamDate(new Date(planWithDefaults.examDate));
          }
          console.log('✅ Plano ativo restaurado:', savedPlan.id);
        }

        // Load existing study sessions from database
        const savedSessions = loadStudySessions();
        setStudySessions(savedSessions);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [isInitialized]);

  // Sync subjects when studyPlan changes (CRITICAL FIX)
  useEffect(() => {
    if (studyPlan?.subjects && studyPlan.subjects.length > 0 && subjects.length === 0) {
      console.log('🔄 Sincronizando subjects automaticamente:', studyPlan.subjects.length);
      setSubjects(studyPlan.subjects);
    }
  }, [studyPlan, subjects.length]);

  // Sync studyPlan.subjects when subjects change
  useEffect(() => {
    if (subjects.length > 0 && studyPlan && isInitialized) {
      const updatedPlan = { ...studyPlan, subjects };
      if (JSON.stringify(studyPlan.subjects) !== JSON.stringify(subjects)) {
        console.log('🔄 Atualizando subjects no plano de estudos');
        setStudyPlan(updatedPlan);
      }
    }
  }, [subjects, studyPlan?.id, isInitialized]);

  // Auto-save study plan when it changes (only if database is ready)
  useEffect(() => {
    if (studyPlan && isInitialized) {
      saveActiveStudyPlan(studyPlan);
    }
  }, [studyPlan, isInitialized]);

  // Auto-save study sessions when they change (only if database is ready)
  useEffect(() => {
    if (studySessions.length > 0 && isInitialized) {
      const latestSession = studySessions[studySessions.length - 1];
      if (latestSession && latestSession.id) {
        console.log('🔄 StudyContext auto-save triggered for session:', latestSession.id);
        
        // Check if this session was already saved (avoid duplicate saves)
        const existingSessions = loadStudySessions();
        const alreadyExists = existingSessions.some(s => s.id === latestSession.id);
        
        if (!alreadyExists) {
          try {
            saveStudySession(latestSession);
            console.log('✅ StudyContext auto-save successful for session:', latestSession.id);
          } catch (error) {
            console.error('❌ StudyContext auto-save failed for session:', latestSession.id, error);
          }
        } else {
          console.log('⏭️ Session already exists, skipping auto-save:', latestSession.id);
        }
      }
    }
  }, [studySessions, isInitialized]);

  // Debug listener for testing topic selection
  useEffect(() => {
    const handleDebugRequest = () => {
      console.log('📋 StudyContext Debug Info:');
      console.log('📊 Subjects:', subjects.length);
      subjects.forEach((subject, i) => {
        console.log(`  ${i+1}. ${subject.name} (${subject.topics?.length || 0} topics)`);
        subject.topics?.forEach((topic, j) => {
          console.log(`    ${j+1}. ${topic.name} ${topic.subtopics?.length ? `(${topic.subtopics.length} subtopics)` : ''}`);
        });
      });
      console.log('🎯 Study Plan:', studyPlan ? `Available (ID: ${studyPlan.id})` : 'Not available');
      console.log('🎯 Study Plan Subjects:', studyPlan?.subjects?.length || 0);
      console.log('💾 Database Ready:', isInitialized);
    };

    const handleForceSyncSubjects = () => {
      console.log('🔄 Force sync subjects requested...');
      if (studyPlan?.subjects && studyPlan.subjects.length > 0) {
        console.log('🔄 Syncing subjects from study plan:', studyPlan.subjects.length);
        setSubjects(studyPlan.subjects);
      } else {
        console.log('⚠️ No subjects in study plan to sync');
      }
    };

    window.addEventListener('debugGetStudyContext', handleDebugRequest);
    window.addEventListener('forceSyncSubjects', handleForceSyncSubjects);
    
    return () => {
      window.removeEventListener('debugGetStudyContext', handleDebugRequest);
      window.removeEventListener('forceSyncSubjects', handleForceSyncSubjects);
    };
  }, [subjects, studyPlan, isInitialized]);

  const examTypes: ExamType[] = [
    { 
      id: 'enem', 
      name: 'ENEM', 
      description: 'Exame Nacional do Ensino Médio',
      defaultSubjects: ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Literatura', 'Inglês/Espanhol', 'Redação'],
      recommendedHours: 40,
      difficulty: 'medium'
    },
    { 
      id: 'concursos', 
      name: 'Concursos Públicos', 
      description: 'Concursos federais, estaduais e municipais',
      defaultSubjects: ['Português', 'Matemática', 'Raciocínio Lógico', 'Informática', 'Direito Constitucional', 'Direito Administrativo', 'Conhecimentos Específicos'],
      recommendedHours: 50,
      difficulty: 'hard'
    },
    { 
      id: 'oab', 
      name: 'OAB', 
      description: 'Ordem dos Advogados do Brasil',
      defaultSubjects: ['Direito Constitucional', 'Direito Administrativo', 'Direito Civil', 'Direito Penal', 'Direito do Trabalho', 'Direito Tributário', 'Ética Profissional'],
      recommendedHours: 45,
      difficulty: 'hard'
    },
    { 
      id: 'vestibular', 
      name: 'Vestibular', 
      description: 'Vestibulares tradicionais',
      defaultSubjects: ['Matemática', 'Português', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Literatura', 'Inglês'],
      recommendedHours: 35,
      difficulty: 'medium'
    },
    { 
      id: 'militar', 
      name: 'Concursos Militares', 
      description: 'ESA, EsPCEx, IME, ITA, AFA',
      defaultSubjects: ['Matemática', 'Português', 'Física', 'Química', 'História', 'Geografia', 'Inglês'],
      recommendedHours: 50,
      difficulty: 'hard'
    },
    { 
      id: 'medicina', 
      name: 'Medicina', 
      description: 'FUVEST, UNICAMP, outros vestibulares de medicina',
      defaultSubjects: ['Matemática', 'Português', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Literatura'],
      recommendedHours: 55,
      difficulty: 'hard'
    },
    { 
      id: 'custom', 
      name: 'Personalizado', 
      description: 'Crie seu próprio conjunto de matérias'
    }
  ];

  const value: StudyContextType = {
    studySessions,
    setStudySessions,
    subjects,
    setSubjects,
    studyPlan,
    setStudyPlan,
    examDate,
    setExamDate,
    selectedExam,
    setSelectedExam,
    examTypes,
    isDBLoading,
    dbError
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};
