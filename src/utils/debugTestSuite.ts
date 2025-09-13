// Debug test suite for study session persistence and topic selection
import { StudySession } from '@/types/study';
import { saveStudySessionData, loadStudySessionsData } from '@/utils/sqlitePersistence';
import { studyDB } from '@/lib/studyDatabase';

// Function to test study session persistence
export const testStudySessionPersistence = async () => {
  console.log('🧪 Testing study session persistence...');
  
  const testSession: StudySession = {
    id: `test_${Date.now()}`,
    subject: 'Test Subject',
    topic: 'Test Topic', 
    subtopic: 'Test Subtopic',
    startTime: new Date(),
    endTime: new Date(),
    duration: 25,
    completed: true
  };

  try {
    // Test 1: Save session
    console.log('📝 Test 1: Saving session...');
    saveStudySessionData(testSession);
    console.log('✅ Session saved successfully');

    // Test 2: Load sessions
    console.log('📖 Test 2: Loading sessions...');
    const sessions = loadStudySessionsData();
    console.log(`📊 Found ${sessions.length} sessions`);
    
    const savedSession = sessions.find(s => s.id === testSession.id);
    if (savedSession) {
      console.log('✅ Test session found in database');
      console.log('📋 Session data:', savedSession);
    } else {
      console.log('❌ Test session NOT found in database');
    }

    // Test 3: Database connection
    console.log('🔌 Test 3: Database connection...');
    const db = studyDB.getDB();
    if (db) {
      console.log('✅ Database connection active');
      
      // Check if tables exist
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = stmt.all();
      stmt.free();
      console.log('📋 Available tables:', tables.map(t => t.name));
      
      // Check study_sessions table specifically
      const sessionsStmt = db.prepare('SELECT COUNT(*) as count FROM study_sessions');
      const sessionCount = sessionsStmt.getAsObject();
      sessionsStmt.free();
      console.log(`📊 Total sessions in DB: ${sessionCount.count}`);
    } else {
      console.log('❌ Database connection failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Function to test localStorage backup system
export const testBackupSystem = () => {
  console.log('🧪 Testing localStorage backup system...');
  
  const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('study_session_backup_'));
  console.log(`📦 Found ${backupKeys.length} backup sessions in localStorage`);
  
  if (backupKeys.length > 0) {
    console.log('📋 Backup sessions:', backupKeys);
    backupKeys.forEach(key => {
      try {
        const session = JSON.parse(localStorage.getItem(key) || '{}');
        console.log(`📄 ${key}:`, session.subject, session.duration, 'min');
      } catch (e) {
        console.log(`❌ Invalid backup: ${key}`);
      }
    });
  }
};

// Function to check if subjects and topics are available for selection
export const testTopicSelection = () => {
  console.log('🧪 Testing topic selection data...');
  
  try {
    // Check if StudyContext has subjects
    const testEvent = new CustomEvent('debugGetStudyContext');
    window.dispatchEvent(testEvent);
    
    // This will be caught by a listener we'll add to StudyContext
    console.log('📤 Requested study context data...');
    
    return true;
  } catch (error) {
    console.error('❌ Topic selection test failed:', error);
    return false;
  }
};

// Function to force subjects sync from study plan
export const forceSyncSubjects = () => {
  console.log('🔄 Forcing subjects sync from study plan...');
  
  try {
    const syncEvent = new CustomEvent('forceSyncSubjects');
    window.dispatchEvent(syncEvent);
    console.log('✅ Sync event dispatched');
    return true;
  } catch (error) {
    console.error('❌ Failed to force sync:', error);
    return false;
  }
};

// Main debug function
export const runFullDebugTest = async () => {
  console.log('🚀 Running full debug test suite...');
  console.log('=====================================');
  
  const persistenceResult = await testStudySessionPersistence();
  testBackupSystem();
  testTopicSelection();
  
  console.log('=====================================');
  console.log(persistenceResult ? '✅ Debug tests completed' : '❌ Some tests failed');
  
  return persistenceResult;
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugTests = {
    testStudySessionPersistence,
    testBackupSystem,
    testTopicSelection,
    runFullDebugTest,
    forceSyncSubjects
  };
  
  console.log('🔧 Debug functions available: window.debugTests');
  console.log('  - testStudySessionPersistence()');
  console.log('  - testBackupSystem()');
  console.log('  - testTopicSelection()');
  console.log('  - runFullDebugTest()');
  console.log('  - forceSyncSubjects()');
}