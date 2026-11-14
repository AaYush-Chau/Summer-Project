import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarCheck,
  ChevronDown,
  Activity,
  LogOut,
  Paintbrush,
  RefreshCw,
  Briefcase,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAdminDashboard } from "../../api/admin.api";

// ==========================================
// TYPES & CONSTANTS
// ==========================================

type MonthlyPoint = {
  month: string;
  bookings?: number;
  users?: number;
  providers?: number;
};

type StatusCount = { status: string; count: number };
type CategoryCount = { service: string; count: number };
type ActivityItem = { id?: string; message: string; createdAt?: string };

// The four totals are the existing API fields. Everything marked optional is
// shown ONLY when the backend sends it; otherwise a clear empty state appears.
interface DashboardData {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalReviews: number;
  monthlyActivity?: MonthlyPoint[];
  bookingStatus?: StatusCount[];
  popularServices?: CategoryCount[];
  recentActivity?: ActivityItem[];
}

const EMPTY_DATA: DashboardData = {
  totalUsers: 0,
  totalProviders: 0,
  totalBookings: 0,
  totalReviews: 0,
};

// Keys the app may use to keep the login session. Logout removes all of them.
// If your login code stores the token under a different key, add it here.
const AUTH_STORAGE_KEYS = ["accessToken", "token", "user"];
const LOGIN_ROUTE = "/login";

const STATUS_META: { key: string; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "#E3A73A" },
  { key: "accepted", label: "Accepted", color: "#16233B" },
  { key: "rejected", label: "Rejected", color: "#F26B5E" },
  { key: "completed", label: "Completed", color: "#10B981" },
  { key: "cancelled", label: "Cancelled", color: "#9CA3AF" },
];

const SERIES = [
  { key: "bookings", label: "Bookings", color: "#16233B" },
  { key: "users", label: "New users", color: "#E3A73A" },
  { key: "providers", label: "New providers", color: "#F26B5E" },
] as const;

const QUICK_ACTIONS: {
  title: string;
  description: string;
  to: string;
  Icon: LucideIcon;
}[] = [
  {
    title: "Manage Users",
    description: "View and manage registered customers.",
    to: "/admin/users",
    Icon: Users,
  },
  {
    title: "Manage Providers",
    description: "View and manage service providers.",
    to: "/admin/providers",
    Icon: UserCheck,
  },
  {
    title: "Manage Bookings",
    description: "Monitor customer service bookings.",
    to: "/admin/bookings",
    Icon: CalendarCheck,
  },
  {
    title: "Manage Reviews",
    description: "Monitor customer reviews.",
    to: "/admin/reviews",
    Icon: Star,
  },
];

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asArray = <T,>(value: unknown): T[] | undefined =>
  Array.isArray(value) ? (value as T[]) : undefined;

// Safely turns whatever the API returned into a DashboardData
const normalizeDashboard = (raw: unknown): DashboardData => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    totalUsers: toNumber(r.totalUsers),
    totalProviders: toNumber(r.totalProviders),
    totalBookings: toNumber(r.totalBookings),
    totalReviews: toNumber(r.totalReviews),
    monthlyActivity: asArray<MonthlyPoint>(r.monthlyActivity),
    bookingStatus: asArray<StatusCount>(r.bookingStatus),
    popularServices: asArray<CategoryCount>(r.popularServices),
    recentActivity: asArray<ActivityItem>(r.recentActivity),
  };
};

const serviceIcon = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes("plumb")) return Wrench;
  if (n.includes("electr")) return Zap;
  if (n.includes("clean")) return Sparkles;
  if (n.includes("paint")) return Paintbrush;
  return Briefcase;
};

const formatDate = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ==========================================
// SHARED PIECES
// ==========================================

