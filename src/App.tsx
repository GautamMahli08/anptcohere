// App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { UiScopeProvider } from "@/contexts/UiScopeContext";
import FSaaSApp from "@/components/FSaaSApp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UiScopeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FSaaSApp />
        </BrowserRouter>
      </TooltipProvider>
    </UiScopeProvider>
  </QueryClientProvider>
);

export default App;
