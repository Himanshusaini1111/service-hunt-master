const admin = require('firebase-admin');

// Check if we have environment variables (production) or local file (development)
let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY) {
    // Production: Use environment variables
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
} else {
    // Development: Use local JSON file
    try {
        serviceAccount = require('./service-account.json');
        console.log('✅ Firebase initialized with local service-account.json');
    } catch (e) {
        console.error('❌ No Firebase credentials found. Set environment variables or add service-account.json');
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;