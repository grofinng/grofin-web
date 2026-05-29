import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-copy">
          <img src="/esena-favicon.jpeg" alt="Esena Africa" className="footer-mark" />
          <span>© {new Date().getFullYear()} Esena Africa. Lagos, Nigeria.</span>
        </div>
        <div className="footer-links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/partner-terms">Partner Terms</Link>
        </div>
      </div>
    </footer>
  );
}
