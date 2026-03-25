const mongoose = require("mongoose");

// Try environment variable first, fallback to hardcoded
const mongoURL = process.env.MONGO_URL || "mongodb+srv://servicehunt:service0987654321@cluster0.u0b3u.mongodb.net/service?retryWrites=true&w=majority";

mongoose.set('strictQuery', true);

mongoose.connect(mongoURL, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log('Mongo DB Connection Successful'))
    .catch((err) => console.log('Mongo DB connection failed', err));

module.exports = mongoose;