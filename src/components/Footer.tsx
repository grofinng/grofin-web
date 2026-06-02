import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-copy">
          <img src="/esena-favicon.jpeg" alt="Esena Africa" className="footer-mark" />
          <span>© {new Date().getFullYear()} Esena Africa. Lagos, Nigeria.</span>
        </div>
        {user && (
          <div className="footer-links">
            {user.role === 'user' && <Link to="/terms">Terms &amp; Conditions</Link>}
            {(user.role === 'admin' || user.role === 'manager') && (
              <>
                <Link to="/terms">Terms &amp; Conditions</Link>
                <Link to="/partner-terms">Partner Terms</Link>
              </>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
