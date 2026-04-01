const admin = require('firebase-admin');

// Service account JSON from Firebase Console
const serviceAccount = require('./service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;