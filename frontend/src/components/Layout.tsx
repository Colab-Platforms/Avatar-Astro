import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import BackButton from './BackButton';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  // The homepage alone uses the warm light theme (.home-light, see index.css).
  const isHome = useLocation().pathname === '/';

  // Keep overscroll / short pages from flashing the dark body colour on the homepage.
  useEffect(() => {
    document.body.classList.toggle('home-light-body', isHome);
    return () => document.body.classList.remove('home-light-body');
  }, [isHome]);

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isHome ? 'home-light' : 'bg-transparent'}`}>
      <div className="grain-overlay" />

      <div className="relative z-20">
        <Navbar />
        <BackButton />

        <main className="pt-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
