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