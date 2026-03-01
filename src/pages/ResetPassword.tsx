import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else { toast.success("Password updated! Redirecting..."); setTimeout(() => navigate("/"), 1500); }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen galaxy-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Invalid or expired reset link.</p>
            <Button className="mt-4" onClick={() => navigate("/auth")}>Back to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen galaxy-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card animate-fade-in">
        <CardHeader><CardTitle className="text-xl font-display text-center">Set New Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <Input type="password" placeholder="New Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 border-border/50" required minLength={8} />
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
