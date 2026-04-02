const counters = document.querySelectorAll(".counter");
const parallaxNodes = document.querySelectorAll("[data-parallax]");

const animateCounter = (node) => {
  const target = Number(node.dataset.target || 0);
  const duration = 1100;
  const start = performance.now();

  const tick = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = Math.floor(eased * target).toString();
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      if (entry.target.classList.contains("counter")) {
        animateCounter(entry.target);
      }
      entry.target.classList.add("in-view");
      obs.unobserve(entry.target);
    });
  },
  { threshold: 0.35 }
);

counters.forEach((counter) => observer.observe(counter));
document
  .querySelectorAll(".hover-lift, .pipeline-wrap, .final-cta")
  .forEach((el) => observer.observe(el));

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY * 0.06;
    parallaxNodes.forEach((node) => {
      node.style.transform = `translateY(${y}px)`;
    });
  },
  { passive: true }
);

const marqueeRows = document.querySelectorAll(".marquee-row");

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;

  marqueeRows.forEach((row) => {
    const track = row.querySelector(".marquee-track");
    const direction = row.dataset.direction === "right" ? 1 : -1;

    const move = scrollY * 0.25 * direction;

    track.style.transform = `translateX(${move}px)`;
  });
});

/* ---------- Mobile navigation ---------- */

const topbar = document.getElementById("topbar");
const navToggle = document.getElementById("nav-toggle");
const siteNav = document.getElementById("site-nav");

const setNavOpen = (open) => {
  if (!topbar || !navToggle) return;
  topbar.classList.toggle("topbar--open", open);
  document.body.classList.toggle("nav-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!topbar.classList.contains("topbar--open"));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setNavOpen(false);
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 980) setNavOpen(false);
    },
    { passive: true }
  );

  document.addEventListener("click", (e) => {
    if (!topbar.classList.contains("topbar--open")) return;
    if (!topbar.contains(e.target)) setNavOpen(false);
  });
}

/* ---------- Hero particles ---------- */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const initHeroParticles = () => {
  const canvas = document.getElementById("hero-particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const section = canvas.closest(".hero");
  if (!section) return;

  let w = 0;
  let h = 0;
  let raf = 0;
  const palette = ["#6ee7f9", "#a78bfa", "#f472b6", "#c4b5fd", "#67e8f9"];

  const particles = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = section.clientWidth;
    h = section.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = prefersReducedMotion ? 42 : Math.min(140, Math.floor((w * h) / 9000));
    particles.length = 0;
    for (let i = 0; i < target; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: Math.random() * 0.55 + 0.12,
        r: Math.random() * 2.2 + 0.4,
        phase: Math.random() * Math.PI * 2,
        tw: 0.6 + Math.random() * 0.9,
        color: palette[(Math.random() * palette.length) | 0],
      });
    }
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    const time = t * 0.001;

    particles.forEach((p) => {
      if (!prefersReducedMotion) {
        p.x += p.vx + Math.sin(time * 0.4 + p.phase) * 0.15;
        p.y += p.vy * p.tw * 0.45;
        p.x += Math.cos(time * 0.25 + p.phase * 0.5) * 0.12;
      }

      if (p.y > h + 6) {
        p.y = -4;
        p.x = Math.random() * w;
      }
      if (p.x < -4) p.x = w + 4;
      if (p.x > w + 4) p.x = -4;

      const twinkle = 0.35 + 0.65 * Math.sin(time * 2.2 + p.phase);
      const alpha = 0.15 + twinkle * 0.55;

      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.arc(p.x, p.y, p.r * (0.85 + twinkle * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (!document.hidden && !prefersReducedMotion) {
      raf = requestAnimationFrame(draw);
    }
  };

  const startLoop = () => {
    cancelAnimationFrame(raf);
    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(0);
    }
  };

  resize();
  window.addEventListener("resize", () => {
    resize();
    startLoop();
  }, { passive: true });

  startLoop();

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        startLoop();
      }
    },
    { passive: true }
  );
};

