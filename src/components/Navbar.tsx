import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" aria-label="Esena Africa home">
          <Logo />
        </Link>
        <div className="navbar-links">
          {user ? (
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
                  <NavLink to="/admin/users">Team</NavLink>
                </>
              )}
              <NavLink to="/account">Account</NavLink>
              <span style={{ color: 'var(--gf-muted)', fontSize: '0.9rem' }}>
                Hi, {user.firstName}
              </span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <Link to="/signup" className="btn">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
