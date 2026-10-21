import { Suspense, lazy, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SectionSkeleton from '../components/SectionSkeleton';
import HeroSection from '../sections/HeroSection';

// Секции ниже первого экрана грузим отдельными чанками — быстрее первая отрисовка.
const CaptainsSection = lazy(() => import('../sections/CaptainsSection'));
const SquadSection = lazy(() => import('../sections/SquadSection'));
const StatsSection = lazy(() => import('../sections/StatsSection'));
const ContactsSection = lazy(() => import('../sections/ContactsSection'));

/** Прокручивает к секции, когда её id появится в DOM (секции подгружаются лениво). */
function scrollToSectionWhenReady(id: string, attempts = 40): () => void {
  let tries = 0;

  const tryScroll = () => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    tries += 1;
    if (tries < attempts) window.setTimeout(tryScroll, 100);
  };

  tryScroll();
  return () => undefined;
}

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    return scrollToSectionWhenReady(hash);
  }, [location.hash, location.key]);

  const goTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
