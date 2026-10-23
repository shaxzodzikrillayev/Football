const RETRY_DELAY_MS = 80;
const MAX_ATTEMPTS = 60;

interface ScrollOptions {
  /** Обновить hash в адресной строке. */
  updateHash?: boolean;
  /** Сколько раз пробовать найти секцию (секции подгружаются лениво). */
  attempts?: number;
}

/**
 * Прокручивает к секции, даже если её ещё нет в DOM.
 *
 * Секции ниже первого экрана подключаются через React.lazy, поэтому сразу
 * после загрузки страницы элемента может не быть. Раньше клик по пункту меню
 * в такой ситуации просто ничего не делал — теперь ждём появления секции.
 */
export function scrollToSection(id: string, options: ScrollOptions = {}): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const { updateHash = true, attempts = MAX_ATTEMPTS } = options;
  let cancelled = false;
  let timer: number | undefined;
  let tries = 0;

  const tryScroll = () => {
    if (cancelled) return;

    const element = document.getElementById(id);
    if (element) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      if (updateHash && window.location.hash !== `#${id}`) {
        window.history.replaceState(null, '', `#${id}`);
      }
      return;
    }

    tries += 1;
    if (tries < attempts) {
      timer = window.setTimeout(tryScroll, RETRY_DELAY_MS);
    }
  };

  tryScroll();

  return () => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
