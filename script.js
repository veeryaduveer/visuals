/* =====================================================================
   APEX WAR CUP — Free Fire Max Battle Royale Tournament
   Main JavaScript
   --------------------------------------------------------------------
   TABLE OF CONTENTS
   1.  Utilities
   2.  Preloader
   3.  Particle Background (Canvas)
   4.  Custom Cursor
   5.  Navbar Scroll State + Mobile Menu
   6.  Smooth Scroll Navigation
   7.  Active Section Highlighting (IntersectionObserver)
   8.  Reveal-on-scroll Animations
   9.  Hero Counters
   10. Game Card Magnetic Hover Glow
   11. Tilt-on-Hover for Cards
   12. Back-to-Top Button
   13. Footer Year
   14. Glitch Title Sync
   15. Init
   ===================================================================== */

(function () {
    'use strict';

    /* =================================================================
       1. UTILITIES
       ================================================================= */

    const qs  = (sel, scope = document) => scope.querySelector(sel);
    const qsa = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

    const on = (el, ev, cb, opts) => el && el.addEventListener(ev, cb, opts);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const lerp  = (a, b, n) => (1 - n) * a + n * b;

    const isTouchDevice = () =>
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    const prefersReducedMotion = () =>
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const debounce = (fn, wait) => {
        let t;
        return function debounced (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    };

    const rafThrottle = (fn) => {
        let ticking = false;
        return function (...args) {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                fn.apply(this, args);
                ticking = false;
            });
        };
    };


    /* =================================================================
       2. PRELOADER
       ================================================================= */

    function initPreloader () {
        const el     = qs('#preloader');
        const fill   = qs('#preloaderFill');
        const status = qs('#preloaderStatus');
        if (!el) return;

        let pct = 0;
        const tick = () => {
            // Random-ish increment that slows as it approaches 100
            const remaining = 100 - pct;
            const inc = Math.max(0.6, remaining * 0.08 * Math.random());
            pct = Math.min(100, pct + inc);
            if (fill)   fill.style.width = pct.toFixed(1) + '%';
            if (status) status.textContent = `Booting Battle Servers… ${Math.floor(pct)}%`;

            if (pct < 100) {
                setTimeout(tick, 80 + Math.random() * 120);
            } else {
                setTimeout(() => {
                    el.classList.add('is-hidden');
                    document.body.classList.add('is-loaded');
                }, 400);
            }
        };

        // Kick off after a tiny delay so the user sees the start state
        setTimeout(tick, 200);
    }


    /* =================================================================
       3. PARTICLE BACKGROUND (Canvas)
       ================================================================= */

    function initParticles () {
        const canvas = qs('#particles');
        if (!canvas) return;
        if (prefersReducedMotion()) return;

        const ctx = canvas.getContext('2d');
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width  = 0;
        let height = 0;

        // Particle pool sized by viewport
        let particles = [];
        let connectionDistance = 110;

        const palette = [
            'rgba(0, 240, 255, 1)',
            'rgba(255, 0, 212, 1)',
            'rgba(138, 43, 255, 1)',
            'rgba(182, 255, 0, 0.8)'
        ];

        function resize () {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width  = window.innerWidth;
            height = window.innerHeight;

            canvas.width  = width  * dpr;
            canvas.height = height * dpr;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            const area = width * height;
            // ~1 particle per ~14k px, capped
            const target = clamp(Math.round(area / 14000), 30, 110);
            connectionDistance = width < 700 ? 80 : 110;

            // Adjust particle count
            if (particles.length < target) {
                while (particles.length < target) particles.push(makeParticle());
            } else if (particles.length > target) {
                particles.length = target;
            }
        }

        function makeParticle () {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.6 + 0.6,
                color: palette[Math.floor(Math.random() * palette.length)],
                pulse: Math.random() * Math.PI * 2
            };
        }

        // Mouse repulsion
        const mouse = { x: -9999, y: -9999, active: false };
        on(window, 'mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        });
        on(window, 'mouseleave', () => { mouse.active = false; });

        function step () {
            ctx.clearRect(0, 0, width, height);

            // Update + draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Mouse repulsion
                if (mouse.active) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < 140 * 140) {
                        const dist = Math.sqrt(dist2) || 1;
                        const force = (140 - dist) / 140;
                        p.vx += (dx / dist) * force * 0.18;
                        p.vy += (dy / dist) * force * 0.18;
                    }
                }

                // Gentle damping toward base velocity
                p.vx *= 0.985;
                p.vy *= 0.985;

                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.04;

                // Wrap edges
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;

                // Draw with subtle radial pulse
                const radius = p.r + Math.sin(p.pulse) * 0.4;

                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Draw connecting lines
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        const alpha = 1 - dist / connectionDistance;
                        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.18})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(step);
        }

        resize();
        on(window, 'resize', debounce(resize, 200));
        step();
    }


    /* =================================================================
       4. CUSTOM CURSOR
       ================================================================= */

    function initCursor () {
        if (isTouchDevice()) {
            document.body.classList.add('no-custom-cursor');
            const dot  = qs('#cursorDot');
            const ring = qs('#cursorRing');
            if (dot)  dot.style.display  = 'none';
            if (ring) ring.style.display = 'none';
            return;
        }

        const dot  = qs('#cursorDot');
        const ring = qs('#cursorRing');
        if (!dot || !ring) return;

        const dotPos  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const ringPos = { x: dotPos.x, y: dotPos.y };
        const target  = { x: dotPos.x, y: dotPos.y };

        on(window, 'mousemove', (e) => {
            target.x = e.clientX;
            target.y = e.clientY;
        });

        function loop () {
            // Dot tracks instantly
            dotPos.x = lerp(dotPos.x, target.x, 0.4);
            dotPos.y = lerp(dotPos.y, target.y, 0.4);
            // Ring follows with delay
            ringPos.x = lerp(ringPos.x, target.x, 0.16);
            ringPos.y = lerp(ringPos.y, target.y, 0.16);

            dot.style.transform  = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0) translate(-50%, -50%)`;
            ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(loop);
        }
        loop();

        // Hover-state grow
        const hoverable = 'a, button, .liquid-btn, .game-card, .rule-card, .navbar__link, .footer__nav-link';
        on(document.body, 'mouseover', (e) => {
            if (e.target.closest(hoverable)) {
                document.body.classList.add('cursor-hovering');
            }
        });
        on(document.body, 'mouseout', (e) => {
            if (e.target.closest(hoverable)) {
                document.body.classList.remove('cursor-hovering');
            }
        });
    }


    /* =================================================================
       5. NAVBAR SCROLL STATE + MOBILE MENU
       ================================================================= */

    function initNavbar () {
        const navbar = qs('#navbar');
        const toggle = qs('#navbarToggle');
        const nav    = qs('#navbarNav');
        if (!navbar) return;

        const handleScroll = rafThrottle(() => {
            if (window.scrollY > 30) {
                navbar.classList.add('is-scrolled');
            } else {
                navbar.classList.remove('is-scrolled');
            }
        });

        handleScroll();
        on(window, 'scroll', handleScroll, { passive: true });

        // Mobile menu toggle
        if (toggle && nav) {
            on(toggle, 'click', () => {
                const open = nav.classList.toggle('is-open');
                toggle.classList.toggle('is-open', open);
                toggle.setAttribute('aria-expanded', String(open));
            });

            // Close menu on link click
            qsa('a', nav).forEach((link) => {
                on(link, 'click', () => {
                    nav.classList.remove('is-open');
                    toggle.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                });
            });

            // Close on outside click
            on(document, 'click', (e) => {
                if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                    nav.classList.remove('is-open');
                    toggle.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }


    /* =================================================================
       6. SMOOTH SCROLL NAVIGATION
       ================================================================= */

    function initSmoothScroll () {
        const links = qsa('[data-scroll]');
        const navHeight = () => {
            const nav = qs('#navbar');
            return nav ? nav.offsetHeight : 70;
        };

        links.forEach((link) => {
            on(link, 'click', (e) => {
                const href = link.getAttribute('href') || '';
                if (!href.startsWith('#')) return;
                const target = qs(href);
                if (!target) return;

                e.preventDefault();
                const offset = target.getBoundingClientRect().top + window.scrollY - navHeight() + 4;
                window.scrollTo({
                    top: offset,
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
                });
            });
        });
    }


    /* =================================================================
       7. ACTIVE SECTION HIGHLIGHTING
       ================================================================= */

    function initActiveNav () {
        const sections = ['#home', '#tournament', '#rules', '#register']
            .map((id) => qs(id))
            .filter(Boolean);

        const navLinks = qsa('[data-nav-link]');
        if (!sections.length || !navLinks.length) return;

        const setActive = (id) => {
            navLinks.forEach((link) => {
                const href = link.getAttribute('href');
                link.classList.toggle('is-active', href === id);
            });
        };

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the entry most in view
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible[0]) {
                    setActive('#' + visible[0].target.id);
                }
            },
            {
                rootMargin: '-40% 0px -50% 0px',
                threshold: [0, 0.25, 0.5, 0.75, 1]
            }
        );

        sections.forEach((s) => observer.observe(s));
    }


    /* =================================================================
       8. REVEAL-ON-SCROLL ANIMATIONS
       ================================================================= */

    function initReveal () {
        const items = qsa('[data-reveal]');
        if (!items.length) return;

        if (prefersReducedMotion()) {
            items.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        // Stagger siblings inside same parent
        const groups = new Map();
        items.forEach((item) => {
            const key = item.parentElement;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        });

        groups.forEach((arr) => {
            arr.forEach((el, i) => {
                el.style.transitionDelay = `${Math.min(i * 80, 400)}ms`;
            });
        });

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
        );

        items.forEach((el) => observer.observe(el));
    }


    /* =================================================================
       9. HERO STAT COUNTERS
       ================================================================= */

    function initCounters () {
        const counters = qsa('[data-counter]');
        if (!counters.length) return;

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animate = (el) => {
            const target = parseFloat(el.getAttribute('data-counter')) || 0;
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 1600;
            const start = performance.now();

            function tick (now) {
                const t = Math.min((now - start) / duration, 1);
                const value = Math.round(target * easeOutCubic(t));
                el.textContent = value + suffix;
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = target + suffix;
            }
            requestAnimationFrame(tick);
        };

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animate(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.4 }
        );
        counters.forEach((c) => observer.observe(c));
    }


    /* =================================================================
       10. GAME CARD MAGNETIC HOVER GLOW
       ================================================================= */

    function initCardGlow () {
        const cards = qsa('.game-card');
        cards.forEach((card) => {
            on(card, 'mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--x', x + '%');
                card.style.setProperty('--y', y + '%');
            });
            on(card, 'mouseleave', () => {
                card.style.setProperty('--x', '50%');
                card.style.setProperty('--y', '50%');
            });
        });
    }


    /* =================================================================
       11. TILT-ON-HOVER FOR CARDS
       ================================================================= */

    function initTilt () {
        if (isTouchDevice()) return;

        const tiltable = qsa('.game-card, .rule-card, .register-panel');

        tiltable.forEach((el) => {
            const max = el.classList.contains('register-panel') ? 4 : 6;
            let raf = null;

            const handleMove = (e) => {
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top  + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);

                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => {
                    const rotX = clamp(-dy * max, -max, max);
                    const rotY = clamp( dx * max, -max, max);
                    el.style.transform =
                        `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
                });
            };

            const reset = () => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => {
                    el.style.transform = '';
                });
            };

            on(el, 'mousemove', handleMove);
            on(el, 'mouseleave', reset);
        });
    }


    /* =================================================================
       12. BACK-TO-TOP BUTTON
       ================================================================= */

    function initBackToTop () {
        const btn = qs('#backToTop');
        if (!btn) return;

        const onScroll = rafThrottle(() => {
            if (window.scrollY > window.innerHeight * 0.6) {
                btn.classList.add('is-visible');
            } else {
                btn.classList.remove('is-visible');
            }
        });

        on(window, 'scroll', onScroll, { passive: true });
        onScroll();

        on(btn, 'click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });
        });
    }

  
/* =================================================================
       13. FOOTER YEAR
       ================================================================= */

    function initFooterYear () {
        const el = qs('#footerYear');
        if (el) el.textContent = String(new Date().getFullYear());
    }


    /* =================================================================
       14. GLITCH TITLE PERIODIC FLICKER
       ================================================================= */

    function initGlitch () {
        const el = qs('.hero__title-line--main');
        if (!el) return;
        if (prefersReducedMotion()) return;

        // Random glitch flicker every few seconds
        setInterval(() => {
            el.classList.add('is-glitching');
            setTimeout(() => el.classList.remove('is-glitching'), 220);
        }, 5200);
    }


    /* =================================================================
       15. INIT
       ================================================================= */

    function init () {
        initPreloader();
        initParticles();
        initCursor();
        initNavbar();
        initSmoothScroll();
        initActiveNav();
        initReveal();
        initCounters();
        initCardGlow();
        initTilt();
        initBackToTop();
        initFooterYear();
        initGlitch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
