import { useEffect } from 'react';

type AOSProps = {
  root?: Document | ShadowRoot;
};

export default function AOS({ root }: AOSProps) {
  useEffect(() => {
    const scope = root ?? document;
    const qs = <T extends Element = Element>(sel: string, ctx: ParentNode = scope) => ctx.querySelector<T>(sel);
    const qsa = <T extends Element = Element>(sel: string, ctx: ParentNode = scope) => Array.from(ctx.querySelectorAll<T>(sel));

    const cleanups: Array<() => void> = [];

    const closeMobileMenu = () => {
      qs<HTMLElement>('#hamburger')?.classList.remove('open');
      qs<HTMLElement>('#mobileMenu')?.classList.remove('open');
      document.body.style.overflow = '';
    };

    const clickHandler = (e: Event) => {
      const target = e.target as Element | null;

      const scrollTrigger = target?.closest('[data-scroll-to]') as HTMLElement | null;
      if (scrollTrigger) {
        e.preventDefault();
        const id = scrollTrigger.dataset.scrollTo;
        if (!id) return;
        const section = qs<HTMLElement>(`#${id}`);
        section?.scrollIntoView({ behavior: 'smooth' });
        closeMobileMenu();
        return;
      }

      const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      const id = href.replace(/^#/, '').trim();
      if (!id) return;

      let section = qs<HTMLElement>(`#${id}`);
      if (!section && id === 'how') {
        section = qs<HTMLElement>('#team');
      }
      if (!section) return;

      e.preventDefault();
      section.scrollIntoView({ behavior: 'smooth' });
      closeMobileMenu();
    };
    scope.addEventListener('click', clickHandler);
    cleanups.push(() => scope.removeEventListener('click', clickHandler));

    const navLinks = qsa<HTMLAnchorElement>('.nav-link[href^="#"]');
    const sectionIds = Array.from(
      new Set(
        navLinks
          .map((a) => (a.getAttribute('href') || '').replace(/^#/, '').trim())
          .filter(Boolean)
          .map((id) => (id === 'how' ? 'team' : id)),
      ),
    );
    const onScroll = () => {
      const scrollMarker = window.scrollY + 140;
      let current = sectionIds[0] || '';

      sectionIds.forEach((id) => {
        const el = qs<HTMLElement>(`#${id}`);
        if (!el) return;
        const top = window.scrollY + el.getBoundingClientRect().top;
        if (scrollMarker >= top) current = id;
      });

      navLinks.forEach((a) => {
        const hrefId = (a.getAttribute('href') || '').replace(/^#/, '').trim();
        const normalizedHref = hrefId === 'how' ? 'team' : hrefId;
        a.classList.toggle('active', normalizedHref === current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    const s1 = qs<HTMLElement>('#heroSlide1');
    const s2 = qs<HTMLElement>('#heroSlide2');
    const d1 = qs<HTMLElement>('#dot1');
    const d2 = qs<HTMLElement>('#dot2');
    let heroTimer: ReturnType<typeof setInterval> | undefined;
    if (s1 && s2) {
      // CSS keyframe animations handle the crossfade & Ken Burns.
      // JS only updates the dot indicators in sync with the 10s cycle.
      const CYCLE = 10000;
      let cycleStart = performance.now();

      const updateDots = () => {
        const phase = (performance.now() - cycleStart) % CYCLE;
        const showSlide2 = phase >= 5000;
        d1?.classList.toggle('active', !showSlide2);
        d2?.classList.toggle('active', showSlide2);
      };

      // Restart CSS animations so they begin at the chosen slide
      const jumpToSlide = (n: number) => {
        const fd = n === 1 ? '0s' : '-5s';
        const kb1 = n === 1 ? '0s' : '-10s';
        const kb2 = n === 1 ? '-10s' : '0s';
        s1.style.animation = 'none';
        s2.style.animation = 'none';
        void s1.offsetWidth; // force reflow
        s1.style.animation = '';
        s2.style.animation = '';
        s1.style.animationDelay = `${fd}, ${kb1}`;
        s2.style.animationDelay = `0s, ${kb2}`;
        cycleStart = performance.now() - (n === 1 ? 0 : 5000);
        updateDots();
      };

      // Keep dots in sync every 250 ms
      updateDots();
      heroTimer = setInterval(updateDots, 250);

      const onDot1 = () => { jumpToSlide(1); };
      const onDot2 = () => { jumpToSlide(2); };
      d1?.addEventListener('click', onDot1);
      d2?.addEventListener('click', onDot2);
      cleanups.push(() => {
        if (heroTimer) clearInterval(heroTimer);
        d1?.removeEventListener('click', onDot1);
        d2?.removeEventListener('click', onDot2);
      });
    }

    const counters = qsa<HTMLElement>('.stat-val[data-target]');
    let counterObserver: IntersectionObserver | undefined;
    if (counters.length) {
      let started = false;
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.5);

      const animateCounter = (el: HTMLElement) => {
        const target = parseInt(el.dataset.target || '0', 10);
        const suffix = el.dataset.suffix || '';
        const special = el.dataset.special || null;
        const duration = Math.min(400 + target * 3, 1800);
        let startTime: number | null = null;

        const step = (ts: number) => {
          if (!startTime) startTime = ts;
          const progress = Math.min((ts - startTime) / duration, 1);
          const eased = easeOut(progress);

          el.textContent = special
            ? (progress >= 1 ? special : `${Math.floor(eased * 24)}/7`)
            : `${Math.floor(eased * target)}${suffix}`;

          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = special || `${target}${suffix}`;
        };

        requestAnimationFrame(step);
      };

      const runAll = () => {
        if (started) return;
        started = true;
        counters.forEach(animateCounter);
      };

      const section = qs<HTMLElement>('#stats');
      if (section) {
        counterObserver = new IntersectionObserver((entries) => {
          if (entries[0]?.isIntersecting) {
            runAll();
            counterObserver?.disconnect();
          }
        }, { threshold: 0.3 });
        counterObserver.observe(section);
      } else {
        runAll();
      }
      cleanups.push(() => counterObserver?.disconnect());
    }

    const cards = qsa<HTMLElement>('.fb-card');
    const dots = qsa<HTMLElement>('.fb-dot');
    const progress = qs<HTMLElement>('#fbProgress');
    let feedbackTimer: ReturnType<typeof setInterval> | undefined;
    if (cards.length) {
      let current = 0;
      const startProgress = () => {
        if (!progress) return;
        progress.classList.remove('running');
        void progress.offsetWidth;
        progress.classList.add('running');
      };

      const goTo = (n: number) => {
        cards[current]?.classList.remove('active');
        dots[current]?.classList.remove('active');
        current = (n + cards.length) % cards.length;
        cards[current]?.classList.add('active');
        dots[current]?.classList.add('active');
        startProgress();
      };

      const startTimer = () => {
        if (feedbackTimer) clearInterval(feedbackTimer);
        feedbackTimer = setInterval(() => goTo(current + 1), 5000);
      };

      const dotHandlers = dots.map((dot, i) => {
        const handler = () => {
          if (i !== current) {
            goTo(i);
            startTimer();
          }
        };
        dot.addEventListener('click', handler);
        return { dot, handler };
      });

      goTo(0);
      startTimer();

      cleanups.push(() => {
        if (feedbackTimer) clearInterval(feedbackTimer);
        dotHandlers.forEach(({ dot, handler }) => dot.removeEventListener('click', handler));
      });
    }

    const animated = [
      '[data-aos]',
      '.service-card', '.team-card', '.how-step', '.stat-item',
      '.section-title', '.hero-title', '.how-title', '.fb-title',
      '.mission-title', '.img-tile', '.contact-subscribe-img',
    ].join(', ');
    const aosElements = qsa<HTMLElement>(animated);
    const aosObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        let delay = parseInt(el.dataset.aosDelay || '0', 10);
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter(c => c.classList[0] === el.classList[0])
          : [];
        const idx = siblings.indexOf(el);
        if (idx > 0) delay += idx * 120;
        setTimeout(() => el.classList.add('aos-visible'), delay);
        aosObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    aosElements.forEach((el) => aosObserver.observe(el));
    cleanups.push(() => aosObserver.disconnect());

    const hamburger = qs<HTMLElement>('#hamburger');
    const mobileMenu = qs<HTMLElement>('#mobileMenu');

    const onHamburger = (e: Event) => {
      e.stopPropagation();
      if (!mobileMenu || !hamburger) return;
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };
    hamburger?.addEventListener('click', onHamburger);

    const outsideClick = (e: Event) => {
      const target = e.target as Node | null;
      if (!mobileMenu || !target) return;
      if (!mobileMenu.contains(target) && target !== hamburger && !hamburger?.contains(target as Node)) {
        closeMobileMenu();
      }
    };
    scope.addEventListener('click', outsideClick);

    const mobileLinks = qsa<HTMLAnchorElement>('a', mobileMenu || scope);
    const closeHandlers = mobileLinks.map((link) => {
      const handler = () => closeMobileMenu();
      link.addEventListener('click', handler);
      return { link, handler };
    });

    cleanups.push(() => {
      hamburger?.removeEventListener('click', onHamburger);
      scope.removeEventListener('click', outsideClick);
      closeHandlers.forEach(({ link, handler }) => link.removeEventListener('click', handler));
    });

    const formBtn = qs<HTMLButtonElement>('.form-btn');
    if (formBtn) {
      const onFormBtn = () => {
        const original = formBtn.textContent;
        formBtn.textContent = '✅ Message Sent!';
        formBtn.disabled = true;
        window.setTimeout(() => {
          formBtn.textContent = original;
          formBtn.disabled = false;
        }, 3000);
      };
      formBtn.addEventListener('click', onFormBtn);
      cleanups.push(() => formBtn.removeEventListener('click', onFormBtn));
    }

    cleanups.push(() => {
      document.body.style.overflow = '';
    });

    return () => cleanups.forEach((fn) => fn());
  }, [root]);

  return null;
}
