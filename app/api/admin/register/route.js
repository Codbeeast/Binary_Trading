import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        console.log("🛠️ Admin Register API Called");
        const body = await req.json();
        const { name, email, password, secretKey } = body;

        // 1. Validation
        if (!name || !email || !password || !secretKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Secret Key Check
        const adminSecret = process.env.ADMIN_PASSWORD || "admin123";
        if (secretKey !== adminSecret) {
            console.warn("🚫 Unauthorized admin registration attempt with key:", secretKey);
            return NextResponse.json({ error: "Invalid Admin Secret Key" }, { status: 401 });
        }

        await dbConnect();

        // 3. Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }

        // 4. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 5. Generate a new 8-char referral code
        let newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // 6. Create Admin User
        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            balance: 800000,
            role: 'admin', // Force Admin Role
            referralCode: newReferralCode
        });

        console.log("🎉 Admin User Created Successfully:", newUser._id);
        return NextResponse.json({
            message: "Administrator account created successfully",
            userId: newUser._id
        }, { status: 201 });

    } catch (error) {
        console.error("❌ Admin Registration Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
