// config/db.js
// This file is responsible for ONE thing: connecting to MongoDB using Mongoose.
// Keeping it separate keeps server.js clean and easy to read.

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect returns a promise, so we can await it.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit the process with failure (1) if we can't connect to the DB.
    // There's no point running an API that can't reach its database.
    process.exit(1);
  }
};

module.exports = connectDB;
