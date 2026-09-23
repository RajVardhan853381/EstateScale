'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Building2,
  LayoutDashboard,
  Users,
  Contact,
  Zap,
  GitBranch,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface OrgSidebarProps {
  slug: string;
  orgName: string;
  userEmail: string;
  userRole: string;
  isPlatformAdmin?: boolean;
}

export function OrgSidebar({
  slug,
  orgName,
  userEmail,
  userRole,
  isPlatformAdmin,
}: OrgSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      label: 'Dashboard',
      href: `/org/${slug}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: 'Leads Pipeline',
      href: `/org/${slug}/leads`,
      icon: Users,
    },
    {
      label: 'Contacts',
      href: `/org/${slug}/contacts`,
      icon: Contact,
    },
    {
      label: 'Automations',
      href: `/org/${slug}/automations`,
      icon: Zap,
    },
    {
      label: 'Visual Journeys',
      href: `/org/${slug}/journeys`,
      icon: GitBranch,
    },
    {
      label: 'Analytics & BI',
      href: `/org/${slug}/analytics`,
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: `/org/${slug}/settings/security`,
      icon: Settings,
    },
  ];

  const adminNavItems = isPlatformAdmin
    ? [
        {
          label: 'Operations Center',
          href: '/admin/ops',
          icon: Shield,
        },
        {
          label: 'Client Onboarding',
          href: '/admin/onboarding',
          icon: Layers,
        },
      ]
    : [];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Brand & Organization Header */}
      <div className="p-5 border-b border-slate-200">
        <Link href={`/org/${slug}/dashboard`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900 truncate tracking-tight text-base leading-tight">
              {orgName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                MLS Real-Time
              </span>
            </div>
          </div>
        </Link>

        {/* Switch Organization Quick Pill */}
        <Link
          href="/org/select"
          className="mt-3.5 w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-all"
        >
          <span className="truncate">Switch Workspace</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-1 flex-shrink-0" />
        </Link>
      </div>

      {/* Main CRM Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Workflows
        </div>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/org/${slug}/dashboard` && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-50/90 text-indigo-700 shadow-xs border border-indigo-200/70'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0 animate-pulse" />
              )}
            </Link>
          );
        })}

        {/* Platform Admin Tools */}
        {adminNavItems.length > 0 && (
          <div className="pt-4 mt-4 border-t border-slate-200/70 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-600">
              Platform Governance
            </div>
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-50/90 text-purple-700 shadow-xs border border-purple-200/70'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User Footer & Sign Out */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-xs font-bold text-slate-900 truncate">{userEmail}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {userRole}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="w-64 h-screen flex-shrink-0 hidden md:flex flex-col z-30">
        {navContent}
      </aside>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-extrabold text-slate-900 text-sm truncate max-w-[180px]">
            {orgName}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar-drawer"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div id="mobile-sidebar-drawer" className="relative w-72 max-w-full h-full shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
