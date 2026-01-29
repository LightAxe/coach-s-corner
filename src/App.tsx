import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Workouts from "./pages/Workouts";
import Athletes from "./pages/Athletes";
import PRBoard from "./pages/PRBoard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Auth required, no team required */}
              <Route path="/create-team" element={
                <ProtectedRoute>
                  <CreateTeam />
                </ProtectedRoute>
              } />
              <Route path="/join-team" element={
                <ProtectedRoute>
                  <JoinTeam />
                </ProtectedRoute>
              } />
              
              {/* Auth + Team required */}
              <Route path="/" element={
                <ProtectedRoute requireTeam>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute requireTeam>
                  <Calendar />
                </ProtectedRoute>
              } />
              <Route path="/workouts" element={
                <ProtectedRoute requireTeam>
                  <Workouts />
                </ProtectedRoute>
              } />
              <Route path="/athletes" element={
                <ProtectedRoute requireTeam>
                  <Athletes />
                </ProtectedRoute>
              } />
              <Route path="/prs" element={
                <ProtectedRoute requireTeam>
                  <PRBoard />
                </ProtectedRoute>
              } />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
