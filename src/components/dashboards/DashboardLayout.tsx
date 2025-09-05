// components/dashboards/DashboardLayout.tsx
import React from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/truck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Clock, ArrowLeft, ArrowRight, Home, Map } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import KnowledgeDrawer from "@/components/KnowledgeDrawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardLayoutProps {
  title: string;
  user: { role: UserRole; name: string };
  onLogout: () => void;
  children: React.ReactNode;
}

const roleBadgeClass: Record<UserRole, string> = {
  manager: "bg-blue-50 text-blue-700 border-blue-200",
  client: "bg-emerald-50 text-emerald-700 border-emerald-200",
  operator: "bg-amber-50 text-amber-700 border-amber-200",
  driver: "bg-gray-100 text-gray-800 border-gray-300",
};

const roleTitle: Record<UserRole, string> = {
  manager: "Fleet Manager",
  client: "Client",
  operator: "Operator",
  driver: "Driver",
};

const DASHBOARD_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/manager", label: "Manager" },
  { path: "/client", label: "Client" },
  { path: "/operator", label: "Operator" },
  { path: "/driver", label: "Driver" },
];

const DashboardLayout = ({ title, user, onLogout, children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [canGoBack, setCanGoBack] = React.useState(false);
  const [canGoForward, setCanGoForward] = React.useState(false);
  const maxIdxRef = React.useRef(0);

  React.useEffect(() => {
    const idx =
      window.history.state && typeof window.history.state.idx === "number"
        ? (window.history.state.idx as number)
        : 0;
    setCanGoBack(idx > 0);
    if (idx > maxIdxRef.current) maxIdxRef.current = idx;
    setCanGoForward(idx < maxIdxRef.current);
  }, [location]);

  const badgeClasses = roleBadgeClass[user.role] ?? "bg-gray-100 text-gray-800 border-gray-300";

  const handleLogout = () => {
    try {
      onLogout?.();
    } finally {
      navigate("/"); // always land on login
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-sky-100 selection:text-sky-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-gray-900 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back/Forward/Home + title */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Back" onClick={() => navigate(-1)} disabled={!canGoBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Forward" onClick={() => navigate(1)} disabled={!canGoForward}>
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Home as a real <a> so router handles it */}
              <Button variant="outline" size="icon" asChild>
                <Link to="/" aria-label="Home">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>

              <div className="ml-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={badgeClasses}>
                    {roleTitle[user.role] ?? "User"}
                  </Badge>
                  <span className="text-gray-500">•</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="h-3 w-3" />
                    {user.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: tabs + mobile select + tools */}
            <div className="flex items-center gap-3">
              {/* Desktop tabs as real links inside shadcn Button via asChild */}
              <nav className="hidden lg:flex items-center gap-1 rounded-md border border-gray-200 p-1 bg-white">
                {DASHBOARD_ROUTES.map((r) => {
                  const active = location.pathname === r.path || (r.path === "/driver" && location.pathname.startsWith("/driver"));
                  return (
                    <Button
                      key={r.path}
                      asChild
                      size="sm"
                      variant={active ? "default" : "ghost"}
                      className={active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}
                    >
                      <NavLink to={r.path}>{r.label}</NavLink>
                    </Button>
                  );
                })}
              </nav>

              {/* Mobile quick-select */}
              <div className="flex lg:hidden items-center gap-2">
                <Map className="h-4 w-4 text-gray-500" />
                <Select
                  value={DASHBOARD_ROUTES.find((r) => location.pathname === r.path || (r.path === "/driver" && location.pathname.startsWith("/driver")))?.path ?? ""}
                  onValueChange={(val) => navigate(val)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Go to page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DASHBOARD_ROUTES.map((r) => (
                      <SelectItem key={r.path} value={r.path}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clock */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <time suppressHydrationWarning>
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>

              <NotificationBell />
              <KnowledgeDrawer />

              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="container mx-auto px-6 py-8 space-y-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
