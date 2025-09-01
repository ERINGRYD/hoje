# Árvore de Componentes

## Hierarquia Principal

```
App.tsx
├── DatabaseLoadingProvider
│   ├── StudyContext.Provider
│   │   ├── Router
│   │   │   ├── Index (Dashboard)
│   │   │   │   ├── Dashboard
│   │   │   │   │   ├── Statistics
│   │   │   │   │   ├── StudyProgressWidget
│   │   │   │   │   └── StudyPlanFloatingButton
│   │   │   │   └── BottomNavigation
│   │   │   ├── StudySessionPage
│   │   │   │   ├── StudyPlanManager
│   │   │   │   ├── PomodoroTimer
│   │   │   │   └── StudyProgressModal
│   │   │   ├── BattleFieldPage
│   │   │   │   ├── BattleArena
│   │   │   │   ├── EnemyCard
│   │   │   │   └── UserProgressWidget
│   │   │   └── QuestionsManager
│   │   │       ├── QuestionsSection
│   │   │       └── AddQuestionModal
│   │   └── Toaster
└── DatabaseLoadingWrapper
```

## Componentes Core por Funcionalidade

### Study System
- StudyPlanManager (Container)
- SubjectManagement (CRUD)
- TopicManagement (Hierárquico)
- TimerComponents (Pomodoro)

### Battle System  
- BattleArena (Gamificação)
- EnemyCard (RPG Elements)
- UserProgressWidget (Stats)

### UI System
- Radix UI Base Components
- Custom Design System
- Layout Components