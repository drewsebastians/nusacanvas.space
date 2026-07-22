(function () {
  "use strict";

  function setupNavigation() {
    const header = document.querySelector("[data-public-header]");
    if (!header) return;
    const toggle = header.querySelector(".nav-toggle");
    const links = header.querySelector(".nav-links");
    if (!toggle || !links) return;

    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      links.removeAttribute("data-open");
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      links.toggleAttribute("data-open", open);
    });
    links.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        close();
        toggle.focus();
      }
    });
  }

  function setupCarousel() {
    const carousel = document.querySelector("[data-carousel]");
    if (!carousel) return;
    const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
    const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
    const viewport = carousel.querySelector(".carousel-viewport");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (slides.length < 2 || slides.length !== dots.length) return;

    let active = 0;
    let timer = null;
    let pointerPaused = false;
    let touchStart = null;

    function paused() {
      return pointerPaused || document.hidden || reducedMotion.matches;
    }

    function syncTimer() {
      clearInterval(timer);
      timer = null;
      if (!paused()) timer = setInterval(() => show((active + 1) % slides.length), 7000);
    }

    function loadVisual(slide) {
      const image = slide.querySelector("img[data-src]");
      if (!image) return;
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    }

    function show(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const selected = slideIndex === active;
        slide.classList.toggle("is-active", selected);
        dots[slideIndex].setAttribute("aria-current", String(selected));
      });
      loadVisual(slides[active]);
      syncTimer();
    }

    dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));
    viewport?.addEventListener("pointerenter", () => { pointerPaused = true; syncTimer(); });
    viewport?.addEventListener("pointerleave", () => { pointerPaused = false; syncTimer(); });
    carousel.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const x = touch.clientX - touchStart.x;
      const y = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y)) show(active + (x < 0 ? 1 : -1));
    }, { passive: true });
    carousel.querySelector(".carousel-controls")?.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const index = event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 : active + (event.key === "ArrowRight" ? 1 : -1);
      show(index, true);
      dots[active].focus();
    });
    document.addEventListener("visibilitychange", syncTimer);
    reducedMotion.addEventListener?.("change", syncTimer);
    slides.forEach((slide, index) => {
      slide.hidden = false;
      dots[index].setAttribute("aria-current", String(index === active));
    });
    syncTimer();
  }

  function setupDeferredImages() {
    const images = [...document.querySelectorAll("img[data-card-src]")];
    if (!images.length) return;
    const load = (image) => {
      image.src = image.dataset.cardSrc;
      image.removeAttribute("data-card-src");
    };
    if (!("IntersectionObserver" in window)) return images.forEach(load);
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < .25) return;
      load(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: .25 });
    images.forEach((image) => observer.observe(image));
  }

  setupNavigation();
  setupCarousel();
  setupDeferredImages();
}());
