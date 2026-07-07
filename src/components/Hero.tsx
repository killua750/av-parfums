import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { PRODUCTS, formatDA } from "@/data/products";
import { useCart } from "@/context/CartContext";

const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.08'/></svg>`,
  );

export default function Hero() {
  const { add } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverBtn, setHoverBtn] = useState<"prev" | "next" | null>(null);
  const [ctaHover, setCtaHover] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelLock = useRef(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    PRODUCTS.forEach((p) => {
      [p.bottle, p.bg].forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navigate = (dir: "next" | "prev") => {
    if (isAnimating) return;
    setDirection(dir === "next" ? 1 : -1);
    setIsAnimating(true);
    setActiveIndex((p) =>
      dir === "next"
        ? (p + 1) % PRODUCTS.length
        : (p + PRODUCTS.length - 1) % PRODUCTS.length,
    );
    window.setTimeout(() => setIsAnimating(false), 850);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 20 && Math.abs(e.deltaX) < 20) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      navigate(delta > 0 ? "next" : "prev");
      window.setTimeout(() => {
        wheelLock.current = false;
      }, 900);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isAnimating]);

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
  }, [isAnimating]);

  const easing = "cubic-bezier(0.4,0,0.2,1)";
  const active = PRODUCTS[activeIndex];

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
        {PRODUCTS.map((p, i) => (
          <div
            key={p.bg}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${p.bg}")`,
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
              animation: `ghostIn 700ms ${easing} both`,
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
          {PRODUCTS.map((p, i) => {
            const isActive = i === activeIndex;
            const enterFrom = direction === 1 ? 80 : -80;
            return (
              <img
                key={p.bottle}
                src={p.bottle}
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
            style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff" }}
          >
            {active.volume}
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
            {formatDA(active.price)}
          </div>

          <div className="flex gap-3 items-center justify-center sm:justify-start flex-wrap">
            <button
              onClick={() => add(active)}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-4 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: ctaHover ? active.tint : "#fff",
                color: ctaHover ? "#fff" : "#111",
                border: `2px solid ${ctaHover ? active.tint : "#fff"}`,
                transition: "background-color 250ms, color 250ms, transform 200ms, box-shadow 250ms",
                transform: ctaHover ? "translateY(-2px)" : "none",
                boxShadow: ctaHover ? `0 14px 32px ${active.tint}80` : "0 8px 20px rgba(0,0,0,0.2)",
              }}
            >
              <ShoppingBag size={16} strokeWidth={2.25} />
              Acheter
            </button>

            {(["prev", "next"] as const).map((dir) => {
              const Icon = dir === "prev" ? ArrowLeft : ArrowRight;
              const hovered = hoverBtn === dir;
              return (
                <button
                  key={dir}
                  aria-label={dir === "prev" ? "Précédent" : "Suivant"}
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
          {PRODUCTS.map((_, i) => (
            <button
              key={i}
              aria-label={`Aller au produit ${i + 1}`}
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

      <style>{`
        @keyframes floatBottle {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -14px; }
        }
        .floating-bottle {
          animation: floatBottle 5.5s ease-in-out infinite;
        }
        @keyframes ghostIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: var(--ghost-opacity, 0.22); transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}