"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Clapperboard,
  Compass,
  Library,
  CalendarDays,
  Activity,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/library", label: "Library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Clapperboard className="h-6 w-6 text-brand-400" />
          <span className="font-semibold text-lg tracking-tight hidden sm:inline">
            Seerr2
          </span>
        </Link>

        <form onSubmit={onSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search movies & TV…"
            className="w-full rounded-full bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </form>

        <nav className="flex items-center gap-1 ml-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                  active
                    ? "bg-brand-600/20 text-brand-300"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
