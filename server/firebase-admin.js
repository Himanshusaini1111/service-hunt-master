const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to load service account from various locations
let serviceAccount = null;
const possiblePaths = [
    path.join(__dirname, 'service-account.json'),           // Local development
    path.join(process.cwd(), 'service-account.json'),       // Current working directory
    '/etc/secrets/service-account.json'                     // Render secrets mount
];

for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
        try {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Firebase credentials loaded from: ${filePath}`);
            break;
        } catch (err) {
            console.log(`Failed to parse ${filePath}:`, err.message);
        }
    }
}

// Fallback to environment variables if file not found
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('⚠️ Using environment variables for Firebase credentials');
    
    // Clean the private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    // Remove any surrounding quotes
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
}

if (!serviceAccount) {
    console.error('❌ No Firebase credentials found. Please add service-account.json as a secret file.');
    process.exit(1);
}

// Validate the service account
if (!serviceAccount.private_key || !serviceAccount.client_email) {
    console.error('❌ Invalid service account: missing private_key or client_email');
    process.exit(1);
}

// Initialize Firebase Admin
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
}

module.exports = admin;