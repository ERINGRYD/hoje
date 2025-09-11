/**
 * Study Session Persistence Test Utility
 * Provides debugging and testing functions for study session persistence
 */

import { StudySession } from '@/types/study';
import { saveStudySessionData, loadStudySessionsData } from '@/utils/sqlitePersistence';

export interface SessionTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export const testStudySessionPersistence = (): SessionTestResult => {
  try {
    console.log('🧪 Testing study session persistence...');
    
    // Create test session
    const testSession: StudySession = {
      id: `test_${Date.now()}`,
      subject: 'Teste de Persistência',
      topic: 'Sistema de Salvamento',
      subtopic: 'Verificação Automática',
      startTime: new Date(),
      endTime: new Date(),
      duration: 25,
      completed: true,
      notes: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        studyType: 'teste',
        assunto: 'Teste de Persistência / Sistema de Salvamento / Verificação Automática',
        times: {
          netSeconds: 1500,
          pauseSeconds: 0,
          totalSeconds: 1500,
        }
      })
    };

    console.log('📝 Creating test session:', testSession);

    // Save test session
    saveStudySessionData(testSession);
    
    // Load and verify
    const savedSessions = loadStudySessionsData();
    const foundSession = savedSessions.find(s => s.id === testSession.id);
    
    if (foundSession) {
      console.log('✅ Test session found in database:', foundSession);
      
      // Clean up test session
      try {
        // Note: We don't have a delete function, so we'll leave it
        console.log('ℹ️ Test session will remain in database for debugging');
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up test session:', cleanupError);
      }
      
      return {
        success: true,
        message: 'Study session persistence test PASSED ✅',
        data: {
          saved: testSession,
          loaded: foundSession,
          totalSessions: savedSessions.length
        }
      };
    } else {
      return {
        success: false,
        message: 'Study session persistence test FAILED ❌ - Session not found after save',
        data: {
          saved: testSession,
          allSessions: savedSessions.length
        }
      };
    }
    
  } catch (error) {
    console.error('❌ Study session persistence test error:', error);
    return {
      success: false,
      message: 'Study session persistence test FAILED ❌ - Error occurred',
      error
    };
  }
};

export const recoverBackupSessions = (): SessionTestResult => {
  try {
    console.log('🔄 Checking for backup sessions in localStorage...');
    
    const backupKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('study_session_backup_')
    );
    
    console.log('📦 Found backup keys:', backupKeys);
    
    if (backupKeys.length === 0) {
      return {
        success: true,
        message: 'No backup sessions found',
        data: { backupCount: 0 }
      };
    }
    
    let recoveredCount = 0;
    const errors: any[] = [];
    
    for (const key of backupKeys) {
      try {
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const session: StudySession = JSON.parse(sessionData);
          saveStudySessionData(session);
          localStorage.removeItem(key);
          recoveredCount++;
          console.log('♻️ Recovered backup session:', session.id);
        }
      } catch (error) {
        console.error('❌ Error recovering backup session:', key, error);
        errors.push({ key, error });
      }
    }
    
    return {
      success: true,
      message: `Recovery complete: ${recoveredCount} sessions recovered, ${errors.length} errors`,
      data: {
        recoveredCount,
        errors,
        totalBackups: backupKeys.length
      }
    };
    
  } catch (error) {
    console.error('❌ Recovery process failed:', error);
    return {
      success: false,
      message: 'Recovery process failed',
      error
    };
  }
};

export const verifySessionIntegrity = (): SessionTestResult => {
  try {
    console.log('🔍 Verifying session integrity...');
    
    const sessions = loadStudySessionsData();
    console.log('📊 Total sessions found:', sessions.length);
    
    const issues: any[] = [];
    
    sessions.forEach((session, index) => {
      // Check required fields
      if (!session.id) {
        issues.push({ index, issue: 'Missing ID', session });
      }
      if (!session.subject) {
        issues.push({ index, issue: 'Missing subject', session });
      }
      if (!session.startTime) {
        issues.push({ index, issue: 'Missing startTime', session });
      }
      if (typeof session.duration !== 'number') {
        issues.push({ index, issue: 'Invalid duration', session });
      }
    });
    
    return {
      success: issues.length === 0,
      message: `Integrity check: ${issues.length} issues found in ${sessions.length} sessions`,
      data: {
        totalSessions: sessions.length,
        issues,
        sampleSessions: sessions.slice(0, 3)
      }
    };
    
  } catch (error) {
    console.error('❌ Integrity verification failed:', error);
    return {
      success: false,
      message: 'Integrity verification failed',
      error
    };
  }
};

// Add to window for debugging
declare global {
  interface Window {
    testStudyPersistence: () => SessionTestResult;
    recoverStudySessions: () => SessionTestResult;
    verifyStudySessions: () => SessionTestResult;
    studySessionUtils: {
      test: () => SessionTestResult;
      recover: () => SessionTestResult;
      verify: () => SessionTestResult;
    };
  }
}

// Auto-register functions on window for browser debugging
if (typeof window !== 'undefined') {
  window.testStudyPersistence = testStudySessionPersistence;
  window.recoverStudySessions = recoverBackupSessions;
  window.verifyStudySessions = verifySessionIntegrity;
  window.studySessionUtils = {
    test: testStudySessionPersistence,
    recover: recoverBackupSessions,
    verify: verifySessionIntegrity
  };
  
  console.log('🛠️ Study session debugging utils available:');
  console.log('   window.testStudyPersistence() - Test persistence system');
  console.log('   window.recoverStudySessions() - Recover backup sessions');
  console.log('   window.verifyStudySessions() - Check session integrity');
  console.log('   window.studySessionUtils - All utilities in one object');
}