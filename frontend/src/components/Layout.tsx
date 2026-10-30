import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import BackButton from './BackButton';

interface LayoutProps {
  children: ReactNode;
}

// Routes that are a full-screen app with their own chrome (sidebar, back link). The site navbar and
// footer are simply not rendered there. This is decided by the route, so nothing has to be hidden and
// later restored, and the navbar can never be left hidden when the user returns to another page.
const CHROMELESS_ROUTES = ['/inner-voice/chat'];

const Layout = ({ children }: LayoutProps) => {
  const { pathname } = useLocation();
  const chromeless = CHROMELESS_ROUTES.includes(pathname);

  // The MyBhagya light theme (.home-light, see index.css) applies to every route.
  // Keep overscroll / short pages from flashing a different body colour.
  useEffect(() => {
    document.body.classList.add('home-light-body');
    return () => document.body.classList.remove('home-light-body');
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden home-light">
      <div className="grain-overlay" />

      <div className="relative z-20">
        {!chromeless && <Navbar />}
        <BackButton />

        <main className="pt-8">
          {children}
        </main>

        {!chromeless && <Footer />}
      </div>
    </div>
  );
};

export default Layout;
