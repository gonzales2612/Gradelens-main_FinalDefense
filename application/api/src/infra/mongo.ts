import mongoose from "mongoose";

export async function connectMongo() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.log("MongoDB disabled");
    return;
  }

  await mongoose.connect(url);
  console.log("MongoDB connected");
}
