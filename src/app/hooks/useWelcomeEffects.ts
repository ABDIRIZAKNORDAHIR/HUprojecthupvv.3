import { useEffect, useState, useCallback, useRef } from 'react';

/** Scroll progress + nav state + intersection reveal for homepage */
export function useWelcomeEffects() {
  const [scrolled, setScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (y / max) * 100 : 0;
      document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
      setScrolled(y > 24);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const registerReveal = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
    }
    observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    const fallback = window.setTimeout(() => {
      document.querySelectorAll('.reveal-section--animate').forEach((el) => {
        el.classList.add('is-visible');
      });
    }, 2500);
    return () => {
      window.clearTimeout(fallback);
      observerRef.current?.disconnect();
    };
  }, []);

  return { scrolled, registerReveal };
}
