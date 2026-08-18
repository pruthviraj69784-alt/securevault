const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("../models/user.model");
const connectDB = require("../config/database");

const NAMES = [
  "Alex Rivera", "Beatriz Santos", "Carlos Mendez", "Diana Prince", "Ethan Hunt",
  "Fiona Gallagher", "Gabriel Ross", "Hannah Abbott", "Ian Malcolm", "Julia Roberts",
  "Kevin Spacey", "Laura Croft", "Michael Scott", "Nina Williams", "Oscar Isaac",
  "Penelope Cruz", "Quentin Tarantino", "Rachel Green", "Steve Rogers", "Tina Fey",
  "Ulysses Grant", "Victor Stone", "Wanda Maximoff", "Xavier Charles", "Yara Shahidi",
  "Zack Snyder", "Aaron Paul", "Bella Hadid", "Chris Evans", "David Beckham",
  "Emma Watson", "Frank Castle", "Grace Hopper", "Harry Potter", "Iris West",
  "Jack Sparrow", "Kate Winslet", "Liam Neeson", "Mia Thermopolis", "Nathan Drake",
  "Olivia Wilde", "Peter Parker", "Quinn Fabray", "Ryan Gosling", "Sarah Connor",
  "Tony Stark", "Uma Thurman", "Vince Gilligan", "Will Smith", "Xena Warrior"
];

async function seedMultiple() {
  try {
    await connectDB();
    console.log("Connecting to MongoDB to seed 50 users...");

    const passwordHash = await bcrypt.hash("User@123456", 10);

    const userDocs = NAMES.map((name, index) => {
      const slug = name.toLowerCase().replace(/[^a-z]/g, "");
      return {
        name,
        email: `${slug}${index + 1}@securevault.io`,
        password: passwordHash,
        role: index % 10 === 0 ? "ADMIN" : "USER",
        status: index % 12 === 0 ? "Suspended" : "Active",
        createdAt: new Date(Date.now() - (index * 3600 * 24 * 1000))
      };
    });

    for (const doc of userDocs) {
      await User.updateOne(
        { email: doc.email },
        { $setOnInsert: doc },
        { upsert: true }
      );
    }

    const count = await User.countDocuments();
    console.log(`✅ Database seeding complete. Total registered users in MongoDB: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedMultiple();
