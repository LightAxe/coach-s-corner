import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  Library, 
  Trophy,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Workouts', href: '/workouts', icon: Library },
  { name: 'Athletes', href: '/athletes', icon: Users },
  { name: 'PR Board', href: '/prs', icon: Trophy },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border lg:hidden">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">XC</span>
            </div>
            <span className="font-heading font-semibold text-lg">Training Hub</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="px-4 pb-4 space-y-1 animate-fade-in">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">XC</span>
            </div>
            <div>
              <h1 className="font-heading font-semibold text-base">Training Hub</h1>
              <p className="text-xs text-muted-foreground">Cross Country</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Current Season</p>
              <p className="text-sm font-semibold">Fall 2024</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
