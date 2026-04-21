import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageMeta from '../../components/common/PageMeta';
import AOS          from '../../components/landing/AOS';
import Navbar       from '../../components/landing/NavBar';
import Hero         from '../../components/landing/Hero';
import Stats        from '../../components/landing/Stats';
import About        from '../../components/landing/About';
import Mission      from '../../components/landing/Mission';
import Services     from '../../components/landing/Services';
import HowItWorks   from '../../components/landing/HowItWorks';
import Testimonials from '../../components/landing/Testimonials';
import Contact      from '../../components/landing/Contact';
import Footer       from '../../components/landing/Footer';
import baseCss from '../../styles/landing/base.css?inline';
import layoutCss from '../../styles/landing/layout.css?inline';
import componentsCss from '../../styles/landing/components.css?inline';
import animationsCss from '../../styles/landing/animations.css?inline';
import responsiveCss from '../../styles/landing/responsive.css?inline';

const adaptCssForShadowRoot = (css: string) => css
  .replace(/:root/g, ':host')
  .replace(/\bhtml\b/g, ':host')
  .replace(/\bbody\b/g, ':host');

const landingCss = [
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Lato:wght@400;700&display=swap');",
  ':host { display: block; }',
  adaptCssForShadowRoot(baseCss),
  adaptCssForShadowRoot(layoutCss),
  adaptCssForShadowRoot(componentsCss),
  adaptCssForShadowRoot(animationsCss),
  adaptCssForShadowRoot(responsiveCss),
].join('\n');

export default function LandingPage() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    if (!host || shadowRoot) {
      return;
    }

    setShadowRoot(host.attachShadow({ mode: 'open' }));
  }, [host, shadowRoot]);

  return (
    <>
      <PageMeta
        title="AgriNova Landing Page | TailAdmin"
        description="AgriNova marketing landing page integrated alongside the admin dashboard."
      />
      <div ref={setHost} className="min-h-screen" />
      {shadowRoot
        ? createPortal(
            <>
              <style>{landingCss}</style>
              <AOS root={shadowRoot} />
              <div>
                <Navbar />
                <main>
                  <Hero />
                  <Stats />
                  <About />
                  <Mission />
                  <Services />
                  <HowItWorks />
                  <Testimonials />
                  <Contact />
                </main>
                <Footer />
              </div>
            </>,
            shadowRoot,
          )
        : null}
    </>
  );
}
