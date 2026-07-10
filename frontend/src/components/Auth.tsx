import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut 
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Mail, Lock, LogIn, UserPlus, Chrome, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authSchema } from "@/lib/schemas";
import { z } from "zod";

export function AuthPage({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
      }
      onAuthSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in with Google");
      onAuthSuccess();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Google Login Error:", error);
      toast.error(`Google login failed: ${error.code || error.message}`);
      
      if (error.code === 'auth/unauthorized-domain') {
        toast.error("Please add this domain to your Firebase Authorized Domains in the Firebase Console.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Network request failed. Please check your internet connection and ensure no ad-blockers are interfering with the login popup.");
      } else if (error.code === 'auth/internal-error') {
        toast.error("Internal authentication error. Please try again or refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {isLogin 
              ? "Enter your credentials to access the builder" 
              : "Sign up to start building your SaaS projects"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="pl-10 bg-black/50 border-zinc-800 text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password text-zinc-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10 bg-black/50 border-zinc-800 text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold"
              disabled={loading}
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
              {isLogin ? <LogIn className="w-4 h-4 ml-2" /> : <UserPlus className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Chrome className="w-4 h-4 mr-2" />}
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-zinc-400 hover:text-orange-500 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
