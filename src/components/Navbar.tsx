import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Auto-close the drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll + listen for Escape while drawer is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const navItems: ReactNode = user ? (
    <>
      {user.role === 'user' && (
        <>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/applications">My Applications</NavLink>
          <NavLink to="/apply">Apply</NavLink>
        </>
      )}
      {(user.role === 'admin' || user.role === 'manager') && (
        <NavLink to="/admin">{user.role === 'admin' ? 'Admin' : 'Review'}</NavLink>
      )}
      {user.role === 'admin' && (
        <>
          <NavLink to="/admin/vendors">Vendors</NavLink>
          <NavLink to="/admin/vendor-requests">Requests</NavLink>
          <NavLink to="/admin/stats">Stats</NavLink>
          <NavLink to="/admin/users">Team</NavLink>
        </>
      )}
      <NavLink to="/account">Account</NavLink>
      <span className="nav-greeting">Hi, {user.firstName}</span>
      <button type="button" className="btn btn-ghost" onClick={handleLogout}>
        Sign out
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login">Sign in</NavLink>
      <Link to="/signup" className="btn">
        Get started
      </Link>
      <Link to="/partner" className="btn btn-secondary">
        Partner with us
      </Link>
    </>
  );

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" aria-label="Esena Africa home">
            <Logo />
          </Link>

          <div className="navbar-links navbar-links-desktop">{navItems}</div>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="esena-sidebar"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="esena-sidebar"
        className={`sidebar${open ? ' open' : ''}`}
        aria-hidden={open ? 'false' : 'true'}
        aria-label="Main navigation"
      >
        <div className="sidebar-head">
          <Link to="/" aria-label="Esena Africa home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-links">{navItems}</div>
      </aside>
    </>
  );
}
