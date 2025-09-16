/**
 * Debug utilities for StudyContext and data synchronization
 */

// Enhanced debugging function for StudyContext
export const debugStudyContext = () => {
  console.group('🔍 StudyContext Debug Report');
  
  // Trigger context debug
  window.dispatchEvent(new CustomEvent('debugGetStudyContext'));
  
  // Check localStorage backups
  const planBackup = localStorage.getItem('activeStudyPlan');
  const sessionsBackup = localStorage.getItem('studySessions');
  
  console.log('💾 LocalStorage Backups:');
  console.log('  Study Plan:', planBackup ? 'Available' : 'Not found');
  console.log('  Study Sessions:', sessionsBackup ? 'Available' : 'Not found');
  
  if (planBackup) {
    try {
      const plan = JSON.parse(planBackup);
      console.log('  Plan Details:', {
        id: plan.id,
        subjects: plan.subjects?.length || 0,
        examDate: plan.examDate,
        type: plan.type
      });
    } catch (error) {
      console.error('  Error parsing plan backup:', error);
    }
  }
  
  console.groupEnd();
};

// Force sync subjects from study plan
export const forceSyncSubjects = () => {
  console.log('🔄 Forcing subject synchronization...');
  window.dispatchEvent(new CustomEvent('forceSyncSubjects'));
};

// Check data integrity
export const checkDataIntegrity = () => {
  console.group('🔧 Data Integrity Check');
  
  // Get current context state
  window.dispatchEvent(new CustomEvent('debugGetStudyContext'));
  
  // Check if there are study sessions without subjects
  const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
  const plan = JSON.parse(localStorage.getItem('activeStudyPlan') || 'null');
  
  console.log('📊 Data Analysis:');
  console.log('  Study Sessions:', sessions.length);
  console.log('  Study Plan Subjects:', plan?.subjects?.length || 0);
  
  if (sessions.length > 0 && (!plan || !plan.subjects || plan.subjects.length === 0)) {
    console.warn('⚠️ WARNING: You have study sessions but no subjects in plan');
    console.log('💡 Recommendation: Create or restore a study plan');
  }
  
  // Check for orphaned sessions (sessions with subjects not in current plan)
  if (plan?.subjects && sessions.length > 0) {
    const planSubjects = plan.subjects.map((s: any) => s.name);
    const orphanedSessions = sessions.filter((session: any) => 
      session.subject && !planSubjects.includes(session.subject)
    );
    
    if (orphanedSessions.length > 0) {
      console.warn('⚠️ WARNING: Found sessions with subjects not in current plan:', orphanedSessions.length);
      console.log('Orphaned sessions:', orphanedSessions.map((s: any) => s.subject));
    }
  }
  
  console.groupEnd();
};

// Test topic selection functionality
export const testTopicSelection = () => {
  console.group('🎯 Topic Selection Test');
  
  // First get context state
  debugStudyContext();
  
  // Test if we can trigger topic selection
  console.log('Testing topic selection...');
  
  setTimeout(() => {
    const event = new CustomEvent('debugGetStudyContext');
    window.dispatchEvent(event);
    
    console.log('✅ Topic selection test completed');
    console.groupEnd();
  }, 100);
};

// Recovery function to fix common issues
export const recoverStudyData = () => {
  console.group('🚑 Study Data Recovery');
  
  try {
    // Force sync subjects
    forceSyncSubjects();
    
    // Check if we need to reload from localStorage
    const planBackup = localStorage.getItem('activeStudyPlan');
    if (planBackup) {
      console.log('📥 Found study plan backup, attempting recovery...');
      
      // Trigger a page reload to reinitialize context
      setTimeout(() => {
        console.log('🔄 Reloading page to reinitialize context...');
        window.location.reload();
      }, 1000);
    } else {
      console.warn('⚠️ No study plan backup found in localStorage');
      console.log('💡 Please create a new study plan to continue');
    }
    
  } catch (error) {
    console.error('❌ Recovery failed:', error);
  }
  
  console.groupEnd();
};

// Export all functions to window for console access
if (typeof window !== 'undefined') {
  (window as any).studyDebug = {
    debugContext: debugStudyContext,
    forceSyncSubjects,
    checkIntegrity: checkDataIntegrity,
    testTopicSelection,
    recoverData: recoverStudyData,
    
    // Quick access functions
    debug: debugStudyContext,
    sync: forceSyncSubjects,
    check: checkDataIntegrity,
    recover: recoverStudyData
  };
  
  console.log('🛠️ Study Debug Tools Available:');
  console.log('  window.studyDebug.debug() - Debug context');
  console.log('  window.studyDebug.sync() - Force sync subjects');
  console.log('  window.studyDebug.check() - Check data integrity');
  console.log('  window.studyDebug.recover() - Recover study data');
}