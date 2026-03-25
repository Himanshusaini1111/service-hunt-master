const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require('http');
const socketIo = require('socket.io');
const dbconfig = require("./db"); // Your database config file
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
const vendorRoutes = require("./routes/vendorRoutes"); // Adjust the path as needed
const helpers = require("./routes/helpers");
const superadmin =require("./routes/superadmin.js")

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000", credentials: true
})); // Allow requests from frontend origin

// Routes
app.use("/api/vendor", vendorRoutes); // Register the routes under /api/vendor-helper

app.use("/api/bids", bidRouter);
app.use("/api/service", serviceRouter);
app.use("/api/users", usersRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/pathners", pathnerRoute);
app.use("/api/requirements", requirementRoute);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentsRouter); // E
app.use('/api/helper', helpers); // E
app.use('/api/superadmin', superadmin);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
    app.use("/", express.static("client/build"));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "client/build/index.html"));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));