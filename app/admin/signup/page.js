"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldPlus, Mail, Lock, User, Key, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AdminSignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: "", email: "", password: "", secretKey: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to create administrator account");
                setLoading(false);
            } else {
                setSuccess(true);
                setLoading(false);
                // Redirect after 2 seconds
                setTimeout(() => {
                    router.push("/admin/login");
                }, 2000);
            }
        } catch (err) {
            setError("Connection error. Please check your network.");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4 text-white font-sans">
                <div className="w-full max-w-md bg-[#16181D] border border-emerald-500/20 rounded-2xl p-10 text-center shadow-2xl">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Registration Successful!</h1>
                    <p className="text-gray-400 mb-8">
                        The administrator account has been created. Redirecting you to the login portal...
                    </p>
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4 text-white relative overflow-hidden font-sans">
            {/* Background Aesthetic */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1d24_0%,#0F1115_100%)]" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
            
            <Link href="/admin/login" className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back to Admin Login</span>
            </Link>

            <div className="w-full max-w-lg relative z-10 py-12">
                <div className="bg-[#16181D] border border-white/5 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 mb-6 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                            <ShieldPlus size={30} />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Onboarding</h1>
                        <p className="text-gray-500 text-sm">Register a new system administrator</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#1C1F26] border border-[#2C303A] text-white rounded-xl px-12 py-3 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-[#1C1F26] border border-[#2C303A] text-white rounded-xl px-12 py-3 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                                        placeholder="admin@platform.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-[#1C1F26] border border-[#2C303A] text-white rounded-xl px-12 py-3 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Secret Admin Key</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500/50" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-[#1C1F26] border border-[#2C303A] text-white rounded-xl px-12 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                                    placeholder="Enter system secret key"
                                    value={form.secretKey}
                                    onChange={e => setForm({ ...form, secretKey: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 ml-1 italic">Note: Only users with the system secret key can create admin accounts.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initialize Admin Account"}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-gray-500 text-sm">
                            Already have an admin account?{" "}
                            <Link href="/admin/login" className="text-orange-500 font-semibold hover:text-orange-400 transition-colors">
                                Admin Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
