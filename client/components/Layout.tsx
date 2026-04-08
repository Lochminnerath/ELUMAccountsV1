import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart3, Apple, Zap, TrendingUp, Settings } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">AF Health Manager</span>
          </Link>

          <nav className="hidden gap-8 md:flex">
            <Link
              to="/dashboard"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/dashboard")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Dashboard
            </Link>
            <Link
              to="/foods"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/foods") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Foods
            </Link>
            <Link
              to="/exercises"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/exercises")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Exercises
            </Link>
            <Link
              to="/progress"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/progress")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Progress
            </Link>
            <Link
              to="/settings"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/settings")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Settings
            </Link>
          </nav>

          {/* Mobile menu button - placeholder */}
          <button className="md:hidden">
            <svg
              className="h-6 w-6 text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
