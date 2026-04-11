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
    /* Slightly stronger parallax on fixed orbs — still lightweight */
    const y = window.scrollY * 0.075;
    parallaxNodes.forEach((node) => {
      node.style.transform = `translateY(${y}px)`;
    });
  },
  { passive: true }
);

/* ---------- Premium UI: hero readiness + section scroll reveals (CSS-driven) ---------- */
(function initPremiumUiPolish() {
  document.body.classList.add("site-ui-ready");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.documentElement.classList.add("reduce-ui-motion");
    return;
  }
  const sections = document.querySelectorAll(
    "main > section:not(.hero):not(.page-hero):not(.web3-tx-river)"
  );
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("section-inview");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.07, rootMargin: "0px 0px -5% 0px" }
  );
  sections.forEach((sec) => io.observe(sec));
})();

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
      if (window.innerWidth > 1023) setNavOpen(false);
    },
    { passive: true }
  );

  document.addEventListener("click", (e) => {
    if (!topbar.classList.contains("topbar--open")) return;
    if (!topbar.contains(e.target)) setNavOpen(false);
  });
}

/* ---------- Hero particles (falling “stars” on index hero) ----------
 * Tuning:
 *   HERO_PARTICLES.areaDivisor — меньше число → больше частиц (плотность ~ area / divisor).
 *   HERO_PARTICLES.maxCount — верхний предел числа частиц.
 *   HERO_PARTICLES.reducedMotionCount — сколько частиц при prefers-reduced-motion.
 *   HERO_PARTICLES.speedMul — множитель скорости падения/дрейфа (выше = интенсивнее движение).
 *   HERO_PARTICLES.alphaMin / alphaRange — базовая яркость и амплитуда мерцания (интенсивность свечения).
 * Canvas выше .hero-overlay (z-index), иначе светлая пелена перекрывает звёзды.
 *
 * Пресет: плотный слой, яркость точек; текст остаётся над canvas (z-index контента).
 */
const HERO_PARTICLES = {
  areaDivisor: 7200,
  maxCount: 120,
  reducedMotionCount: 40,
  speedMul: 0.52,
  alphaMin: 0.1,
  alphaRange: 0.38,
};

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

    const target = prefersReducedMotion
      ? HERO_PARTICLES.reducedMotionCount
      : Math.min(HERO_PARTICLES.maxCount, Math.floor((w * h) / HERO_PARTICLES.areaDivisor));
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
        const sm = HERO_PARTICLES.speedMul;
        p.x += (p.vx + Math.sin(time * 0.4 + p.phase) * 0.15) * sm;
        p.y += p.vy * p.tw * 0.45 * sm;
        p.x += Math.cos(time * 0.25 + p.phase * 0.5) * 0.12 * sm;
      }

      if (p.y > h + 6) {
        p.y = -4;
        p.x = Math.random() * w;
      }
      if (p.x < -4) p.x = w + 4;
      if (p.x > w + 4) p.x = -4;

      const twinkle = 0.35 + 0.65 * Math.sin(time * 2.2 + p.phase);
      const alpha = HERO_PARTICLES.alphaMin + twinkle * HERO_PARTICLES.alphaRange;

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

  const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let userPauseUntil = 0;
  /** Nudge per tick (0–100 scale). ~25s end-to-end at 1s interval. */
  const AUTO_STEP = 4;
  let autoDirection = -1;

  const pauseAuto = () => {
    userPauseUntil = performance.now() + 28_000;
  };

  range.addEventListener("input", () => {
    update();
    pauseAuto();
  });
  range.addEventListener("pointerdown", pauseAuto);

  update();

  if (motionOk) {
    const tick = () => {
      if (document.hidden || performance.now() < userPauseUntil) return;

      let v = Number(range.value) + autoDirection * AUTO_STEP;
      if (v >= 100) {
        v = 100;
        autoDirection = -1;
      } else if (v <= 0) {
        v = 0;
        autoDirection = 1;
      }

      range.value = String(v);
      update();
    };

    setInterval(tick, 1000);
  }
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

