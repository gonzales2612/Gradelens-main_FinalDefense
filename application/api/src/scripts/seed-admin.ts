import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { UserModel } from "../models/User.ts";

// Load environment variables
dotenv.config();

async function seed() {
    const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/gradelens";
    
    console.log(`Connecting to MongoDB at ${mongoUrl}...`);
    await mongoose.connect(mongoUrl);

    const existing = await UserModel.findOne({
        email: "admin@gradelens.app",
    });

    if (existing) {
        console.log("Admin user already exists");
        process.exit(0);
    }

    const passwordHash = await bcrypt.hash("admin12345", 12);

    await UserModel.create({
        email: "admin@gradelens.app",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
        emailVerified: true,
    });

    console.log("Admin user created");
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
