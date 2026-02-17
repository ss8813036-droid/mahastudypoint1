import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { signUp, signIn } from "@/lib/auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email for reset link!");
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
      else { toast.success("Welcome back!"); navigate("/"); }
    } else {
      if (!fullName.trim()) { toast.error("Please enter your full name"); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) toast.error(error.message);
      else toast.success("Check your email to verify your account!");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen galaxy-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="MahaStudyPoint" className="w-20 h-20 rounded-2xl object-cover glow-border" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display text-gradient">MahaStudyPoint</CardTitle>
            <CardDescription className="text-muted-foreground">Engineering Made Easy</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "forgot" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Enter your email to receive a password reset link.</p>
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 border-border/50" required maxLength={255} />
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">Back to Sign In</button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-muted/50 border-border/50" maxLength={100} />
                )}
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 border-border/50" required maxLength={255} />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 border-border/50" required minLength={6} />
                {mode === "login" && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">Forgot Password?</button>
                  </div>
                )}
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary hover:underline font-medium">
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
