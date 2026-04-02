const admin = require('firebase-admin');

// Use environment variables (safe for GitHub, works on Render)
let serviceAccount = null;

if (process.env.FIREBASE_PRIVATE_KEY) {
    // Production: Use environment variables from Render
    serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
    console.log('✅ Firebase initialized with environment variables');
}
// Development: Use local file (only on your computer)
else if (require('fs').existsSync('./service-account.json')) {
    serviceAccount = require('./service-account.json');
    console.log('✅ Firebase initialized with local file (development)');
}

if (!serviceAccount) {
    console.error('❌ No Firebase credentials found. Set environment variables on Render.');
    // Don't exit - allow app to run (notifications won't work)
} else {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
}

module.exports = admin;