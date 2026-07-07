import { createFileRoute } from "@tanstack/react-router";

import Hero from "@/components/Hero";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AV Parfums — Brumes de luxe" },
      { property: "og:title", content: "AV Parfums — Brumes de luxe" },
    ],
  }),
  component: Hero,
});
