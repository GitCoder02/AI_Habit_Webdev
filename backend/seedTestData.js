// backend/seedTestData.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Habit = require("./models/Habit");
const Goal = require("./models/Goal");
const Event = require("./models/Event");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");

    // 🔑 use your test user email
    const userEmail = "ak@example.com";
    const user = await User.findOne({ email: userEmail });
    if (!user) throw new Error("User not found: " + userEmail);
    console.log("Using user:", user.email);

    // cleanup old
    await Promise.all([
      Habit.deleteMany({ user: user._id }),
      Goal.deleteMany({ userId: user._id }),
      Event.deleteMany({ user: user._id }),
    ]);

    // 🌱 Seed Habit with broken streak
    const habit = await Habit.create({
      user: user._id,
      name: "Daily Reading",
      streak: 0,
      bestStreak: 3,
      lastCompleted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago → streak broken
    });

    // 🌱 Seed Goal due in 3 days
    const goal = await Goal.create({
      userId: user._id,
      title: "Finish project report",
      description: "Complete draft and slides",
      targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      progress: 20, // < 50 → will trigger urgency suggestion
      status: "Active",
    });

    // 🌱 Seed Event tomorrow morning (9–10 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventStart = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      9,
      0
    );
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
    const event = await Event.create({
      user: user._id,
      title: "Team Meeting",
      start: eventStart,
      end: eventEnd,
    });

    console.log("🌱 Test data seeded successfully!");
    console.log("Habit:", habit.name, "Goal:", goal.title, "Event:", event.title);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder failed:", err);
    process.exit(1);
  }
}

seed();