'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Building2, ClipboardList, HardHat, LayoutDashboard, LogOut, Menu, Moon, Package, PieChart,
  Receipt, ScrollText, Sun, Users, Wallet, X, Settings,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ChatWidget } from './chat-widget';

interface NavItem { href: string; label: string; icon: React.ReactNode; mobile?: boolean }

const GESTOR: NavItem[] = [
  { href: '/', label: 'Painel', icon: <LayoutDashboard className="h-5 w-5" />, mobile: true },
  { href: '/obras', label: 'Obras', icon: <Building2 className="h-5 w-5" />, mobile: true },
  { href: '/gastos', label: 'Gastos', icon: <Receipt className="h-5 w-5" />, mobile: true },
  { href: '/cobrancas', label: 'Cobranças', icon: <Wallet className="h-5 w-5" />, mobile: true },
  { href: '/investidores', label: 'Investidores', icon: <Users className="h-5 w-5" /> },
  { href: '/estoque', label: 'Estoque', icon: <Package className="h-5 w-5" /> },
  { href: '/equipes', label: 'Equipes', icon: <HardHat className="h-5 w-5" /> },
  { href: '/rateios', label: 'Vendas e rateios', icon: <PieChart className="h-5 w-5" /> },
  { href: '/usuarios', label: 'Usuários', icon: <Users className="h-5 w-5" /> },
  { href: '/auditoria', label: 'Auditoria', icon: <ScrollText className="h-5 w-5" /> },
];

const INVESTIDOR: NavItem[] = [
  { href: '/', label: 'Painel', icon: <LayoutDashboard className="h-5 w-5" />, mobile: true },
  { href: '/obras', label: 'Minhas obras', icon: <Building2 className="h-5 w-5" />, mobile: true },
  { href: '/cobrancas', label: 'Cobranças', icon: <Wallet className="h-5 w-5" />, mobile: true },
  { href: '/gastos', label: 'Gastos', icon: <ClipboardList className="h-5 w-5" /> },
  { href: '/rateios', label: 'Extrato de lucros', icon: <PieChart className="h-5 w-5" />, mobile: true },
];

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn('rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground', className)}
      aria-label={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
      {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function AppShellClient({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const user = session?.user as any;
  const role = user?.role ?? 'INVESTIDOR';
  const itens = role === 'GESTOR' ? GESTOR : INVESTIDOR;

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const navLink = (item: NavItem) => (
    <Link key={item.href} href={item.href} onClick={() => setAberto(false)}
      className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
      {item.icon}{item.label}
    </Link>
  );

  const handleSair = () => signOut({ redirectTo: '/login' });

  const rodapeUsuario = (
    <div className="border-t p-3">
      <div className="mb-2 px-1">
        <p className="truncate text-sm font-medium">{user?.nome ?? user?.name ?? ''}</p>
        <p className="truncate text-xs text-muted-foreground">{role === 'GESTOR' ? 'Gestor' : 'Investidor'} · <span suppressHydrationWarning>{user?.email ?? ''}</span></p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/configuracoes" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><Settings className="h-5 w-5" /></Link>
        </div>
        <button onClick={handleSair} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="p-4 flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></span>
          <span className="text-lg tracking-tight">Canteiro</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">{itens.map(navLink)}</nav>
        {rodapeUsuario}
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></span>
          <span className="text-lg tracking-tight">Canteiro</span>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
          <button onClick={() => setAberto(true)} className="rounded-md p-2 hover:bg-accent" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Drawer mobile */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></span>
                <span className="text-lg tracking-tight">Canteiro</span>
              </div>
              <button onClick={() => setAberto(false)} className="rounded-md p-1 hover:bg-accent" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3">{itens.map(navLink)}</nav>
            {rodapeUsuario}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${itens.filter(i => i.mobile).length}, minmax(0, 1fr))` }}>
        {itens.filter(i => i.mobile).map(i => (
          <Link key={i.href} href={i.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              isActive(i.href) ? 'text-primary' : 'text-muted-foreground')}>
            {i.icon}<span className="truncate">{(i.label ?? '').split(' ')[0]}</span>
          </Link>
        ))}
      </nav>

      <ChatWidget />
    </div>
  );
}
