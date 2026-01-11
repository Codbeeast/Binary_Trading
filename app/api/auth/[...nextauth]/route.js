import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }

                console.log("🔐 Authorization Started for:", credentials.email);
                await dbConnect();
                console.log("✅ Database Connected in Auth");

                const user = await User.findOne({ email: credentials.email });
                if (!user) {
                    throw new Error("User not found");
                }

                // Check password (only if user has one - google users might not)
                if (!user.password) {
                    throw new Error("Please login with Google");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account.provider === "google") {
                try {
                    await dbConnect();

                    // Check if user exists
                    const existingUser = await User.findOne({ email: user.email });

                    if (!existingUser) {
                        // Create new user
                        const newUser = await User.create({
                            name: user.name,
                            email: user.email,
                            image: user.image,
                            balance: 800000, // Demo balance 8 Lakhs
                            provider: 'google',
                            role: 'user',
                            // No password for google users
                            password: await bcrypt.hash(Math.random().toString(36), 10) // Dummy password to satisfy schema if required
                        });
                        user.id = newUser._id.toString();
                        user.role = newUser.role;
                    } else {
                        // Update existing user logic if needed (e.g. update image)
                        user.id = existingUser._id.toString();
                        user.role = existingUser.role;
                    }
                    return true;
                } catch (error) {
                    console.error("Error saving Google user", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                // User object from authorize or signIn
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || 'binary_trading_secret_key_change_me'
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
