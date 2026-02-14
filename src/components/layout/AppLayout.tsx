import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "./BottomNav";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function AppLayout({ children, showNav = true }: AppLayoutProps) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen galaxy-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen galaxy-gradient">
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
