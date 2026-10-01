// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCC5wUpkopILDbMGWYCxKImAKA-_H3IAYM",
  authDomain: "touhou-music-player.firebaseapp.com",
  projectId: "touhou-music-player",
  storageBucket: "touhou-music-player.firebasestorage.app",
  messagingSenderId: "1014007460736",
  appId: "1:1014007460736:web:612c9036548f4d6ff48765",
  measurementId: "G-ZQXWFWBPK2"
};

console.log('🚀 Initializing Firebase...');

// Initialize Firebase
try {
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
    }
    
    // Initialize Firebase app
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
    }
    
    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Set persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => console.log('✅ Auth persistence enabled'))
        .catch(error => console.warn('⚠️ Auth persistence failed:', error));
    
    // Export services
    window.firebaseAuth = auth;
    window.firebaseDb = db;
    window.firebaseReady = true;
    
    console.log('🎯 Firebase fully initialized');
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    window.firebaseReady = false;
}

// Utility function to check Firebase status
window.checkFirebaseStatus = function() {
    return {
        ready: window.firebaseReady,
        auth: !!window.firebaseAuth,
        firestore: !!window.firebaseDb,
        config: firebaseConfig
    };
};