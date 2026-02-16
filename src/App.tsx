import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import FolderView from "./pages/FolderView";
import ContentViewer from "./pages/ContentViewer";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminTokens from "./pages/admin/AdminTokens";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/courses/:courseId/folder/:folderId" element={<FolderView />} />
              <Route path="/content/:id" element={<ContentViewer />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/tokens" element={<AdminTokens />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/enrollments" element={<AdminEnrollments />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
