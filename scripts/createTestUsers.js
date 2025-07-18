const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config({ path: "/home/ubuntu/project/almas-dimas-native-project/native-project/.env" });

const createTestUsers = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");

    const users = [
      {
        username: "testbuyer",
        email: "buyer@example.com",
        password: "password123",
        role: "Buyer",
        isEmailVerified: true,
      },
      {
        username: "testseller",
        email: "seller@example.com",
        password: "password123",
        role: "Seller",
        isEmailVerified: true,
      },
      {
        username: "testadmin",
        email: "admin@example.com",
        password: "password123",
        role: "Admin",
        isEmailVerified: true,
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }
      const user = new User(userData);
      await user.save();
      console.log(`User ${user.email} created successfully.`);
    }

    console.log("Test users created/checked.");
    mongoose.connection.close();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

createTestUsers();


