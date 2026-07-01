import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logoImg from '@/assets/logo.png';
import {
  LogOut, LayoutDashboard, Menu, X, Shield, ChevronDown,
  Home, MapPin, Building2, Users, Info, Phone, FileText, Lock
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMenuOpen(false);
  };

  const dashboardPath =
    role === 'house_manager' ? '/dashboard/manager' :
    role === 'super_admin' ? '/dashboard/super-admin' :
    '/dashboard/tenant';

  const dashboardLabel =
    role === 'house_manager' ? 'Manager Dashboard' :
    role === 'super_admin' ? 'Super Admin' :
    'My Dashboard';

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (propertiesRef.current && !propertiesRef.current.contains(e.target as Node)) setPropertiesOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setPropertiesOpen(false);
    setCompanyOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-card/98 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-16 px-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoImg} alt="Afodabo Housing" className="h-9 w-9 object-contain rounded-lg" />
          <div>
            <div className="font-display font-bold text-sm sm:text-base text-primary leading-tight">Afodabo Housing</div>
            <div className="hidden sm:block text-muted-foreground text-xs leading-tight">Uganda's Housing Platform</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">

          {/* Properties Dropdown */}
          <div ref={propertiesRef} className="relative">
            <button
              onClick={() => { setPropertiesOpen(!propertiesOpen); setCompanyOpen(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${propertiesOpen ? 'bg-secondary text-foreground' : 'text-foreground/80 hover:text-foreground hover:bg-secondary'}`}
            >
              <Home className="h-4 w-4" />
              Properties
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${propertiesOpen ? 'rotate-180' : ''}`} />
            </button>

            {propertiesOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-card border border-border rounded-2xl shadow-lg overflow-hidden py-2">
                <Link to="/properties" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <div className="bg-primary/10 text-primary rounded-lg p-1.5"><Building2 className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Browse All Properties</div>
                    <div className="text-xs text-muted-foreground">Verified listings across Uganda</div>
                  </div>
                </Link>
                <Link to="/properties?district=Kampala" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <div className="bg-accent/10 text-accent rounded-lg p-1.5"><MapPin className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Kampala</div>
                    <div className="text-xs text-muted-foreground">Capital city listings</div>
                  </div>
                </Link>
                <Link to="/properties?district=Wakiso" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <div className="bg-accent/10 text-accent rounded-lg p-1.5"><MapPin className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Wakiso</div>
                    <div className="text-xs text-muted-foreground">Entebbe, Kajjansi area</div>
                  </div>
                </Link>
                <Link to="/properties?district=Mbarara" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <div className="bg-accent/10 text-accent rounded-lg p-1.5"><MapPin className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Mbarara</div>
                    <div className="text-xs text-muted-foreground">Western Uganda</div>
                  </div>
                </Link>
                <div className="border-t border-border mt-2 pt-2 mx-2">
                  <Link to="/properties" className="block px-2 py-2 text-xs text-primary font-semibold hover:underline text-center">
                    View all districts
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Company Dropdown */}
          <div ref={companyRef} className="relative">
            <button
              onClick={() => { setCompanyOpen(!companyOpen); setPropertiesOpen(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${companyOpen ? 'bg-secondary text-foreground' : 'text-foreground/80 hover:text-foreground hover:bg-secondary'}`}
            >
              Company
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${companyOpen ? 'rotate-180' : ''}`} />
            </button>

            {companyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-card border border-border rounded-2xl shadow-lg overflow-hidden py-2">
                <Link to="/about" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">About Us</span>
                </Link>
                <Link to="/contact" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Contact Support</span>
                </Link>
                <Link to="/privacy" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Privacy Policy</span>
                </Link>
                <Link to="/terms" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Terms of Service</span>
                </Link>
              </div>
            )}
          </div>

          {/* Dashboard link */}
          {user && role !== 'super_admin' && (
            <Link
              to={dashboardPath}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(dashboardPath) ? 'bg-secondary text-foreground' : 'text-foreground/80 hover:text-foreground hover:bg-secondary'}`}
            >
              <Users className="h-4 w-4" />
              {dashboardLabel}
            </Link>
          )}

          {/* Super Admin link */}
          {role === 'super_admin' && (
            <Link
              to="/dashboard/super-admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Super Admin
            </Link>
          )}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2.5">
          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(dashboardPath)}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                {role === 'super_admin' ? 'Super Admin' : 'Dashboard'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-foreground rounded-lg hover:bg-secondary transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 py-4 flex flex-col gap-1">
          <Link to="/properties" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Building2 className="h-4 w-4 text-primary" />
            Browse Properties
          </Link>
          <Link to="/about" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Info className="h-4 w-4 text-primary" />
            About Us
          </Link>
          <Link to="/contact" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Phone className="h-4 w-4 text-primary" />
            Contact Support
          </Link>
          <Link to="/privacy" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Privacy Policy
          </Link>
          <Link to="/terms" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Terms of Service
          </Link>

          {user && (
            <Link to={dashboardPath} className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              {dashboardLabel}
            </Link>
          )}
          {role === 'super_admin' && (
            <Link to="/dashboard/super-admin" className="flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
              <Shield className="h-4 w-4" />
              Super Admin
            </Link>
          )}

          <div className="border-t border-border pt-3 mt-2 flex flex-col gap-2">
            {user ? (
              <Button variant="outline" size="sm" onClick={handleSignOut} className="justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => { navigate('/login'); setMenuOpen(false); }}>
                  Sign In
                </Button>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => { navigate('/register'); setMenuOpen(false); }}>
                  Get Started Free
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
