"use strict";
(() => {
  const menu = document.querySelector(".menu-toggle");
  const links = document.getElementById("navigation-links");
  function closeMenu() {
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    links.classList.remove("is-open");
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    links.classList.toggle("is-open", open);
  });
  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".navigation")) closeMenu();
  });
  const mobile = matchMedia("(max-width: 480px)");
  mobile.addEventListener("change", closeMenu);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if ("IntersectionObserver" in window && !reduced.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
    );
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
    document.documentElement.classList.add("motion-ready");
  }
  // Sticky carriers own layout; only their inner surfaces are transformed.
  // Tall cards stick at the viewport bottom so none of their content is skipped.
  const productCards = [
    ...document.querySelectorAll(".products > .product-card"),
  ];
  const deck = document.createElement("div");
  deck.className = "product-deck";
  productCards[0].before(deck);
  const carriers = productCards.map((card, index) => {
    const carrier = document.createElement("div");
    carrier.className = "deck-card";
    carrier.style.setProperty("--deck-index", index);
    card.classList.remove("reveal");
    carrier.append(card);
    deck.append(carrier);
    return carrier;
  });
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let deckTops = [];
  const measureDeck = () => {
    document.documentElement.classList.toggle("deck-active", !reduced.matches);
    deckTops = carriers.map((carrier, index) => {
      const top = Math.min(
        (innerWidth <= 800 ? 100 : 118) + index * 14,
        innerHeight - productCards[index].offsetHeight - 24,
      );
      carrier.style.setProperty("--deck-top", `${top}px`);
      return top;
    });
    updateHeader();
  };
  const animateScenes = () => {
    if (reduced.matches) return;
    const positions = carriers.map(
      (carrier) => carrier.getBoundingClientRect().top,
    );
    positions.forEach((top, index) => {
      const entering = clamp(
        (innerHeight - top) / Math.max(1, innerHeight - deckTops[index]),
      );
      const next = positions[index + 1];
      const covered =
        next == null
          ? 0
          : clamp(
              (innerHeight * 0.72 - next) /
                Math.max(1, innerHeight * 0.72 - deckTops[index] - 14),
            );
      const surface = productCards[index];
      surface.style.setProperty(
        "--deck-scale",
        1 - (1 - entering) * 0.065 - covered * 0.045,
      );
      surface.style.setProperty("--deck-lift", `${(1 - entering) * 65}px`);
      surface.style.setProperty(
        "--deck-turn",
        `${(1 - entering) * (index % 2 ? -3 : 3) - covered * 1.2}deg`,
      );
      surface.style.setProperty("--deck-fold", `${(1 - entering) * 5}deg`);
      surface.style.setProperty("--deck-shade", covered * 0.2);
      // Keep covered links reachable through keyboard navigation.
      carriers[index].classList.toggle(
        "is-front",
        covered < 0.7 && entering > 0.65,
      );
    });
    const hero = document.querySelector(".hero");
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      const progress = clamp(-rect.top / Math.max(1, rect.height));
      hero.style.setProperty("--phone-scroll", `${progress * -65}px`);
      hero.style.setProperty("--phone-scroll-turn", `${progress * 11}deg`);
      hero.style.setProperty("--phone-scroll-scale", 1 - progress * 0.07);
      hero.style.setProperty("--label-scroll", `${progress * -105}px`);
    }
  };
  let scrollFrame = 0;
  const updateHeader = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      document.body.classList.toggle("scrolled", window.scrollY > 24);
      const range = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty(
        "--reading-progress",
        range > 0 ? Math.min(1, scrollY / range) : 0,
      );
      animateScenes();
      scrollFrame = 0;
    });
  };
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  measureDeck();
  window.addEventListener("resize", measureDeck, { passive: true });
  reduced.addEventListener("change", measureDeck);
  document.fonts.ready.then(measureDeck);
  if ("ResizeObserver" in window) {
    const sizes = new ResizeObserver(measureDeck);
    productCards.forEach((card) => sizes.observe(card));
  }
  // A focused covered card scrolls back into view instead of trapping its links.
  carriers.forEach((carrier) =>
    carrier.addEventListener("focusin", () => {
      const index = carriers.indexOf(carrier);
      if (reduced.matches) return;
      const origin = deck.getBoundingClientRect().top + scrollY;
      const gap = parseFloat(getComputedStyle(carrier).marginBottom);
      const before = productCards
        .slice(0, index)
        .reduce((total, card) => total + card.offsetHeight + gap, 0);
      const desired = origin + before - deckTops[index];
      if (Math.abs(scrollY - desired) > 24)
        scrollTo({ top: desired, behavior: "smooth" });
    }),
  );
  // Pointer-driven depth only runs on fine pointers and never with reduced motion.
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  document.querySelectorAll(".hero-art, .product-card").forEach((surface) => {
    let frame = 0;
    surface.addEventListener(
      "pointermove",
      (event) => {
        if (reduced.matches || !finePointer.matches || frame) return;
        const { clientX, clientY } = event;
        frame = requestAnimationFrame(() => {
          const bounds = surface.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(1, (clientX - bounds.left) / bounds.width),
          );
          const y = Math.max(
            0,
            Math.min(1, (clientY - bounds.top) / bounds.height),
          );
          surface.style.setProperty("--shine-x", `${x * 100}%`);
          surface.style.setProperty("--shine-y", `${y * 100}%`);
          surface.style.setProperty("--tilt-x", `${(x - 0.5) * 8}deg`);
          surface.style.setProperty("--tilt-y", `${(0.5 - y) * 6}deg`);
          frame = 0;
        });
      },
      { passive: true },
    );
    surface.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      frame = 0;
      ["--shine-x", "--shine-y", "--tilt-x", "--tilt-y"].forEach((name) =>
        surface.style.removeProperty(name),
      );
    });
  });
  // Pause decorative loops when their section leaves the screen.
  if ("IntersectionObserver" in window) {
    const visibility = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) =>
          entry.target.classList.toggle("motion-paused", !entry.isIntersecting),
        ),
      { rootMargin: "80px" },
    );
    document
      .querySelectorAll(".hero, .product-card, .closing")
      .forEach((section) => visibility.observe(section));
  }
  document.getElementById("year").textContent = new Date().getFullYear();
})();
