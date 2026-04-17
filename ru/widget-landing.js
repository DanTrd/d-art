/**
 * Демо чата на странице widget.html: появление сообщений и эффект печати ответа.
 */
(function () {
  const root = document.getElementById("widget-chat-demo");
  if (!root) return;

  const userMsg = root.querySelector('[data-widget-chat="user"]');
  const typing = root.querySelector('[data-widget-chat="typing"]');
  const bot = root.querySelector('[data-widget-chat="bot"]');
  const botText = root.querySelector('[data-widget-chat="bot-text"]');
  const caret = root.querySelector('[data-widget-chat="caret"]');

  if (!userMsg || !typing || !bot || !botText) return;

  const BOT_TEXT =
    "Цена зависит от дизайна, материалов и сроков. Для квартиры 70 м² «под ключ» ориентир часто от 700 000 ₽ — точнее по смете после уточнения отделки и района. Могу кратко подобрать варианты под ваш бюджет.";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wait = (ms) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });

  let cancelled = false;
  let repeatTimer = 0;
  let runToken = 0;

  const clearRepeat = () => {
    if (repeatTimer) {
      window.clearTimeout(repeatTimer);
      repeatTimer = 0;
    }
  };

  const resetVisual = () => {
    userMsg.classList.remove("is-in");
    typing.hidden = true;
    bot.hidden = true;
    botText.textContent = "";
    if (caret) caret.hidden = true;
  };

  const runStatic = () => {
    root.classList.add("widget-chat-demo--static");
    userMsg.classList.add("is-in");
    typing.hidden = true;
    bot.hidden = false;
    botText.textContent = BOT_TEXT;
    if (caret) caret.hidden = true;
  };

  async function playSequence(token) {
    resetVisual();
    root.classList.remove("widget-chat-demo--static");

    await wait(350);
    if (token !== runToken || cancelled) return;

    userMsg.classList.add("is-in");
    await wait(750);
    if (token !== runToken || cancelled) return;

    typing.hidden = false;
    await wait(1450);
    if (token !== runToken || cancelled) return;

    typing.hidden = true;
    bot.hidden = false;
    if (caret) caret.hidden = false;

    for (let i = 0; i <= BOT_TEXT.length; i++) {
      if (token !== runToken || cancelled) return;
      botText.textContent = BOT_TEXT.slice(0, i);
      await wait(10 + Math.random() * 16);
    }

    if (caret) caret.hidden = true;

    if (token !== runToken || cancelled || reduced) return;

    clearRepeat();
    repeatTimer = window.setTimeout(() => {
      playDemo(token + 1);
    }, 12000);
  }

  function playDemo(newToken) {
    runToken = newToken;
    cancelled = false;
    void playSequence(runToken);
  }

  if (reduced) {
    runStatic();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          cancelled = false;
          clearRepeat();
          playDemo(runToken + 1);
        } else {
          cancelled = true;
          runToken++;
          clearRepeat();
          resetVisual();
        }
      });
    },
    { threshold: 0.32, rootMargin: "0px 0px -5% 0px" }
  );

  io.observe(root);
})();

/* ---------- Hero: mesh canvas (как на AI-странице, свои id) ---------- */
(function initWidgetHeroMesh() {
  const canvas = document.getElementById("widget-hero-mesh");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const section = canvas.closest(".widget-hero");
  if (!ctx || !section) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cols = 10;
  const rows = 7;
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
    const elapsed = reduced ? 0 : (t - t0) * 0.001;
    ctx.clearRect(0, 0, w, h);

    const P = points.map((p) => ({
      x: p.bx * w + Math.sin(elapsed * 0.65 + p.ph) * (14 + 5 * Math.sin(p.ph * 2)),
      y: p.by * h + Math.cos(elapsed * 0.5 + p.pv) * (12 + 4 * Math.cos(p.pv * 2)),
    }));

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(167, 139, 250, 0.18)";
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
      const pulse = reduced ? 0.5 : 0.35 + 0.25 * Math.sin(elapsed * 2.2 + n * 0.15);
      ctx.beginPath();
      ctx.fillStyle = `rgba(110, 231, 249, ${0.28 + pulse * 0.32})`;
      ctx.arc(p.x, p.y, 2 + (n % 4) * 0.3, 0, Math.PI * 2);
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
})();

/* ---------- Калькулятор потерь: слайдер и полосы ---------- */
(function initWidgetLossCalc() {
  const section = document.querySelector("[data-widget-loss-calc]");
  if (!section) return;

  const panel = section.querySelector(".widget-loss");
  const slider = document.getElementById("loss-daily-slider");
  const dailyDisplay = document.getElementById("loss-daily-display");
  const glow = section.querySelector(".widget-loss__slider-glow");
  const monthlyEl = document.getElementById("loss-monthly-visitors");
  const readyEl = document.getElementById("loss-ready-range");
  const lostEl = document.getElementById("loss-lost-range");

  const min = slider ? Number(slider.min) || 20 : 20;
  const max = slider ? Number(slider.max) || 500 : 500;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const formatInt = (n) => Math.round(n).toLocaleString("ru-RU");

  const apply = (dailyRaw) => {
    const daily = Math.max(min, Math.min(max, dailyRaw));
    const monthly = daily * 30;
    const readyMin = Math.round(monthly * 0.05);
    const readyMax = Math.round(monthly * 0.1);
    const lostMin = Math.round(readyMin * 0.7);
    const lostMax = Math.round(readyMax * 0.7);

    if (monthlyEl) monthlyEl.textContent = formatInt(monthly);
    if (readyEl) readyEl.textContent = `${formatInt(readyMin)}–${formatInt(readyMax)}`;
    if (lostEl) lostEl.textContent = `${formatInt(lostMin)}–${formatInt(lostMax)}`;
    if (dailyDisplay) dailyDisplay.textContent = String(daily);

    const pctReady = monthly > 0 ? (readyMax / monthly) * 100 : 0;
    const pctLost = monthly > 0 ? (lostMax / monthly) * 100 : 0;

    if (panel) {
      panel.style.setProperty("--w-total", "100%");
      panel.style.setProperty("--w-ready", `${Math.min(100, pctReady)}%`);
      panel.style.setProperty("--w-lost", `${Math.min(100, pctLost)}%`);
      const t = ((daily - min) / (max - min)) * 100;
      panel.style.setProperty("--slider-fill", `${t}%`);
    }

    if (glow) {
      glow.style.width = `${((daily - min) / (max - min)) * 100}%`;
    }

    slider?.setAttribute("aria-valuenow", String(daily));
  };

  apply(Number(slider?.value) || 100);

  slider?.addEventListener("input", () => {
    apply(Number(slider.value));
  });

  const show = () => {
    panel?.classList.add("widget-loss--inview");
    apply(Number(slider?.value) || 100);
  };

  if (reduced) {
    show();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        show();
        io.disconnect();
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  if (panel) io.observe(panel);
})();
