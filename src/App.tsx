import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Apply from "./pages/Apply";
import CandidateDetails from "./pages/CandidateDetails";
import ClientShortlist from "./pages/ClientShortlist";
import Finance from "./pages/Finance";
import JobsPublic from "./pages/JobsPublic";
import JobPublicDetails from "./pages/JobPublicDetails";
import JobsAdmin from "./pages/JobsAdmin";
import Settings from "./pages/Settings";
import { SessionProvider } from "@/auth/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SessionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/vagas" element={<JobsPublic />} />
              <Route path="/vagas/:jobId" element={<JobPublicDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/vagas" element={<JobsAdmin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/finance" element={<Finance />} />
              <Route
                path="/candidates/:candidateId"
                element={<CandidateDetails />}
              />
              <Route path="/apply/:jobId" element={<Apply />} />
              <Route path="/client/:token" element={<ClientShortlist />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;