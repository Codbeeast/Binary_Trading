"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User as UserIcon, Loader2, Info, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Delay redirect to show success message
                setTimeout(() => {
                    router.push("/login");
                }, 1500);
            } else {
                setError(data.error || "Registration failed");
                setLoading(false);
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    const handleGoogleSignup = () => {
        signIn("google", { callbackUrl: "/chart" });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#111318] p-4 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-dark-900" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#111318]/90 to-black" />

            {/* Glow Effects */}
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF5722]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-[#FF5722]/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none opacity-20" />

            <div className="w-full max-w-md bg-[#1C1F26] border border-white/5 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FF5722]/10 text-[#FF5722] mb-4 border border-[#FF5722]/20 shadow-[0_0_15px_rgba(255,87,34,0.15)]">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Sign Up To Get Started
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Account created! Redirecting...</span>
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleSignup}
                        className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.53-6.033-5.632 s2.701-5.632,6.033-5.632c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Sign up with Google
                    </button>

                    <div className="relative flex items-center justify-center">
                        <div className="border-t border-white/10 w-full absolute"></div>
                        <span className="bg-[#1C1F26] px-3 text-xs text-gray-500 uppercase relative z-10 font-medium">Or sign up with email</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#16181F] border border-[#2C303A] text-white rounded-xl px-10 py-3 outline-none focus:border-[#FF5722]/50 focus:ring-1 focus:ring-[#FF5722]/50 transition-all placeholder:text-gray-600"
                                    placeholder="Type Your Name"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-[#16181F] border border-[#2C303A] text-white rounded-xl px-10 py-3 outline-none focus:border-[#FF5722]/50 focus:ring-1 focus:ring-[#FF5722]/50 transition-all placeholder:text-gray-600"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-[#16181F] border border-[#2C303A] text-white rounded-xl px-10 py-3 outline-none focus:border-[#FF5722]/50 focus:ring-1 focus:ring-[#FF5722]/50 transition-all placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full bg-gradient-to-r from-[#FF5722] to-[#F97316] hover:from-[#E64A19] hover:to-[#EA580C] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#FF5722]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="text-white font-semibold hover:text-[#FF5722] transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
