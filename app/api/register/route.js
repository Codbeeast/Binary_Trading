import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        console.log("📝 Register API Called");
        const body = await req.json();
        console.log("📦 Request Body:", body);
        const { name, email, password, referralCode } = body;

        if (!name || !email || !password) {
            console.warn("⚠️ Missing fields");
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        console.log("🔌 Connecting to Database...");
        await dbConnect();
        console.log("✅ Database Connected");

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.warn("⚠️ User already exists:", email);
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }

        // Hash password
        console.log("🔐 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Handle Referral
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referredBy = referrer._id;
            }
        }
        
        // Generate a new 8-char referral code for this user
        let newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create user with DEMO balance (10,000)
        console.log("👤 Creating User document...");
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            balance: 800000,
            role: 'user',
            referralCode: newReferralCode,
            referredBy
        });

        console.log("🎉 User Created Successfully:", newUser._id);
        return NextResponse.json({
            message: "User created",
            userId: newUser._id
        }, { status: 201 });

    } catch (error) {
        console.error("❌ Registration Error Full:", error);
        // Return actual error message to client for easier debugging
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