/* ---------- Web development page: architecture graph ---------- */

const initWebArchGraph = () => {
  const canvas = document.getElementById("web-arch-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const container = canvas.parentElement;
  if (!container) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nodes = [
    { id: "cdn", label: "CDN", x: 0.5, y: 0.14 },
    { id: "edge", label: "Edge", x: 0.5, y: 0.28 },
    { id: "app", label: "App / SSR", x: 0.5, y: 0.46 },
    { id: "api", label: "API", x: 0.22, y: 0.62 },
    { id: "db", label: "Data", x: 0.78, y: 0.62 },
    { id: "obs", label: "Analytics", x: 0.5, y: 0.8 },
  ];

  const edges = [
    ["cdn", "edge"],
    ["edge", "app"],
    ["app", "api"],
    ["app", "db"],
    ["app", "obs"],
    ["api", "db"],
  ];

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const palette = ["#6ee7f9", "#a78bfa", "#f472b6"];

  let w = 0;
  let h = 0;
  let dpr = 1;
  let t0 = 0;
  let raf = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = container.clientWidth;
    h = container.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (t) => {
    if (!t0) t0 = t;
    const elapsed = (t - t0) * 0.001;
    ctx.clearRect(0, 0, w, h);

    const P = (nx, ny) => ({ x: nx * w, y: ny * h });

    ctx.lineWidth = 1.5;
    edges.forEach(([a, b], ei) => {
      const pa = P(byId[a].x, byId[a].y);
      const pb = P(byId[b].x, byId[b].y);
      const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      grad.addColorStop(0, "rgba(167, 139, 250, 0.35)");
      grad.addColorStop(1, "rgba(110, 231, 249, 0.45)");
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();

      if (!reduced) {
        const flow = (elapsed * 0.35 + ei * 0.17) % 1;
        const fx = pa.x + (pb.x - pa.x) * flow;
        const fy = pa.y + (pb.y - pa.y) * flow;
        ctx.beginPath();
        ctx.fillStyle = palette[ei % palette.length];
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(elapsed * 3 + ei);
        ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    nodes.forEach((n) => {
      const p = P(n.x, n.y);
      const r = 18;
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.55, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(167, 139, 250, 0.12)");
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.font = '600 11px "Inter", sans-serif';
      ctx.fillStyle = "#334155";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, p.x, p.y);
    });

    if (!document.hidden && !reduced) {
      raf = requestAnimationFrame(draw);
    }
  };

  resize();

  const startLoop = () => {
    cancelAnimationFrame(raf);
    t0 = 0;
    if (!reduced) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
    }
  };

  startLoop();

  window.addEventListener(
    "resize",
    () => {
      resize();
      startLoop();
    },
    { passive: true }
  );

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

initWebArchGraph();

/* ---------- Web development: speedometer ---------- */

const initWebSpeedometer = () => {
  const root = document.getElementById("web-speedometer");
  const showcase = document.querySelector(".web-perf-showcase");
  const arc = document.getElementById("web-speedometer-arc");
  const needleG = document.getElementById("web-speedometer-needle-group");
  const valueEl = document.getElementById("speedometer-value");
  if (!root || !showcase || !arc || !needleG || !valueEl) return;

  const targetScore = 94;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ran = false;

  const applyScore = (eased) => {
    const score = Math.round(eased * targetScore);
    valueEl.textContent = String(score);
    const off = 100 - eased * targetScore;
    arc.style.strokeDashoffset = String(off);
    const deg = 180 * (1 - (eased * targetScore) / 100);
    needleG.setAttribute("transform", `translate(100,100) rotate(${deg})`);
  };

  const run = () => {
    if (ran) return;
    ran = true;
    showcase.classList.add("is-in-view");

    if (reduced) {
      applyScore(1);
      return;
    }

    const start = performance.now();
    const dur = 1400;

    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      applyScore(eased);
      if (p < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      });
    },
    { threshold: 0.35 }
  );

  io.observe(showcase);

  needleG.setAttribute("transform", "translate(100,100) rotate(180)");
};

initWebSpeedometer();

/* ---------- Web development: integrations build ---------- */

const initIntegrationsBuild = () => {
  const grid = document.getElementById("integrations-build");
  if (!grid) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    grid.classList.add("is-built");
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        grid.classList.add("is-built");
        io.unobserve(grid);
      });
    },
    { threshold: 0.2 }
  );

  io.observe(grid);
};

