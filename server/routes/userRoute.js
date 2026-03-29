const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Regular registration
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = new User({ name, email, password });
    await newUser.save();

    res.status(201).json({ 
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      role: newUser.role,
      message: "User Registered Successfully" 
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Regular login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login Attempt:", email);

  try {
    const user = await User.findOne({ email });
    console.log("Found User:", user ? "Yes" : "No");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Send user data without password
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      phone: user.phone,
      address: user.address,
      profileImage: user.profileImage
    };
    
    res.send(userData);
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Google Login Endpoint
router.post("/google-login", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "No credential provided" });
  }

  try {
    // Verify the Google token with proper audience
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId, email_verified } = payload;

    console.log("Google Login Payload:", { email, name, googleId, email_verified });

    // Verify email is verified
    if (!email_verified) {
      return res.status(400).json({ message: "Email not verified by Google" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google ID
      user = new User({
        name: name || email.split('@')[0], // Fallback name if not provided
        email: email,
        password: googleId, // Store Google ID as password
        profileImage: picture || '',
        isAdmin: false,
        role: 'user'
      });
      
      await user.save();
      console.log("New user created via Google login:", email);
    } else {
      // Update profile image if needed
      if (picture && !user.profileImage) {
        user.profileImage = picture;
        await user.save();
      }
      console.log("Existing user logged in via Google:", email);
    }

    // Send user data (exclude sensitive info)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      profileImage: user.profileImage || picture || '',
      isGoogleLogin: true
    };

    res.status(200).json(userData);
    
  } catch (error) {
    console.error("Google Login Error Details:", error);
    
    // More specific error messages
    if (error.message.includes('audience')) {
      return res.status(401).json({ 
        message: "Invalid Google client ID configuration" 
      });
    }
    
    res.status(500).json({ 
      message: "Google authentication failed. Please try again.", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all users
router.get("/getallusers", async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); // Exclude password
        res.send(users);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// Delete user
router.post("/deleteuser", async (req, res) => {
    const userid = req.body.userid;

    try {
        await User.findOneAndDelete({ _id: userid });
        res.send('User Deleted Successfully');
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

module.exports = router;