import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { count, toggleCart } = useCart();
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-white/10 border-b border-white/15"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16">
        <a
          href="/"
          className="text-white font-bold uppercase tracking-[0.28em] text-xs sm:text-sm"
        >
          AV · Parfums
        </a>
        <div className="hidden md:flex items-center gap-8 text-white/90 text-sm uppercase tracking-widest">
          <a href="#" className="hover:text-white transition">Boutique</a>
          <a href="#" className="hover:text-white transition">Nouveautés</a>
          <a href="#" className="hover:text-white transition">À propos</a>
          <a href="#" className="hover:text-white transition">Contact</a>
        </div>
        <button
          onClick={toggleCart}
          aria-label="Ouvrir le panier"
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition"
        >
          <ShoppingBag size={20} strokeWidth={2} />
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center bg-white text-black"
              style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}
            >
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}