initHeroParticles();

/* ---------- AI speed slider ---------- */

const formatBuildTimeline = (days) => {
  const d = Math.round(days);
  if (d >= 75) return `~${Math.max(1, Math.round(d / 30))} months`;
  if (d >= 21) return `~${Math.max(1, Math.round(d / 7))} weeks`;
  return `~${d} days`;
};

const initAiSpeedSlider = () => {
  const range = document.getElementById("ai-speed-range");
  const mvpAfter = document.getElementById("metric-mvp-after");
  const fullAfter = document.getElementById("metric-full-after");
  const costAfter = document.getElementById("metric-cost-after");
  const modeLabel = document.getElementById("ai-speed-mode-label");
  const hintText = document.getElementById("ai-speed-hint-text");

  if (!range || !mvpAfter || !fullAfter || !costAfter) return;

  const update = () => {
    const t = Number(range.value) / 100;
    const mvpDays = Math.round(14 + (3 - 14) * t);
    const fullDays = 90 + (28 - 90) * t;
    const savings = Math.round(70 * t);

    mvpAfter.textContent = `${mvpDays} days`;
    fullAfter.textContent = formatBuildTimeline(fullDays);
    costAfter.textContent =
      savings <= 0 ? "same scope, no savings yet" : `−${savings}% vs classic`;

    if (modeLabel && hintText) {
      if (t < 0.35) {
        modeLabel.textContent = "Classic delivery pace";
        hintText.textContent = "Industry-standard timelines — solid, predictable, slower to market.";
      } else if (t < 0.72) {
        modeLabel.textContent = "Hybrid acceleration";
        hintText.textContent = "AI drafts and reviews in the loop — velocity ramps up measurably.";
      } else {
        modeLabel.textContent = "AI-accelerated";
        hintText.textContent = "Production-grade velocity — human sign-off on architecture and risk.";
      }
    }
  };

  range.addEventListener("input", update);
  update();
};

initAiSpeedSlider();

/* ---------- Terminal typing ---------- */

const TERMINAL_SCRIPT = `$ d-art orchestrate --project client-portal --strategy hybrid

▸ models:   GPT-4o + Claude (router: task-aware)
▸ context:  RAG ▶ 842k chunks ▶ Qdrant [namespace: prod-eu]
▸ tests:    eval pass 98.4%  │  latency p95 1.1s
▸ build:    vite 5.4  →  bundle 218kb gzip
▸ deploy:   edge ▶ eu-west-1  │  cold 398ms

✓ HUMAN_REVIEW: approved — ship approved
▸ production rollout … done in 3m 09s

Ready. Your move.`;

const initTerminalTyping = () => {
  const pre = document.getElementById("terminal-typing");
  const code = document.getElementById("terminal-code");
  if (!pre || !code) return;

  let started = false;
  let i = 0;

  const typeNext = () => {
    if (i >= TERMINAL_SCRIPT.length) return;
    const ch = TERMINAL_SCRIPT[i];
    code.textContent += ch;
    i += 1;
    const jitter = prefersReducedMotion ? 0 : 8 + Math.random() * 22;
    setTimeout(typeNext, jitter);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        code.textContent = "";
        i = 0;
        typeNext();
        io.disconnect();
      });
    },
    { threshold: 0.25 }
  );

  io.observe(pre);
};

initTerminalTyping();

/* ---------- Dev compare toggle ---------- */

const initDevCompare = () => {
  const root = document.querySelector(".dev-compare");
  if (!root) return;

  const buttons = root.querySelectorAll(".dev-compare__btn");

  const setMode = (mode) => {
    const isAi = mode === "ai";
    root.classList.toggle("dev-compare--mode-ai", isAi);
    root.classList.toggle("dev-compare--mode-classic", !isAi);
    buttons.forEach((btn) => {
      const active = btn.dataset.compare === mode;
      btn.classList.toggle("is-active", active);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setMode(btn.dataset.compare || "ai");
    });
  });
};

initDevCompare();
