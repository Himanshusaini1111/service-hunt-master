const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ONLY use secret file, ignore environment variables
let serviceAccount = null;
const secretFilePath = '/etc/secrets/service-account.json';
const localFilePath = path.join(__dirname, 'service-account.json');

// Try Render secret file first
if (fs.existsSync(secretFilePath)) {
    try {
        serviceAccount = JSON.parse(fs.readFileSync(secretFilePath, 'utf8'));
        console.log('✅ Firebase credentials loaded from Render secret file');
    } catch (err) {
        console.error('Failed to parse Render secret file:', err.message);
    }
}
// Fallback to local file for development
else if (fs.existsSync(localFilePath)) {
    try {
        serviceAccount = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
        console.log('✅ Firebase credentials loaded from local file');
    } catch (err) {
        console.error('Failed to parse local file:', err.message);
    }
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

// Ensure private key has proper format
let privateKey = serviceAccount.private_key;
// If the key has literal \n strings, replace them with actual newlines
if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
}
serviceAccount.private_key = privateKey;

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