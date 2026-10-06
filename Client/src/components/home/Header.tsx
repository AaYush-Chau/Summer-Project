import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, UserRound, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

// Navigation items (same destinations as before)
const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Categories", href: "#categories" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Professionals", href: "#professionals" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  const token = localStorage.getItem("access_token");

  // Get saved user information if available
  const storedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setMenuOpen(false);

    navigate("/login");
  };

  // Dashboard based on account type
  const dashboardPath =
    user?.role === "provider"
      ? "/professional/dashboard"
      : "/customer/dashboard";

  // Close the mobile menu with the Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Home is active on "/" with no hash; section links are active when the URL hash matches
  const isActive = (link: (typeof NAV_LINKS)[number]) =>
    link.to ? pathname === link.to && !hash : hash === link.href;

  // Shared button styles
  const joinBtn =
    "group inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md active:translate-y-0";

  const logoutBtn =
    "group inline-flex items-center justify-center gap-2 rounded-xl border border-[#16233B]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] active:translate-y-0";

  return (
    <header className="sticky top-0 z-50 border-b border-[#16233B]/5 bg-white shadow-sm">
      {/* Navbar */}
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="justify-self-start text-2xl font-extrabold tracking-tight text-[#16233B] transition-opacity duration-200 hover:opacity-80"
        >
          Ghar<span className="text-[#E3A73A]">Sewa</span>
        </Link>

        {/* Desktop Menu (centered) */}
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            const classes = `relative py-2 transition-colors duration-200 hover:text-[#F26B5E] ${
              active ? "text-[#F26B5E]" : "text-[#16233B]"
            }`;

            const indicator = active && (
              <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#E3A73A]" />
            );

            return link.to ? (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-current={active ? "page" : undefined}
                className={classes}
              >
                {link.label}
                {indicator}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                aria-current={active ? "location" : undefined}
                className={classes}
              >
                {link.label}
                {indicator}
              </a>
            );
          })}
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
                Join GharSewa
              </Link>
            </>
          ) : (
            <>
              {/* Logged in */}
              <Link
                to={dashboardPath}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#16233B]/80 transition-colors duration-200 hover:text-[#F26B5E]"
              >
                Dashboard
              </Link>

              <button onClick={handleLogout} className={logoutBtn}>
                <LogOut
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
                Logout
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
        className={`grid transition-all duration-200 ease-out md:hidden ${
          menuOpen
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#16233B]/5 bg-white px-4 pb-5 pt-3">
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
                    onClick={() => {
                      setMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={classes}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
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
                    Join GharSewa
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl border border-[#16233B]/15 py-3 text-center text-sm font-semibold text-[#16233B] transition-colors duration-200 hover:border-[#F26B5E] hover:text-[#F26B5E]"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#16233B] py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#F26B5E]"
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