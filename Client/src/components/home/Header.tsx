import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, UserRound, LogOut } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import {
  UnauthorizedError,
  clearAuth,
  getCurrentUser,
  readStoredUser,
  resolveAssetUrl,
  saveStoredUser,
  type AuthUser,
} from "../../api/user.api"; // adjust the path to where you place user.api.ts

// Navigation items (same destinations as before)
const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Categories", href: "#categories" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Professionals", href: "#professionals" },
];

// Smooth unless the user prefers reduced motion
const getScrollBehavior = (): ScrollBehavior =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Which section is currently active ("" = Home / top of page)
  const [activeHash, setActiveHash] = useState("");

  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  // Auth state: token + signed-in user (cached copy shows instantly,
  // then it is refreshed from GET /auth/me)
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("access_token")
  );
  const [profile, setProfile] = useState<AuthUser | null>(() =>
    readStoredUser()
  );

  // Pick up a login/logout that happened on another route
  useEffect(() => {
    setToken(localStorage.getItem("access_token"));
  }, [pathname]);

  // Fetch /auth/me once per token (not on every render)
  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    setProfile(readStoredUser());

    const controller = new AbortController();

    getCurrentUser(token, controller.signal)
      .then((fresh) => {
        setProfile((previous) => ({ ...previous, ...fresh }));
        saveStoredUser(fresh);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Expired / invalid token -> treat the user as logged out
        if (error instanceof UnauthorizedError) {
          clearAuth();
          setToken(null);
          setProfile(null);
        }
        // Any other error: keep showing the cached user
      });

    return () => controller.abort();
  }, [token]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setToken(null);
    setProfile(null);
    setMenuOpen(false);

    navigate("/login");
  };

  // Role-based dashboard link (the username opens this), display name and avatar
  const isProvider = profile?.role === "provider";

  const dashboardPath = isProvider
    ? "/professional/dashboard"
    : "/customer/dashboard";

  const displayName = profile?.fullname ?? profile?.email ?? "Account";
  const avatarSrc = resolveAssetUrl(profile?.image);

  /* ---------------------------------------------------------------- */
  /*  Refs for smooth navigation                                       */
  /* ---------------------------------------------------------------- */

  const navRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<(HTMLElement | null)[]>([]);

  // While a click-triggered scroll is running we ignore observer updates,
  // so the indicator doesn't flicker through intermediate sections.
  const lockActive = useRef(false);
  const lockTarget = useRef<string | null>(null);
  const lockTimer = useRef<number | undefined>(undefined);
  const syncRef = useRef<(() => void) | null>(null);

  // Target to scroll to after navigating from another page
  const pendingRef = useRef<string | null>(null);

  const endLock = useCallback(() => {
    lockActive.current = false;
    lockTarget.current = null;
    syncRef.current?.(); // re-sync active link with the real scroll position
  }, []);

  const startLock = useCallback(() => {
    lockActive.current = true;
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(endLock, 1000);
  }, [endLock]);

  // Close the mobile menu with the Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep targets clear of the sticky navbar (native + scrollIntoView aware)
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;

    const update = () => {
      const height = navRef.current?.offsetHeight ?? 64;
      root.style.scrollPaddingTop = `${height + 8}px`;
    };

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      root.style.scrollPaddingTop = previous;
    };
  }, []);

  // End the click-scroll lock as soon as the browser finishes scrolling
  useEffect(() => {
    window.addEventListener("scrollend", endLock);
    return () => {
      window.removeEventListener("scrollend", endLock);
      window.clearTimeout(lockTimer.current);
    };
  }, [endLock]);

  // Keep activeHash in sync with the URL (route / hash changes)
  useEffect(() => {
    setActiveHash(pathname === "/" ? hash : "");
  }, [pathname, hash]);

  // Active section detection while scrolling (IntersectionObserver)
  useEffect(() => {
    if (pathname !== "/") return;

    const ids = NAV_LINKS.filter((link) => link.href).map((link) =>
      (link.href as string).slice(1)
    );

    let observer: IntersectionObserver | null = null;
    let retryTimer: number | undefined;

    const setup = () => {
      const sections = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      if (sections.length === 0) return false;

      // The active section is the last one whose top has passed the 30% line
      const compute = () => {
        if (lockActive.current) return;

        const line = window.innerHeight * 0.3;
        let current = "";
        let best = -Infinity;

        for (const section of sections) {
          const top = section.getBoundingClientRect().top;
          if (top <= line && top > best) {
            best = top;
            current = `#${section.id}`;
          }
        }

        setActiveHash((previous) => (previous === current ? previous : current));
      };

      syncRef.current = compute;

      // Thin band near the top of the viewport; fires only when sections cross it
      observer = new IntersectionObserver(compute, {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      });
      sections.forEach((section) => observer?.observe(section));

      return true;
    };

    // Sections may mount slightly later (lazy content), so retry once
    if (!setup()) retryTimer = window.setTimeout(setup, 400);

    return () => {
      observer?.disconnect();
      window.clearTimeout(retryTimer);
      syncRef.current = null;
    };
  }, [pathname]);

  // After navigating to "/" from another page, glide to the requested target
  useEffect(() => {
    if (pathname !== "/" || !pendingRef.current) return;

    const target = pendingRef.current;

    // New page always starts at the top
    window.scrollTo(0, 0);

    if (target === "top") {
      pendingRef.current = null;
      return;
    }

    let tries = 0;
    let timer: number | undefined;

    const attempt = () => {
      const el = document.getElementById(target);
      if (el) {
        pendingRef.current = null;
        lockTarget.current = target;
        startLock();
        el.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
      } else if (tries++ < 10) {
        timer = window.setTimeout(attempt, 100);
      } else {
        pendingRef.current = null;
      }
    };

    timer = window.setTimeout(attempt, 60);
    return () => window.clearTimeout(timer);
  }, [pathname, startLock]);

  /* ---------------------------------------------------------------- */
  /*  Click handlers                                                   */
  /* ---------------------------------------------------------------- */

  // Home: let <Link> navigate to "/", then glide back to the top
  const handleHomeClick = () => {
    setMenuOpen(false);
    setActiveHash("");

    if (pathname === "/") {
      lockTarget.current = "top";
      startLock();
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    } else {
      pendingRef.current = "top";
    }
  };

  // Section links: glide to the section (or go home first, then glide)
  const handleSectionClick = (
    e: MouseEvent<HTMLAnchorElement>,
    link: (typeof NAV_LINKS)[number]
  ) => {
    // Let the browser handle ctrl/cmd/shift/middle clicks (new tab etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const targetHash = link.href ?? "";
    const id = targetHash.slice(1);

    e.preventDefault();
    setMenuOpen(false);
    setActiveHash(targetHash);

    // On another page: go to the homepage, then scroll once it has rendered
    if (pathname !== "/") {
      pendingRef.current = id;
      navigate({ pathname: "/", hash: targetHash });
      return;
    }

    // Ignore repeated clicks on the section we're already gliding to
    if (lockActive.current && lockTarget.current === id) return;

    const el = document.getElementById(id);
    if (!el) return;

    lockTarget.current = id;
    startLock();

    navigate({ pathname: "/", hash: targetHash }, { replace: hash === targetHash });
    el.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
  };

  // Home is active on "/" with no section; section links are active when their hash matches
  const isActive = (link: (typeof NAV_LINKS)[number]) =>
    link.to ? pathname === link.to && !activeHash : activeHash === link.href;

  /* ---------------------------------------------------------------- */
  /*  Sliding gold indicator                                           */
  /* ---------------------------------------------------------------- */

  const [indicator, setIndicator] = useState({
    x: 0,
    visible: false,
    animate: false,
  });

  const activeIndex = NAV_LINKS.findIndex(isActive);

  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current[activeIndex];

      if (activeIndex < 0 || !el) {
        setIndicator((prev) => ({ ...prev, visible: false }));
        return;
      }

      // Centre the 20px line under the active link
      const x = el.offsetLeft + el.offsetWidth / 2 - 10;

      // Only slide if it was already visible; otherwise appear in place
      setIndicator((prev) => ({ x, visible: true, animate: prev.visible }));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex]);

  // Shared button styles
  const joinBtn =
    "group inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md active:translate-y-0";

  const logoutBtn =
    "group inline-flex items-center justify-center gap-2 rounded-lg border border-[#16233B]/15 bg-white px-2.5 py-2 text-sm font-medium text-[#16233B] transition-colors duration-200 hover:border-[#F26B5E] hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] lg:px-4";

  return (
    <header className="sticky top-0 z-50 border-b border-[#16233B]/5 bg-white shadow-sm">
      {/* Navbar */}
      <nav
        ref={navRef}
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={handleHomeClick}
          className="justify-self-start text-2xl font-extrabold tracking-tight text-[#16233B] transition-opacity duration-200 hover:opacity-80"
        >
          Sewa<span className="text-[#E3A73A]">Khoj</span>
        </Link>

        {/* Desktop Menu (centered) */}
        <div
          ref={menuRef}
          className="relative hidden items-center gap-8 text-sm font-medium md:flex"
        >
          {NAV_LINKS.map((link, index) => {
            const active = isActive(link);

            // Coral text on hover + a small underline that grows from the centre
            const classes = `relative py-2 transition-colors duration-200 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] rounded after:absolute after:-bottom-0.5 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-[#F26B5E] after:transition-all after:duration-300 hover:after:w-5 ${
              active ? "text-[#F26B5E] after:hidden" : "text-[#16233B]"
            }`;

            return link.to ? (
              <Link
                key={link.label}
                ref={(el) => {
                  linkRefs.current[index] = el;
                }}
                to={link.to}
                onClick={handleHomeClick}
                aria-current={active ? "page" : undefined}
                className={classes}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                ref={(el) => {
                  linkRefs.current[index] = el;
                }}
                href={link.href}
                onClick={(e) => handleSectionClick(e, link)}
                aria-current={active ? "location" : undefined}
                className={classes}
              >
                {link.label}
              </a>
            );
          })}

          {/* Gold indicator that slides between the active items */}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-0.5 left-0 h-0.5 w-5 rounded-full bg-[#E3A73A] motion-reduce:!transition-none"
            style={{
              transform: `translateX(${indicator.x}px)`,
              opacity: indicator.visible ? 1 : 0,
              transition: indicator.animate
                ? "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms"
                : "opacity 200ms",
            }}
          />
        </div>

        {/* Right Side (desktop) */}
        <div className="hidden items-center gap-2 justify-self-end md:flex">
          {!token ? (
            <>
              {/* Not logged in */}
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#16233B]/80 transition-colors duration-200 hover:text-[#F26B5E]"
              >
                Sign In
              </Link>

              <Link to="/register" className={joinBtn}>
                <UserRound
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                Join SewaKhoj
              </Link>
            </>
          ) : (
            <>
              {/* Logged in */}
              <Link
                to={dashboardPath}
                title={displayName}
                aria-label={`Open dashboard: ${displayName}`}
                className="group inline-flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#16233B] transition-colors duration-200 hover:bg-[#16233B]/[0.04] hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
              >
                <UserAvatar key={avatarSrc ?? "none"} src={avatarSrc} />
                <span className="max-w-[5rem] truncate lg:max-w-[10rem]">
                  {displayName}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                aria-label="Logout"
                className={logoutBtn}
              >
                <LogOut
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="-mr-2 rounded-xl p-2 text-[#16233B] transition-colors duration-200 hover:bg-[#F7F4EE] md:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu (always rendered so it can animate) */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={`grid transition-all duration-300 ease-out motion-reduce:transition-none md:hidden ${
          menuOpen
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-[#16233B]/5 bg-white px-4 pb-5 pt-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${
              menuOpen ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            {/* Links */}
            <div className="space-y-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link);
                const classes = `block rounded-xl px-3 py-3 text-base font-medium transition-colors duration-200 hover:bg-[#F7F4EE] hover:text-[#F26B5E] ${
                  active
                    ? "bg-[#F7F4EE] text-[#F26B5E]"
                    : "text-[#16233B]"
                }`;

                return link.to ? (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={handleHomeClick}
                    aria-current={active ? "page" : undefined}
                    className={classes}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleSectionClick(e, link)}
                    aria-current={active ? "location" : undefined}
                    className={classes}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            {/* Auth actions */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#16233B]/10 pt-4">
              {!token ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl border border-[#16233B]/15 py-3 text-center text-sm font-semibold text-[#16233B] transition-colors duration-200 hover:border-[#F26B5E] hover:text-[#F26B5E]"
                  >
                    Sign In
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#16233B] py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#F26B5E]"
                  >
                    <UserRound size={16} />
                    Join SewaKhoj
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMenuOpen(false)}
                    aria-label={`Open dashboard: ${displayName}`}
                    className="col-span-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-[#16233B]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
                  >
                    <UserAvatar
                      key={avatarSrc ?? "none"}
                      src={avatarSrc}
                      size="md"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#16233B]">
                        {displayName}
                      </span>
                      {profile?.email && (
                        <span className="block truncate text-xs text-gray-500">
                          {profile.email}
                        </span>
                      )}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-[#16233B]/15 py-3 text-sm font-semibold text-[#16233B] transition-colors duration-200 hover:border-[#F26B5E] hover:text-[#F26B5E]"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


// Minimal circular avatar: backend image when valid, otherwise a simple UserRound icon
function UserAvatar({
  src,
  size = "sm",
}: {
  src: string | null;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const box = size === "md" ? "h-10 w-10" : "h-8 w-8";

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-[#16233B]`}
    >
      <UserRound size={size === "md" ? 20 : 17} strokeWidth={1.75} />
    </span>
  );
}