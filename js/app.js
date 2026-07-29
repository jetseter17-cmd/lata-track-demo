/* LATA TRACK demo — прелоадер, FLIP, переходы, реавилы */
(() => {
  const html = document.documentElement;
  const isStatic = html.classList.contains('static');
  const isHome = document.body.classList.contains('page-home');

  /* ---- «резина»: на десктопе канва 1440 масштабируется под любую ширину
         (включая широкоформат — полосы и футер всегда от края до края);
         ниже 1024 включается настоящая мобильная/планшетная вёрстка ---- */
  const fit = () => {
    if (window.innerWidth >= 1024) {
      html.style.zoom = String(window.innerWidth / 1440);
    } else {
      html.style.zoom = '';
    }
  };
  fit();
  window.addEventListener('resize', fit);

  /* ---- реавилы по скроллу ---- */
  const setupReveals = () => {
    if (isStatic) return;
    const groups = document.querySelectorAll('[data-rv-group]');
    groups.forEach((g) => {
      const items = g.matches('[data-rv]') ? [g] : [...g.querySelectorAll('[data-rv]')];
      items.forEach((el, i) => {
        el.classList.add('rv');
        el.style.transitionDelay = `${i * 70}ms, ${i * 70}ms`;
      });
    });
    const singles = document.querySelectorAll('[data-rv]:not([data-rv-group] [data-rv]):not([data-rv-group])');
    singles.forEach((el) => el.classList.add('rv'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
          e.target.addEventListener('transitionend', function h(ev) {
            if (ev.propertyName === 'transform') {
              e.target.style.transitionDelay = '';
              e.target.removeEventListener('transitionend', h);
            }
          });
        }
      });
    }, { rootMargin: '0px 0px -90px 0px', threshold: 0.05 });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  };

  /* ---- переходы между страницами ---- */
  const wipe = document.getElementById('wipe');
  const setupTransitions = () => {
    document.querySelectorAll('a[data-nav]').forEach((a) => {
      a.addEventListener('click', (e) => {
        if (isStatic) return;
        e.preventDefault();
        const href = a.getAttribute('href');
        sessionStorage.setItem('lata-wipe', '1');
        wipe.classList.add('cover');
        const go = () => { location.href = href; };
        wipe.addEventListener('transitionend', go, { once: true });
        setTimeout(go, 600); // страховка
      });
    });
  };

  const playWipeExit = () => {
    sessionStorage.removeItem('lata-wipe');
    const done = () => {
      html.classList.remove('from-wipe');
      wipe.classList.remove('exit');
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wipe.classList.add('exit');
      wipe.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 700); // страховка
    }));
  };

  /* ---- каскад героя (общий финал) ---- */
  const heroIn = () => {
    html.classList.add('hero-in');
    html.classList.remove('preloading', 'entering');
    // после отработки каскада вернуть элементам базовые transition (hover/active)
    setTimeout(() => html.classList.remove('hero-in'), 1500);
  };

  /* ---- прелоадер (только главная, прямой заход) ---- */
  const runPreloader = () => {
    const pre = document.getElementById('preloader');
    const pct = pre.querySelector('.pre-pct');
    const lineT = pre.querySelector('.line-t');
    const lineB = pre.querySelector('.line-b');
    const strip = pre.querySelector('.pre-strip');
    const heroStrip = document.querySelector('.hero-strip');

    // готовность реальных ресурсов
    const heroImg = document.querySelector('.hero-strip .media img');
    let ready = false;
    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
    ]).then(() => { ready = true; });

    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));

    // 1. лого
    requestAnimationFrame(() => pre.classList.add('logo-in'));

    // 2. фото + полосы + проценты
    const COUNT_MS = 2300;
    setTimeout(() => {
      pre.classList.add('media-in', 'count');
      const t0 = performance.now();
      let holdBase = null;
      const tick = (now) => {
        let t = clamp01((now - t0) / COUNT_MS);
        // если ресурсы не готовы — держим 99%
        if (t >= 1 && !ready) { t = 0.99; holdBase = now; }
        const eTop = easeInOut(t);                       // верхняя — медленнее
        const eBot = easeInOut(clamp01(t * 1.45));       // нижняя — быстрее
        lineT.style.transform = `scaleX(${eTop})`;
        lineB.style.transform = `scaleX(${eBot})`;
        pct.textContent = `${Math.round(eTop * 100)}%`;
        if (t < 1 || !ready) { requestAnimationFrame(tick); return; }
        lineT.style.transform = 'scaleX(1)';
        lineB.style.transform = 'scaleX(1)';
        pct.textContent = '100%';
        finish();
      };
      requestAnimationFrame(tick);
    }, 620);

    // 3. финал: лого/проценты уходят -> FLIP -> каскад героя
    const finish = () => {
      setTimeout(() => {
        pre.classList.add('exit');
        setTimeout(flip, 430);
      }, 260);
    };

    const flip = () => {
      // поправка на зум-«резину»: BCR в визуальных px, стили — в layout px
      const z = parseFloat(html.style.zoom || '1') || 1;
      const pb = strip.getBoundingClientRect();
      const hb = heroStrip.getBoundingClientRect();
      const dx = ((hb.left + hb.width / 2) - (pb.left + pb.width / 2)) / z;
      const dy = ((hb.top + hb.height / 2) - (pb.top + pb.height / 2)) / z;
      const ease = 'cubic-bezier(0.72, 0, 0.16, 1)';
      const dur = 950;
      // маска раскрывается: окно вырастает до размеров hero
      const anim = strip.animate(
        [
          { width: `${pb.width / z}px`, height: `${pb.height / z}px`, transform: 'translate(-50%, -50%)' },
          { width: `${hb.width / z}px`, height: `${hb.height / z}px`, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` },
        ],
        { duration: dur, easing: ease, fill: 'forwards' }
      );
      // кроп фото сходится к полному кадру hero + докручивается остаток зума
      const mediaImg = strip.querySelector('.pre-media img');
      if (mediaImg) mediaImg.animate(
        [
          { top: '-21.43%', height: '142.86%', transform: 'scale(1.12)' },
          { top: '0%', height: '100%', transform: 'scale(1)' },
        ],
        { duration: dur, easing: ease, fill: 'forwards' }
      );
      anim.onfinish = () => {
        heroIn();
        // отдать кадр каскаду и убрать оверлей без мигания
        requestAnimationFrame(() => { pre.style.display = 'none'; });
      };
    };
  };

  /* ---- вход страницы (тюбинг всегда; главная после перехода) ---- */
  const runEntrance = () => {
    if (html.classList.contains('from-wipe')) playWipeExit();
    setTimeout(heroIn, html.classList.contains('from-wipe') ? 240 : 120);
  };

  /* ---- старт ---- */
  const boot = () => {
    setupTransitions();
    setupReveals();
    if (isStatic) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    if (html.classList.contains('preloading')) runPreloader();
    else if (html.classList.contains('entering')) runEntrance();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
