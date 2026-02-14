import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import StudentHome from "@/components/home/StudentHome";
import AdminHome from "@/components/home/AdminHome";
import TeacherHome from "@/components/home/TeacherHome";

export default function Index() {
  const { user, isAdmin, isTeacher } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      {isAdmin ? <AdminHome /> : isTeacher ? <TeacherHome /> : <StudentHome />}
    </AppLayout>
  );
}
