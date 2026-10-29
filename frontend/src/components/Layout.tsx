import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BackButton from './BackButton';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
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
