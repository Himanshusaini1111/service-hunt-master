const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require('http');
const socketIo = require('socket.io');
const dbconfig = require("./db");
const serviceRouter = require("./routes/serviceRouter");
const usersRoute = require("./routes/userRoute");
const bookingRoute = require("./routes/bookingRoute");
const pathnerRoute = require("./routes/pathnerRoute.js");
const requirementRoute = require("./routes/requrementRoute.js");
const bodyParser = require('body-parser');
const reviewRoutes = require('./routes/reviewRoutes');
const commentsRouter = require('./routes/comments');
const app = express();
const bidRouter = require("./routes/bids");
const vendorRoutes = require("./routes/vendorRoutes");
const helpers = require("./routes/helpers");
const superadmin = require("./routes/superadmin.js")

// Middleware
app.use(express.json());

// CORS configuration - Allow both localhost and production
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://service-hunt-master.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            console.log('Blocked origin:', origin);
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers for Google OAuth
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// Routes
app.use("/api/vendor", vendorRoutes);
app.use("/api/bids", bidRouter);
app.use("/api/service", serviceRouter);
app.use("/api/users", usersRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/pathners", pathnerRoute);
app.use("/api/requirements", requirementRoute);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentsRouter);
app.use('/api/helper', helpers);
app.use('/api/superadmin', superadmin);

if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../client/build');
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));