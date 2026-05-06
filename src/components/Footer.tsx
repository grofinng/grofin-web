export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>© {new Date().getFullYear()} GroFin. Lagos, Nigeria.</div>
        <div>
          <a href="mailto:grofinng@gmail.com">grofinng@gmail.com</a>
        </div>
      </div>
    </footer>
  );
}
