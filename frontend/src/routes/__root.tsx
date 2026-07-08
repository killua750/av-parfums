import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { organizationJsonLd } from "@/lib/seo";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "AV Parfums — Brumes de luxe" },
      {
        name: "description",
        content:
          "Brumes parfumées Sweet Dreams & Honey Touch — livraison partout en Algérie, paiement à la livraison.",
      },
      { property: "og:title", content: "AV Parfums — Brumes de luxe" },
      {
        property: "og:description",
        content:
          "Brumes parfumées Sweet Dreams & Honey Touch — livraison partout en Algérie, paiement à la livraison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{ type: "application/ld+json", children: organizationJsonLd() }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <Navbar />
      <Outlet />
      <Footer />
      <CartDrawer />
      <Toaster richColors position="top-center" />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
          404
        </h1>
        <p className="mt-4 text-sm text-white/60">Cette page n'existe pas.</p>
        <Link
          to="/"
          className="mt-6 inline-flex px-6 py-3 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