initIntegrationsBuild();

/* ---------- AI development page: mesh + signing demo ---------- */

const initAiMeshCanvas = () => {
  const canvas = document.getElementById("ai-mesh-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const section = canvas.closest(".page-hero");
  if (!ctx || !section) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cols = 11;
  const rows = 8;
  let points = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let t0 = 0;

  const idx = (i, j) => j * cols + i;

  const buildBase = () => {
    points = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        points.push({
          bx: i / (cols - 1),
          by: j / (rows - 1),
          ph: Math.random() * Math.PI * 2,
          pv: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  const draw = (t) => {
    if (!t0) t0 = t;
    const elapsed = (t - t0) * 0.001;
    ctx.clearRect(0, 0, w, h);

    const P = points.map((p) => ({
      x: p.bx * w + Math.sin(elapsed * 0.65 + p.ph) * (16 + 6 * Math.sin(p.ph * 2)),
      y: p.by * h + Math.cos(elapsed * 0.5 + p.pv) * (14 + 5 * Math.cos(p.pv * 2)),
    }));

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(167, 139, 250, 0.2)";
    ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p = P[idx(i, j)];
        if (i < cols - 1) {
          const q = P[idx(i + 1, j)];
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        }
        if (j < rows - 1) {
          const q = P[idx(i, j + 1)];
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        }
        if (i < cols - 1 && j < rows - 1 && (i + j) % 2 === 0) {
          const d = P[idx(i + 1, j + 1)];
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(d.x, d.y);
        }
      }
    }
    ctx.stroke();

    P.forEach((p, n) => {
      const pulse = 0.35 + 0.25 * Math.sin(elapsed * 2.2 + n * 0.15);
      ctx.beginPath();
      ctx.fillStyle = `rgba(110, 231, 249, ${0.35 + pulse * 0.35})`;
      ctx.arc(p.x, p.y, 2.2 + (n % 4) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!document.hidden && !reduced) {
      raf = requestAnimationFrame(draw);
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = section.clientWidth;
    h = section.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildBase();
  };

  const startLoop = () => {
    cancelAnimationFrame(raf);
    t0 = 0;
    if (!reduced) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
    }
  };

  resize();
  window.addEventListener(
    "resize",
    () => {
      resize();
      startLoop();
    },
    { passive: true }
  );

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

const initAiSigningDemo = () => {
  const card = document.getElementById("ai-sign-card");
  const btn = document.getElementById("ai-sign-btn");
  const done = document.getElementById("ai-sign-done");
  const tx = document.getElementById("ai-sign-tx");
  const reset = document.getElementById("ai-sign-reset");
  const nonceEl = document.getElementById("ai-sign-nonce");
  if (!card || !btn || !done || !tx) return;

  const fullHex = () =>
    Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  const runSign = () => {
    card.classList.add("is-busy");
    window.setTimeout(() => {
      card.classList.remove("is-busy");
      card.classList.add("is-done");
      done.hidden = false;
      tx.textContent = `0x${fullHex()}`;
      if (nonceEl) {
        const n = Number((nonceEl.textContent || "#0").replace(/\D/g, "")) + 1;
        nonceEl.textContent = `#${n}`;
      }
    }, 1100);
  };

  btn.addEventListener("click", runSign);

  if (reset) {
    reset.addEventListener("click", () => {
      card.classList.remove("is-done");
      done.hidden = true;
    });
  }
};

initAiMeshCanvas();
initAiSigningDemo();

/* ---------- Web3 page: chain canvas, chart, block ticker ---------- */

const initWeb3ChainCanvas = () => {
  const canvas = document.getElementById("web3-chain-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const section = canvas.closest(".page-hero");
  if (!ctx || !section) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = 7;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let t0 = 0;

  const roundBlock = (x, y, rw, rh, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  };

  const draw = (t) => {
    if (!t0) t0 = t;
    const elapsed = (t - t0) * 0.001;
    ctx.clearRect(0, 0, w, h);

    const padX = w * 0.06;
    const usable = w - padX * 2;
    const bw = usable / n - 8;
    const y = h * 0.42;
    const bh = Math.min(h * 0.22, 72);

    for (let i = 0; i < n; i++) {
      const x = padX + i * (bw + 8) + Math.sin(elapsed * 1.2 + i * 0.4) * 3;
      const pulse = 0.08 * Math.sin(elapsed * 2 + i);
      const glow = i === n - 1 ? 0.35 + 0.15 * Math.sin(elapsed * 3) : 0;

      roundBlock(x, y + pulse * 10, bw, bh, 10);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + glow * 0.25})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 + glow})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (i < n - 1) {
        const x2 = padX + (i + 1) * (bw + 8);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(110, 231, 249, 0.35)";
        ctx.lineWidth = 2;
        ctx.moveTo(x + bw + 2, y + bh / 2 + pulse * 10);
        ctx.lineTo(x2 - 2, y + bh / 2 + pulse * 10);
        ctx.stroke();

        const dot = ((elapsed * 0.8 + i * 0.2) % 1) * (x2 - x - bw);
        ctx.beginPath();
        ctx.fillStyle = "#a78bfa";
        ctx.arc(x + bw + dot, y + bh / 2 + pulse * 10, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!document.hidden && !reduced) {
      raf = requestAnimationFrame(draw);
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = section.clientWidth;
    h = section.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const startLoop = () => {
    cancelAnimationFrame(raf);
    t0 = 0;
    if (!reduced) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
    }
  };

  resize();
  window.addEventListener(
    "resize",
    () => {
      resize();
      startLoop();
    },
    { passive: true }
  );

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

const initWeb3ChartCanvas = () => {
  const canvas = document.getElementById("web3-chart-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const wrap = canvas.parentElement;
  if (!ctx || !wrap) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let t0 = 0;

  const points = [];
  const nPts = 60;

  const buildPoints = () => {
    points.length = 0;
    let v = 0.5;
    for (let i = 0; i < nPts; i++) {
      v += (Math.random() - 0.45) * 0.06;
      v = Math.max(0.2, Math.min(0.92, v));
      points.push(v);
    }
  };

  const draw = (t) => {
    if (!t0) t0 = t;
    const elapsed = (t - t0) * 0.001;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 12, r: 12, t: 16, b: 12 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;

    const phase = reduced ? 0 : elapsed * 0.15;
    const pts = points.map((p, i) => {
      const x = pad.l + (i / (nPts - 1)) * innerW;
      const wobble = Math.sin(phase + i * 0.08) * 0.02;
      const yNorm = p + wobble;
      const y = pad.t + innerH * (1 - yNorm);
      return { x, y };
    });

    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, "rgba(167, 139, 250, 0.35)");
    grad.addColorStop(1, "rgba(110, 231, 249, 0.02)");

    ctx.beginPath();
    ctx.moveTo(pts[0].x, h - pad.b);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "rgba(167, 139, 250, 0.85)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    const lx = pts[pts.length - 1].x;
    const ly = pts[pts.length - 1].y;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, h - pad.b);
    ctx.strokeStyle = "rgba(167, 139, 250, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2;
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!document.hidden && !reduced) {
      raf = requestAnimationFrame(draw);
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = wrap.clientWidth;
    h = wrap.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPoints();
  };

  const startLoop = () => {
    cancelAnimationFrame(raf);
    t0 = 0;
    if (!reduced) {
      raf = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
    }
  };

  resize();
  window.addEventListener(
    "resize",
    () => {
      resize();
      startLoop();
    },
    { passive: true }
  );

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

const initWeb3HeroBlock = () => {
  const el = document.getElementById("web3-hero-block");
  if (!el) return;

  let n = 19_284_102;
  window.setInterval(() => {
    if (document.hidden) return;
    n += Math.floor(Math.random() * 3) + 1;
    el.textContent = n.toLocaleString("en-US");
  }, 12_000);
};

/* ---------- AI pipeline typewriter (all pages: #ai-power) ---------- */

const initPipelineTypewriter = () => {
  const section = document.querySelector("[data-pipeline-typewriter]");
  if (!section) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const heading = section.querySelector(".pipeline-tw-heading");
  const lead = section.querySelector(".pipeline-tw-lead");
  const pipeline = section.querySelector(".pipeline");
  if (!heading || !lead || !pipeline) return;

  const titleText = heading.textContent.trim();
  const leadText = lead.textContent.trim();
  const stepEls = [...pipeline.querySelectorAll(".pipeline-step")];
  const stepTexts = stepEls.map((el) => el.textContent.trim());
  if (!titleText || !stepTexts.length) return;

  let runToken = 0;
  const timeouts = [];

  const clearAllTimeouts = () => {
    timeouts.forEach((id) => window.clearTimeout(id));
    timeouts.length = 0;
  };

  const wait = (ms) =>
    new Promise((resolve) => {
      const id = window.setTimeout(resolve, ms);
      timeouts.push(id);
    });

  const typeInto = async (el, full, token) => {
    el.classList.add("is-typing");
    el.textContent = "";
    for (let i = 0; i <= full.length; i++) {
      if (token !== runToken) {
        el.classList.remove("is-typing");
        return;
      }
      el.textContent = full.slice(0, i);
      if (i < full.length) {
        await wait(11 + Math.random() * 28);
      }
    }
    el.classList.remove("is-typing");
  };

  const restoreStatic = () => {
    heading.textContent = titleText;
    lead.textContent = leadText;
    stepEls.forEach((el, i) => {
      el.textContent = stepTexts[i] || "";
    });
    heading.classList.remove("is-typing");
    lead.classList.remove("is-typing");
    stepEls.forEach((el) => el.classList.remove("is-typing"));
  };

  const runLoop = async (token) => {
    while (token === runToken) {
      heading.textContent = "";
      lead.textContent = "";
      stepEls.forEach((el) => {
        el.textContent = "";
      });

      await typeInto(heading, titleText, token);
      if (token !== runToken) break;
      await wait(260);
      await typeInto(lead, leadText, token);
      if (token !== runToken) break;
      await wait(360);

      for (let s = 0; s < stepEls.length; s++) {
        if (token !== runToken) break;
        await typeInto(stepEls[s], stepTexts[s], token);
        if (token !== runToken) break;
        await wait(220);
      }
      if (token !== runToken) break;

      await wait(2100);
      if (token !== runToken) break;

      section.classList.add("pipeline-tw--soft-hide");
      await wait(400);
      if (token !== runToken) break;
      section.classList.remove("pipeline-tw--soft-hide");
      await wait(160);
    }
  };

  const start = () => {
    runToken++;
    const token = runToken;
    clearAllTimeouts();
    section.classList.remove("pipeline-tw--soft-hide");
    runLoop(token);
  };

  const stop = () => {
    runToken++;
    clearAllTimeouts();
    section.classList.remove("pipeline-tw--soft-hide");
    restoreStatic();
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  io.observe(section);
};

initPipelineTypewriter();

initWeb3ChainCanvas();
initWeb3ChartCanvas();
initWeb3HeroBlock();

/* Optional: widget also boots from contact-widget.js; init only if script order allows */
if (typeof ContactWidget !== "undefined") {
  ContactWidget.init({
    apiUrl: "http://localhost:3000",
    agentId: "default",
  });
}