const Panel = ({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
  >
    <h2 className="text-base font-bold text-[#16233B] sm:text-lg">{title}</h2>
    {subtitle && <p className="mt-0.5 text-sm text-[#6B7280]">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const EmptyState = ({
  Icon,
  title,
  message,
}: {
  Icon: LucideIcon;
  title: string;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-[#F7F4EE]/50 px-4 py-10 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#E3A73A] shadow-sm">
      <Icon size={20} aria-hidden="true" />
    </span>
    <p className="mt-3 text-sm font-semibold text-[#16233B]">{title}</p>
    <p className="mt-1 max-w-xs text-xs text-[#6B7280]">{message}</p>
  </div>
);

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`}
    aria-hidden="true"
  />
);

// ==========================================
// HEADER (date, notifications, profile, refresh, logout)
// ==========================================

const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) => {
  useEffect(() => {
    if (!active) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOutside();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, onOutside, active]);
};

const DashboardHeader = ({
  refreshing,
  onRefresh,
  onLogout,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) => {
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(bellRef, () => setBellOpen(false), bellOpen);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#E3A73A]">
          Welcome back, Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#16233B] sm:text-3xl">
          Dashboard Overview
        </h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Monitor and manage your GharSewa platform.
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">{today}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => {
              setBellOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={bellOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <Bell size={18} aria-hidden="true" />
          </button>
          {bellOpen && (
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-lg">
              <p className="text-sm font-semibold text-[#16233B]">
                No new notifications
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                You're all caught up.
              </p>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setBellOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16233B] text-sm font-bold text-white">
              A
            </span>
            <span className="hidden text-sm font-semibold text-[#16233B] sm:inline">
              Admin
            </span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`text-gray-400 transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-[#16233B]">Admin</p>
                <p className="text-xs text-[#6B7280]">Administrator</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#F26B5E] transition-colors hover:bg-[#F26B5E]/10 focus:outline-none focus-visible:bg-[#F26B5E]/10"
              >
                <LogOut size={16} aria-hidden="true" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Visible logout button */}
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-[#16233B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2"
        >
          <LogOut size={16} aria-hidden="true" />
          Logout
        </button>
      </div>
    </header>
  );
};

// ==========================================
// STAT CARDS
// ==========================================

const StatCard = ({
  title,
  value,
  Icon,
  loading,
}: {
  title: string;
  value: number;
  Icon: LucideIcon;
  loading: boolean;
}) => (
  <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-[#6B7280]">{title}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-20" />
        ) : (
          <p className="mt-2 text-3xl font-bold tabular-nums text-[#16233B]">
            {value.toLocaleString()}
          </p>
        )}
      </div>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7F4EE] text-[#E3A73A] transition-colors duration-300 group-hover:bg-[#E3A73A] group-hover:text-white">
        <Icon size={22} aria-hidden="true" />
      </span>
    </div>
  </div>
);

// ==========================================
// CHARTS (plain SVG / CSS, no extra dependencies)
// ==========================================

const analyticsNotConnected = (
  Icon: LucideIcon,
  title: string,
  field: string
) => (
  <EmptyState
    Icon={Icon}
    title={title}
    message={`Analytics API not connected yet. Return "${field}" from getAdminDashboard() to show this chart.`}
  />
);

const BookingAnalytics = ({ data }: { data?: MonthlyPoint[] }) => {
  const points = (data ?? []).filter((p) => p && p.month);
  const hasData = points.some((p) => toNumber(p.bookings) > 0);

  return (
    <Panel
      title="Booking Analytics"
      subtitle="Monthly booking volume"
      className="lg:col-span-2"
    >
      {!data ? (
        analyticsNotConnected(
          CalendarCheck,
          "No booking analytics",
          "monthlyActivity"
        )
      ) : !hasData ? (
        <EmptyState
          Icon={CalendarCheck}
          title="No bookings recorded"
          message="Monthly booking activity will appear here once bookings are made."
        />
      ) : (
        (() => {
          const max = Math.max(...points.map((p) => toNumber(p.bookings)), 1);
          return (
            <div
              className="flex h-56 items-end gap-2 sm:gap-3"
              role="img"
              aria-label="Bar chart of monthly bookings"
            >
              {points.map((p) => {
                const value = toNumber(p.bookings);
                const height = (value / max) * 100;
                return (
                  <div
                    key={p.month}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    title={`${p.month}: ${value} bookings`}
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-[#16233B] opacity-0 transition-opacity group-hover:opacity-100">
                      {value}
                    </span>
                    <div
                      className="w-full max-w-[44px] rounded-t-lg bg-[#16233B] transition-colors duration-200 group-hover:bg-[#E3A73A]"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="w-full truncate text-center text-[11px] text-[#6B7280]">
                      {p.month}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </Panel>
  );
};

const BookingStatusChart = ({ data }: { data?: StatusCount[] }) => {
  const rows = STATUS_META.map((meta) => ({
    ...meta,
    count: toNumber(
      data?.find((d) => d.status?.toLowerCase() === meta.key)?.count
    ),
  }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Panel title="Booking Status" subtitle="Current distribution">
      {!data ? (
        analyticsNotConnected(Activity, "No status data", "bookingStatus")
      ) : total === 0 ? (
        <EmptyState
          Icon={Activity}
          title="No bookings yet"
          message="Status distribution will appear once bookings exist."
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-40 w-40">
            <svg
              viewBox="0 0 140 140"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label="Donut chart of booking statuses"
            >
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#F3F4F6"
                strokeWidth="16"
              />
              {rows
                .filter((r) => r.count > 0)
                .map((r) => {
                  const length = (r.count / total) * circumference;
                  const circle = (
                    <circle
                      key={r.key}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="none"
                      stroke={r.color}
                      strokeWidth="16"
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-offset}
                    >
                      <title>{`${r.label}: ${r.count}`}</title>
                    </circle>
                  );
                  offset += length;
                  return circle;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-[#16233B]">
                {total.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#6B7280]">Bookings</span>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between text-sm"
              >
                <span className="inline-flex items-center gap-2 text-[#6B7280]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  {r.label}
                </span>
                <span className="font-semibold tabular-nums text-[#16233B]">
                  {r.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};

const PopularCategories = ({ data }: { data?: CategoryCount[] }) => {
  const rows = (data ?? [])
    .filter((d) => d && d.service)
    .map((d) => ({ service: d.service, count: toNumber(d.count) }))
    .sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Panel title="Popular Services" subtitle="Most booked categories">
      {!data ? (
        analyticsNotConnected(Briefcase, "No category data", "popularServices")
      ) : total === 0 ? (
        <EmptyState
          Icon={Briefcase}
          title="No bookings by category"
          message="Popular services will appear once bookings are made."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const Icon = serviceIcon(r.service);
            const pct = (r.count / total) * 100;
            return (
              <li key={r.service}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2.5 font-semibold text-[#16233B]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F4EE] text-[#E3A73A]">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="truncate capitalize">{r.service}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[#6B7280]">
                    {r.count.toLocaleString()} · {Math.round(pct)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#E3A73A] transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

const PlatformActivity = ({ data }: { data?: MonthlyPoint[] }) => {
  const points = (data ?? []).filter((p) => p && p.month);
  const hasData = points.some((p) =>
    SERIES.some((s) => toNumber(p[s.key]) > 0)
  );

  return (
    <Panel
      title="Monthly Platform Activity"
      subtitle="Registrations and bookings by month"
      className="lg:col-span-2"
    >
      {!data ? (
        analyticsNotConnected(Activity, "No platform activity", "monthlyActivity")
      ) : !hasData ? (
        <EmptyState
          Icon={Activity}
          title="No activity recorded"
          message="Registrations and bookings will appear here as they happen."
        />
      ) : (
        (() => {
          const max = Math.max(
            ...points.flatMap((p) => SERIES.map((s) => toNumber(p[s.key]))),
            1
          );
          return (
            <>
              <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
                {SERIES.map((s) => (
                  <span
                    key={s.key}
                    className="inline-flex items-center gap-2 text-xs text-[#6B7280]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </span>
                ))}
              </div>
              <div
                className="flex h-52 items-end gap-3 overflow-x-auto pb-1"
                role="img"
                aria-label="Grouped bar chart of monthly platform activity"
              >
                {points.map((p) => (
                  <div
                    key={p.month}
                    className="flex h-full min-w-[48px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      {SERIES.map((s) => {
                        const value = toNumber(p[s.key]);
                        return (
                          <div
                            key={s.key}
                            title={`${p.month} · ${s.label}: ${value}`}
                            className="w-3 rounded-t-md transition-opacity hover:opacity-80 sm:w-4"
                            style={{
                              height: `${Math.max((value / max) * 100, 2)}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-[#6B7280]">
                      {p.month}
                    </span>
                  </div>
                ))}
              </div>
            </>
          );
        })()
      )}
    </Panel>
  );
};

// ==========================================
// RECENT ACTIVITY + QUICK ACTIONS
// ==========================================

const RecentActivity = ({ data }: { data?: ActivityItem[] }) => (
  <Panel title="Recent Activity" subtitle="Latest platform events">
    {!data ? (
      analyticsNotConnected(Activity, "No activity feed", "recentActivity")
    ) : data.length === 0 ? (
      <EmptyState
        Icon={Activity}
        title="No recent activity"
        message="New registrations, bookings and reviews will be listed here."
      />
    ) : (
      <ul className="space-y-4">
        {data.slice(0, 8).map((item, index) => {
          const when = formatDate(item.createdAt);
          return (
            <li key={item.id ?? index} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E3A73A]"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="break-words text-sm text-[#16233B]">
                  {item.message}
                </p>
                {when && (
                  <time
                    dateTime={item.createdAt}
                    className="text-xs text-[#6B7280]"
                  >
                    {when}
                  </time>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Panel>
);

const QuickActions = ({ onNavigate }: { onNavigate: (to: string) => void }) => (
  <Panel
    title="Quick Administration Actions"
    subtitle="Jump straight to the main areas of the platform"
  >
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_ACTIONS.map(({ title, description, to, Icon }) => (
        <button
          key={to}
          type="button"
          onClick={() => onNavigate(to)}
          className="group flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[#E3A73A]/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4EE] text-[#E3A73A]">
            <Icon size={20} aria-hidden="true" />
          </span>
          <h3 className="mt-3 font-semibold text-[#16233B]">{title}</h3>
          <p className="mt-1 flex-1 text-sm text-[#6B7280]">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#F26B5E]">
            Open
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </span>
        </button>
      ))}
    </div>
  </Panel>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stops a second request from starting while one is already running
  const inFlight = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      setLoading(true);
      setError("");

      const response = await getAdminDashboard();

      if (response.status === true) {
        setData(normalizeDashboard(response.data));
      } else {
        setError(response.message || "Failed to load dashboard data.");
      }
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } } | undefined
      )?.response?.data?.message;
      setError(message || "Unable to connect to admin API.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Destroys the saved access token (and session data) and returns to login
  const handleLogout = useCallback(() => {
    AUTH_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // storage can be blocked; navigation below still happens
      }
    });
    navigate(LOGIN_ROUTE, { replace: true });
  }, [navigate]);

  const cards: { title: string; value: number; Icon: LucideIcon }[] = [
    { title: "Total Users", value: data.totalUsers, Icon: Users },
    { title: "Service Providers", value: data.totalProviders, Icon: UserCheck },
    { title: "Total Bookings", value: data.totalBookings, Icon: CalendarCheck },
    { title: "Total Reviews", value: data.totalReviews, Icon: Star },
  ];

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader
          refreshing={loading}
          onRefresh={loadDashboard}
          onLogout={handleLogout}
        />

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-red-500"
              />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load dashboard
                </p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16233B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.title} {...card} loading={loading} />
          ))}
        </div>

        {/* Analytics */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <BookingAnalytics data={data.monthlyActivity} />
          <BookingStatusChart data={data.bookingStatus} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <PlatformActivity data={data.monthlyActivity} />
          <PopularCategories data={data.popularServices} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickActions onNavigate={(to) => navigate(to)} />
          </div>
          <RecentActivity data={data.recentActivity} />
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;