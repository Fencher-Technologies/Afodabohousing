import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logoImg from '@/assets/logo.png';
import { Home, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dashboardPath = role === 'house_manager' ? '/dashboard/manager' : '/dashboard/tenant';

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Afodabohousing" className="h-10 w-10 object-contain" />
          <span className="font-display font-bold text-xl text-primary hidden sm:block">
            Afodabohousing
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/properties" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Browse Properties
          </Link>
          {user && (
            <Link to={dashboardPath} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 py-4 flex flex-col gap-3">
          <Link to="/properties" className="text-sm font-medium py-2" onClick={() => setMenuOpen(false)}>
            Browse Properties
          </Link>
          {user ? (
            <>
              <Link to={dashboardPath} className="text-sm font-medium py-2" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={() => { handleSignOut(); setMenuOpen(false); }} className="justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { navigate('/login'); setMenuOpen(false); }}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => { navigate('/register'); setMenuOpen(false); }}>
                Get Started
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
