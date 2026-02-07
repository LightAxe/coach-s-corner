import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import Privacy from "./pages/Privacy";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import LinkChild from "./pages/LinkChild";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Athletes from "./pages/Athletes";
import AthleteDetail from "./pages/AthleteDetail";
import Records from "./pages/Records";
import TrainingJournal from "./pages/TrainingJournal";
import TeamSettings from "./pages/TeamSettings";
import AccountSettings from "./pages/AccountSettings";
import ParentAccess from "./pages/ParentAccess";
import Attendance from "./pages/Attendance";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LandingOrDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Landing />;

  return (
    <ProtectedRoute requireTeam>
      <Dashboard />
    </ProtectedRoute>
  );
}

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
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/privacy" element={<Privacy />} />
              
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
              <Route path="/link-child" element={
                <ProtectedRoute>
                  <LinkChild />
                </ProtectedRoute>
              } />
              <Route path="/account-settings" element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } />

              {/* Auth + Team required */}
              <Route path="/" element={<LandingOrDashboard />} />
              <Route path="/calendar" element={
                <ProtectedRoute requireTeam>
                  <Calendar />
                </ProtectedRoute>
              } />
              <Route path="/athletes" element={
                <ProtectedRoute requireTeam>
                  <Athletes />
                </ProtectedRoute>
              } />
              <Route path="/athletes/:id" element={
                <ProtectedRoute requireTeam>
                  <AthleteDetail />
                </ProtectedRoute>
              } />
              <Route path="/records" element={
                <ProtectedRoute requireTeam>
                  <Records />
                </ProtectedRoute>
              } />
              <Route path="/journal" element={
                <ProtectedRoute requireTeam>
                  <TrainingJournal />
                </ProtectedRoute>
              } />
              <Route path="/parent-access" element={
                <ProtectedRoute requireTeam>
                  <ParentAccess />
                </ProtectedRoute>
              } />
              <Route path="/attendance" element={
                <ProtectedRoute requireTeam>
                  <Attendance />
                </ProtectedRoute>
              } />
              <Route path="/audit-log" element={
                <ProtectedRoute requireTeam>
                  <AuditLog />
                </ProtectedRoute>
              } />
              <Route path="/team-settings" element={
                <ProtectedRoute requireTeam>
                  <TeamSettings />
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
