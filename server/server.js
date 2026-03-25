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
const superadmin = require("./routes/superadmin.js");

// Middleware
app.use(express.json());

// ✅ FIXED CORS - Allow both localhost (dev) and production URL
const allowedOrigins = [
    "http://localhost:3000",           // Local development
    "https://service-hunt-master.onrender.com"  // Your production frontend URL
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

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
    // For Render deployment - build is in parent directory's client/build
    const clientBuildPath = path.join(__dirname, '../client/build');
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));