"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, Users, UserSquare2, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { ThemeToggle } from "@/presentation/components/ui/ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useSession } from "@/presentation/components/auth/SessionProvider";
import { cn } from "@/core/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/trabajadores", label: "Trabajadores", icon: UserSquare2 },
  { href: "/usuarios", label: "Usuarios", icon: Users },
];

const PUBLIC = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Ruta pública o sesión aún no resuelta → sin shell
  if (PUBLIC.has(pathname) || !ready || !user) {
    return <>{children}</>;
  }

  const titulo = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.label ?? "Panel";

  return (
    <div className={cn(
      "min-h-dvh lg:grid transition-[grid-template-columns] duration-200",
      collapsed ? "lg:grid-cols-[92px_1fr]" : "lg:grid-cols-[256px_1fr]"
    )}>
      {mobileOpen && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col",
          "clay m-3 lg:m-4",
          "transition-[transform,width] duration-200 ease-out",
          // Móvil: drawer fixed de 240px que entra/sale
          "fixed inset-y-0 left-0 w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0",
          // Desktop: sticky en el grid y ancho automático según collapsed
          "lg:static lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]",
          "lg:inset-auto lg:w-auto",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          {!collapsed ? (
            <span className="text-lg font-black tracking-tight leading-none">
              <AuroraText>Kylian José</AuroraText>
            </span>
          ) : (
            <span className="hidden lg:block text-xl font-black leading-none mx-auto">
              <AuroraText>KJ</AuroraText>
            </span>
          )}
          {collapsed && (
            <span className="lg:hidden text-lg font-black tracking-tight leading-none">
              <AuroraText>Kylian José</AuroraText>
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-foreground/5 lg:hidden"
            aria-label="Cerrar menú"
          ><X className="h-4 w-4" /></button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-2 flex-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-gradient-to-b from-[color:var(--primary)] to-[#0056d6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_rgba(0,108,255,0.35)]"
                    : "hover:bg-[color:var(--primary)]/10 hover:text-[color:var(--primary)]",
                  collapsed && "lg:justify-center lg:px-2"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 mt-2">
          <UserMenu nombre={user.nombre} correo={user.correo} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="sticky top-0 z-30 mx-3 mt-3 lg:mx-4 lg:mt-4 clay clay-sm">
          <div className="flex items-center gap-3 px-3 sm:px-5 h-14">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-foreground/5 lg:hidden"
              aria-label="Abrir menú"
            ><Menu className="h-4 w-4" /></button>

            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:grid h-9 w-9 place-items-center rounded-xl hover:bg-foreground/5"
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">{titulo}</h2>
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-4 lg:px-6 pb-8 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
