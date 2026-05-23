export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-copy">
          <img src="/esena-favicon.jpeg" alt="Esena Africa" className="footer-mark" />
          <span>© {new Date().getFullYear()} Esena Africa. Lagos, Nigeria.</span>
        </div>
        {/* <div>
          <a href="mailto:grofinng@gmail.com">grofinng@gmail.com</a>
        </div> */}
      </div>
    </footer>
  );
}
