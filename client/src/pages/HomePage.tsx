import { Suspense, lazy, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SectionSkeleton from '../components/SectionSkeleton';
import HeroSection from '../sections/HeroSection';
import { scrollToSection } from '../utils/scrollToSection';

// Секции ниже первого экрана грузим отдельными чанками — быстрее первая отрисовка.
const CaptainsSection = lazy(() => import('../sections/CaptainsSection'));
const SquadSection = lazy(() => import('../sections/SquadSection'));
const StatsSection = lazy(() => import('../sections/StatsSection'));
const ContactsSection = lazy(() => import('../sections/ContactsSection'));

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    return scrollToSection(hash);
  }, [location.hash, location.key]);

  const goTo = useCallback((id: string) => {
    scrollToSection(id);
  }, []);

  return (
    <>
      <Header />
      <main>
        <HeroSection onNavigate={goTo} />
        <Suspense fallback={<SectionSkeleton height={460} />}>
          <CaptainsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height={720} />}>
          <SquadSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height={520} />}>
          <StatsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height={380} />}>
          <ContactsSection />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
