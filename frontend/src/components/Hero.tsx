// The signature AV Parfums hero: immersive full-screen backgrounds with
// crossfade, floating bottle, ghost product name, tint-driven hover states and
// swipe / wheel / keyboard navigation. Visuals are unchanged from the
// original — the product data now comes from the API (with a local fallback).
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useFeaturedProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { formatDA } from "@/lib/format";
import { api } from "@/lib/api";
import type { Product, ProductDetail } from "@/lib/types";

const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.08'/></svg>`,
  );

const easing = "cubic-bezier(0.4,0,0.2,1)";

export default function Hero() {
  const { t } = useTranslation();
  const { data: products = [] } = useFeaturedProducts();
  const cart = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverBtn, setHoverBtn] = useState<"prev" | "next" | null>(null);
  const [ctaHover, setCtaHover] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelLock = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    products.forEach((p) => {
      [p.bottle_image, p.background_image].forEach((src) => {
        if (src) new Image().src = src;
      });
    });
  }, [products]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navigate = (dir: "next" | "prev") => {
    if (isAnimating || products.length < 2) return;
    setDirection(dir === "next" ? 1 : -1);
    setIsAnimating(true);
    setActiveIndex((p) =>
      dir === "next" ? (p + 1) % products.length : (p + products.length - 1) % products.length,
    );
    window.setTimeout(() => setIsAnimating(false), 850);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Once the page is scrolled past the hero, the wheel belongs to the page.
      if (window.scrollY > 8) return;
      if (Math.abs(e.deltaY) < 20 && Math.abs(e.deltaX) < 20) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Scrolling down on the last product releases into the page content
      // below; scrolling up on the first does nothing anyway (already at top).
      if (delta > 0 && activeIndexRef.current === products.length - 1) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      navigate(delta > 0 ? "next" : "prev");
      window.setTimeout(() => {
        wheelLock.current = false;
      }, 900);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, products.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    navigate(dx < 0 ? "next" : "prev");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigate("next");
      else if (e.key === "ArrowLeft") navigate("prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, products.length]);

  const addToCart = async (product: Product) => {
    try {
      // The list payload has no variants — fetch the detail for the default one.
      const detail = await api<ProductDetail>(`/api/v1/products/${product.slug}/`);
      const variant = detail.variants[0];
      if (!variant) throw new Error("no variant");
      cart.add(detail, variant);
      toast.success(t("cart.added"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (products.length === 0) return <div style={{ height: "100vh", background: "#0d0d0f" }} />;
  const active = products[Math.min(activeIndex, products.length - 1)];

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: active.tint,
        transition: `background-color 800ms ${easing}`,
        fontFamily: "Inter, sans-serif",
        touchAction: "pan-y",
      }}
    >
      <div className="relative w-full" style={{ height: "100vh", overflow: "hidden" }}>
        {products.map((p, i) => (
          <div
            key={p.slug + "-bg"}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: p.background_image ? `url("${p.background_image}")` : undefined,
              backgroundColor: p.tint,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === activeIndex ? 1 : 0,
              transform: i === activeIndex ? "scale(1)" : "scale(1.06)",
              transition: `opacity 800ms ${easing}, transform 1200ms ${easing}`,
              zIndex: 1,
            }}
          />
        ))}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)",
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 50,
            backgroundImage: `url("${GRAIN_SVG}")`,
            backgroundSize: "200px 200px",
            backgroundRepeat: "repeat",
            opacity: 0.4,
          }}
        />

        {/* Ghost product name */}
        <div
          className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 3, top: isMobile ? "14%" : "18%" }}
        >
          <h1
            key={active.name + "-ghost"}
            className="ghost-title"
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: isMobile ? "clamp(48px, 18vw, 100px)" : "clamp(70px, 15vw, 220px)",
              fontWeight: 900,
              color: "#ffffff",
              opacity: isMobile ? 0.16 : 0.22,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
              margin: 0,
              textShadow: "0 8px 30px rgba(0,0,0,0.15)",
            }}
          >
            {active.name}
          </h1>
        </div>

        {/* Floating bottles */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          {products.map((p, i) => {
            const isActive = i === activeIndex;
            const enterFrom = direction === 1 ? 80 : -80;
            return (
              <img
                key={p.slug + "-bottle"}
                src={p.bottle_image ?? undefined}
                alt={p.name}
                draggable={false}
                className={isActive ? "floating-bottle" : ""}
                style={{
                  position: "absolute",
                  height: isMobile ? "52%" : "82%",
                  width: "auto",
                  objectFit: "contain",
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "translateY(0) scale(1)"
                    : `translateX(${enterFrom}px) translateY(20px) scale(0.92)`,
                  transition: `opacity 650ms ${easing}, transform 850ms ${easing}`,
                  filter:
                    "drop-shadow(0 40px 40px rgba(0,0,0,0.35)) drop-shadow(0 15px 20px rgba(0,0,0,0.25))",
                  willChange: "transform, opacity",
                }}
              />
            );
          })}
        </div>

        {/* Bottom-left product info + nav */}
        <div
          className="absolute left-4 right-4 bottom-6 sm:right-auto sm:bottom-16 sm:left-16 text-center sm:text-left"
          style={{ zIndex: 60, maxWidth: isMobile ? undefined : 360 }}
        >
          <div
            className="inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              color: "#fff",
            }}
          >
            {active.volume ?? active.tagline}
          </div>
          <h2
            className="mb-2 text-xl sm:text-[26px] font-bold uppercase tracking-wider"
            style={{ color: "#fff", letterSpacing: "0.06em" }}
          >
            {active.name}
          </h2>
          <p
            className="text-xs sm:text-sm mb-3 mx-auto sm:mx-0 max-w-xs sm:max-w-none"
            style={{ color: "#fff", opacity: 0.9, lineHeight: 1.6 }}
          >
            {active.description}
          </p>
          <div
            className="mb-4 text-2xl sm:text-3xl font-bold"
            style={{ color: "#fff", fontFamily: "Anton, sans-serif", letterSpacing: "0.02em" }}
          >
            {active.price ? formatDA(active.price) : ""}
          </div>

          <div className="flex gap-3 items-center justify-center sm:justify-start flex-wrap">
            <button
              onClick={() => void addToCart(active)}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-4 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: ctaHover ? active.tint : "#fff",
                color: ctaHover ? "#fff" : "#111",
                border: `2px solid ${ctaHover ? active.tint : "#fff"}`,
                transition:
                  "background-color 250ms, color 250ms, transform 200ms, box-shadow 250ms",
                transform: ctaHover ? "translateY(-2px)" : "none",
                boxShadow: ctaHover ? `0 14px 32px ${active.tint}80` : "0 8px 20px rgba(0,0,0,0.2)",
              }}
            >
              <ShoppingBag size={16} strokeWidth={2.25} />
              {t("hero.buy")}
            </button>

            {(["prev", "next"] as const).map((dir) => {
              const Icon = dir === "prev" ? ArrowLeft : ArrowRight;
              const hovered = hoverBtn === dir;
              return (
                <button
                  key={dir}
                  aria-label={t(`hero.${dir}`)}
                  onClick={() => navigate(dir)}
                  onMouseEnter={() => setHoverBtn(dir)}
                  onMouseLeave={() => setHoverBtn(null)}
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: hovered ? active.tint : "transparent",
                    border: "2px solid #fff",
                    color: "#fff",
                    transform: hovered ? "scale(1.08)" : "scale(1)",
                    transition: "transform 200ms, background-color 250ms, box-shadow 250ms",
                    boxShadow: hovered ? `0 10px 30px ${active.tint}80` : "none",
                  }}
                >
                  <Icon size={22} strokeWidth={2.25} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Pagination dots */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex gap-2"
          style={{ zIndex: 60, bottom: isMobile ? 12 : 20 }}
        >
          {products.map((p, i) => (
            <button
              key={p.slug + "-dot"}
              aria-label={t("hero.goTo", { index: i + 1 })}
              onClick={() => {
                if (i === activeIndex || isAnimating) return;
                setDirection(i > activeIndex ? 1 : -1);
                setIsAnimating(true);
                setActiveIndex(i);
                window.setTimeout(() => setIsAnimating(false), 850);
              }}
              className="rounded-full"
              style={{
                width: i === activeIndex ? 28 : 8,
                height: 8,
                backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.5)",
                transition: `width 350ms ${easing}, background-color 350ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
