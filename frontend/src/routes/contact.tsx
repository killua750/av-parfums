import { createFileRoute } from "@tanstack/react-router";
import { Clock, Instagram, Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — AV Parfums" }] }),
  component: ContactPage,
});

const CONTACT_EMAIL = "contact@avparfums.dz";
const CONTACT_PHONE = "+213 550 00 00 00";

function ContactPage() {
  const { t } = useTranslation();

  const channels = [
    {
      icon: Mail,
      title: t("contact.emailTitle"),
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: Phone,
      title: t("contact.phoneTitle"),
      value: CONTACT_PHONE,
      href: `tel:${CONTACT_PHONE.replace(/\s/g, "")}`,
    },
    {
      icon: Instagram,
      title: "Instagram",
      value: "@av.parfums",
      href: "https://instagram.com",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 pt-28 pb-20 px-4 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
          {t("contact.eyebrow")}
        </p>
        <h1
          className="mb-6 text-4xl sm:text-5xl uppercase leading-tight"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("contact.title")}
        </h1>
        <p className="mb-12 max-w-xl text-base leading-relaxed text-white/70">
          {t("contact.intro")}
        </p>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {channels.map(({ icon: Icon, title, value, href }) => (
            <a
              key={title}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="group rounded-2xl border border-white/10 p-5 transition hover:border-white/30"
            >
              <Icon size={20} strokeWidth={1.7} className="mb-4 text-white/60" />
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider">{title}</h3>
              <p className="break-all text-sm text-white/50 group-hover:text-white transition">
                {value}
              </p>
            </a>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Clock size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-white/50" />
          <div>
            <p className="text-sm font-semibold">{t("contact.hoursTitle")}</p>
            <p className="text-sm text-white/50">{t("contact.hoursText")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
