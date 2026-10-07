import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { createBooking, type BookingInput } from "../../api/booking.api";
import type { Provider, Availability } from "../services/ServiceProviders";

// ==========================================
// TYPES & LOCAL PRESENTATION STYLES
// ==========================================

type BookingErrors = {
  bookingDate?: string;
  bookingTime?: string;
  address?: string;
  description?: string;
};

type BookingTouched = {
  bookingDate?: boolean;
  bookingTime?: boolean;
  address?: boolean;
  description?: boolean;
};

type BookingProps = {
  open: boolean;
  provider: Provider | null;
  name: string;
  imageSrc: string | null;
  serviceName: string;
  onClose: () => void;
  onBack: () => void;
};

type TimeSlot = {
  /** Stored value, HH:mm (matches BookingInput.bookingTime) */
  value: string;
  /** Display label, h:mm AM/PM */
  label: string;
  /** Minutes since midnight in Nepal Time */
  minutes: number;
};

type TimeGroup = {
  key: string;
  label: string;
  Icon: LucideIcon;
  slots: TimeSlot[];
};

type PickerPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  placement: "below" | "above";
};

type ClosePickerOptions = {
  validate: boolean;
  restoreFocus: boolean;
};

type CalendarCell = {
  iso: string;
  day: number;
};

const AVAILABILITY_STYLES: Record<
  Availability,
  { badge: string; dot: string }
> = {
  Available: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Busy: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  Unavailable: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const NO_SLOTS_TODAY =
  "No more service times are available today. Please choose another date.";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

// ==========================================
// NEPAL TIME (Asia/Kathmandu, UTC+05:45)
// ==========================================

const NPT_TIME_ZONE = "Asia/Kathmandu";

const pad = (value: number): string => String(value).padStart(2, "0");

type NepalParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getNepalParts = (date = new Date()): NepalParts => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: NPT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const hour = Number(read("hour"));

    return {
      year: Number(read("year")),
      month: Number(read("month")),
      day: Number(read("day")),
      hours: Number.isFinite(hour) ? hour % 24 : 0,
      minutes: Number(read("minute")) || 0,
      seconds: Number(read("second")) || 0,
    };
  } catch {
    const shifted = new Date(
      date.getTime() +
        date.getTimezoneOffset() * 60000 +
        (5 * 60 + 45) * 60000
    );
    return {
      year: shifted.getFullYear(),
      month: shifted.getMonth() + 1,
      day: shifted.getDate(),
      hours: shifted.getHours(),
      minutes: shifted.getMinutes(),
      seconds: shifted.getSeconds(),
    };
  }
};

const toNepalISO = (parts: Pick<NepalParts, "year" | "month" | "day">): string =>
  `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;

const formatCivilDate = (
  iso: string,
  options: Intl.DateTimeFormatOptions
): string => {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso || "";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
};

const formatDisplayDate = (iso: string): string => {
  if (!iso) return "—";
  return formatCivilDate(iso, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCardDate = (iso: string): string => {
  if (!iso) return "";
  return formatCivilDate(iso, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const formatDisplayTime = (time: string): string => {
  if (!time) return "—";
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${pad(minutes)} ${period}`;
};

const slotMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

// Nepal service hours, 30-minute slots, 10:00–18:00 NPT.
// Morning ends before noon. Afternoon starts at 12:00. Evening starts at 4:00.
const buildTimeGroups = (): TimeGroup[] => {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  for (let total = 10 * 60; total <= 18 * 60; total += 30) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const value = `${pad(hours)}:${pad(minutes)}`;
    const slot: TimeSlot = {
      value,
      label: formatDisplayTime(value),
      minutes: total,
    };

    if (hours < 12) morning.push(slot);
    else if (hours < 16) afternoon.push(slot);
    else evening.push(slot);
  }

  return [
    { key: "morning", label: "Morning", Icon: Sunrise, slots: morning },
    { key: "afternoon", label: "Afternoon", Icon: Sun, slots: afternoon },
    { key: "evening", label: "Evening", Icon: Sunset, slots: evening },
  ];
};

const TIME_GROUPS: TimeGroup[] = buildTimeGroups();

const ALLOWED_SLOTS = new Map(
  TIME_GROUPS.flatMap((group) =>
    group.slots.map((slot) => [slot.value, slot.minutes] as const)
  )
);

const buildCalendarCells = (year: number, month: number): Array<CalendarCell | null> => {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<CalendarCell | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      iso: `${year}-${pad(month + 1)}-${pad(day)}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const chunkWeeks = (cells: Array<CalendarCell | null>) => {
  const weeks: Array<Array<CalendarCell | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
};

// ==========================================
// PICKER POSITIONING (portal, not clipped by the modal)
// ==========================================

const computePickerPosition = (trigger: HTMLElement): PickerPosition => {
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const gap = 8;
  const preferredHeight = 440;

  const width = Math.min(360, vw - margin * 2);
  const left = Math.max(
    margin,
    Math.min(rect.right - width, vw - margin - width)
  );

  const spaceBelow = vh - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;

  if (Math.max(spaceBelow, spaceAbove) < 260) {
    return {
      left,
      width,
      top: margin,
      maxHeight: vh - margin * 2,
      placement: "below",
    };
  }

  if (spaceBelow >= Math.min(preferredHeight, 360) || spaceBelow >= spaceAbove) {
    return {
      left,
      width,
      top: rect.bottom + gap,
      maxHeight: Math.min(preferredHeight, spaceBelow),
      placement: "below",
    };
  }

  return {
    left,
    width,
    bottom: vh - rect.top + gap,
    maxHeight: Math.min(preferredHeight, spaceAbove),
    placement: "above",
  };
};

const pickerMotionClass = (open: boolean, visible: boolean): string =>
  `fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
    visible
      ? "translate-y-0 scale-100 opacity-100"
      : open
        ? "pointer-events-none translate-y-1 scale-[0.98] opacity-0"
        : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
  }`;

function useAnchoredPicker({
  open,
  triggerRef,
  onRequestClose,
  initialFocusSelectors,
}: {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onRequestClose: (options: ClosePickerOptions) => void;
  initialFocusSelectors: string[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<PickerPosition | null>(null);
  const closeRef = useRef(onRequestClose);
  const focusSelectorsRef = useRef(initialFocusSelectors);
  closeRef.current = onRequestClose;
  focusSelectorsRef.current = initialFocusSelectors;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPos(computePickerPosition(trigger));
  };

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.setTimeout(() => setVisible(true), 16);
      return () => window.clearTimeout(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(id);
  }, [open]);

  useLayoutEffect(() => {
    if (mounted) updatePosition();
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;

      closeRef.current({ validate: true, restoreFocus: false });

      if (target.closest?.('[aria-label="Close dialog"]')) {
        const swallow = (followUp: Event) => {
          followUp.stopPropagation();
          followUp.preventDefault();
          document.removeEventListener("click", swallow, true);
        };
        document.addEventListener("click", swallow, true);
        window.setTimeout(
          () => document.removeEventListener("click", swallow, true),
          400
        );
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        closeRef.current({ validate: true, restoreFocus: true });
        return;
      }

      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel || !panel.contains(document.activeElement)) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not(:disabled)")
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!visible) return;
    const panel = panelRef.current;
    if (!panel) return;
    for (const selector of focusSelectorsRef.current) {
      const target = panel.querySelector<HTMLElement>(selector);
      if (target) {
        target.focus({ preventScroll: true });
        break;
      }
    }
  }, [visible]);

  return { panelRef, mounted, visible, pos };
}

// ==========================================
// INDEPENDENT MINI-COMPONENTS
// ==========================================

const LocalDetailRow = ({
  Icon,
  label,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-[#F7F4EE]/60 p-3">
    <Icon size={16} className="mt-0.5 shrink-0 text-[#16233B]/60" />
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-[#16233B]">
        {children}
      </dd>
    </div>
  </div>
);

const LocalProviderImage = ({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile photo`}
        onError={() => setFailed(true)}
        loading="lazy"
        className="h-full w-full rounded-full object-cover object-center"
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#F7F4EE]">
      <span className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#E3A73A]/15" />
      <span className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-[#F26B5E]/10" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#16233B] shadow-sm">
        <UserRound size={28} strokeWidth={1.5} />
      </span>
    </div>
  );
};

const scheduleControlClass = (hasError: boolean, isOpen: boolean): string =>
  `group flex min-h-[72px] w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left outline-none transition-all duration-200 focus-visible:border-[#E3A73A] focus-visible:ring-2 focus-visible:ring-[#E3A73A]/40 motion-reduce:transition-none ${
    hasError
      ? "border-red-300 bg-red-50/40 focus-visible:border-red-400 focus-visible:ring-red-200"
      : isOpen
        ? "border-[#E3A73A] ring-2 ring-[#E3A73A]/20"
        : "border-gray-200 hover:border-[#E3A73A]"
  }`;

const ScheduleField = ({
  id,
  label,
  Icon,
  valueText,
  placeholder,
  helper,
  open,
  error,
  errorId,
  controlsId,
  buttonRef,
  onClick,
}: {
  id: string;
  label: string;
  Icon: LucideIcon;
  valueText: string;
  placeholder: string;
  helper: string;
  open: boolean;
  error?: string;
  errorId: string;
  controlsId: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#16233B]"
    >
      <Icon size={13} />
      {label}
    </label>
    <button
      ref={buttonRef}
      id={id}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={controlsId}
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
      className={scheduleControlClass(!!error, open)}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7F4EE] text-[#16233B]">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-semibold ${
            valueText ? "text-[#16233B]" : "text-gray-400"
          }`}
        >
          {valueText || placeholder}
        </span>
        <span className="block truncate text-[11px] text-gray-500">{helper}</span>
      </span>
      <ChevronRight
        size={16}
        className={`shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-[#E3A73A] motion-reduce:transition-none ${
          open ? "rotate-90" : ""
        }`}
      />
    </button>
    {error && (
      <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
        {error}
      </p>
    )}
  </div>
);

type LocalModalShellProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  maxWidth?: string;
};

const LocalModalShell = ({
  open,
  onClose,
  labelledBy,
  children,
  maxWidth = "max-w-[620px]",
}: LocalModalShellProps) => {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 220);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className={`absolute inset-0 bg-[#16233B]/60 backdrop-blur-sm ${
          closing ? "gs-overlay-out" : "gs-overlay-in"
        }`}
      />

      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl ${
          closing ? "gs-modal-out" : "gs-modal-in"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// ==========================================
// CONTROLLED BOOKING MODAL
// ==========================================

export default function Booking({
  open,
  provider,
  name,
  imageSrc,
  serviceName,
  onClose,
  onBack,
}: BookingProps) {
  const navigate = useNavigate();
  const [clock, setClock] = useState(() => Date.now());
  const nepalNow = getNepalParts(new Date(clock));
  const today = toNepalISO(nepalNow);
  const nowMinutes =
    nepalNow.hours * 60 + nepalNow.minutes + nepalNow.seconds / 60;

  const [form, setForm] = useState<BookingInput>({
    providerId: provider?._id || "",
    service: provider?.service || "plumber",
    bookingDate: "",
    bookingTime: "",
    address: "",
    description: "",
  });

  const [errors, setErrors] = useState<BookingErrors>({});
  const [touched, setTouched] = useState<BookingTouched>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: nepalNow.year,
    month: nepalNow.month - 1,
  }));

  const dateRef = useRef<HTMLButtonElement>(null);
  const timeRef = useRef<HTMLButtonElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open && provider) {
      setClock(Date.now());
      setForm({
        providerId: provider._id,
        service: provider.service,
        bookingDate: "",
        bookingTime: "",
        address: "",
        description: "",
      });
      setErrors({});
      setTouched({});
      setApiError("");
      setSuccess(false);
      setSubmitting(false);
      setDatePickerOpen(false);
      setPickerOpen(false);
    }
  }, [open, provider]);

  useEffect(() => {
    if (!open) {
      setDatePickerOpen(false);
      setPickerOpen(false);
    }
  }, [open]);

  const noRemainingSlots = (date: string): boolean =>
    date === today &&
    TIME_GROUPS.every((group) =>
      group.slots.every((slot) => slot.minutes < nowMinutes)
    );

  const validateField = (
    field: keyof BookingErrors,
    values: BookingInput
  ): string | undefined => {
    switch (field) {
      case "bookingDate": {
        if (!values.bookingDate) return "Please select a valid booking date.";
        if (values.bookingDate < today) {
          return "Booking date cannot be in the past.";
        }
        return undefined;
      }
      case "bookingTime": {
        if (values.bookingDate && noRemainingSlots(values.bookingDate)) {
          return NO_SLOTS_TODAY;
        }
        if (!values.bookingTime) return "Please select a booking time.";
        const minutes = ALLOWED_SLOTS.get(values.bookingTime);
        if (minutes === undefined) return "Please select a booking time.";
        if (values.bookingDate === today && minutes < nowMinutes) {
          return "Please select a future time.";
        }
        return undefined;
      }
      case "address": {
        const trimmed = values.address.trim();
        if (!trimmed) return "Please enter your service address.";
        if (trimmed.length < 5) return "Address must be at least 5 characters.";
        if (trimmed.length > 200) return "Address must be under 200 characters.";
        return undefined;
      }
      case "description": {
        const trimmed = values.description.trim();
        if (trimmed.length < 5) {
          return "Please describe your service requirement in at least 5 characters.";
        }
        if (trimmed.length > 500) {
          return "Description must be under 500 characters.";
        }
        return undefined;
      }
    }
  };

  const validateBookingForm = (values: BookingInput): BookingErrors => {
    const next: BookingErrors = {};
    (["bookingDate", "bookingTime", "address", "description"] as const).forEach(
      (field) => {
        const message = validateField(field, values);
        if (message) next[field] = message;
      }
    );
    return next;
  };

  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setForm(next);

    if (touched[name as keyof BookingErrors]) {
      const message = validateField(name as keyof BookingErrors, next);
      setErrors((prev) => ({ ...prev, [name]: message }));
    }
  };

  const handleBlur = (
    event:
      | React.FocusEvent<HTMLInputElement>
      | React.FocusEvent<HTMLTextAreaElement>
  ) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const message = validateField(name as keyof BookingErrors, form);
    setErrors((prev) => ({ ...prev, [name]: message }));
  };

  const closeDatePicker = ({ validate, restoreFocus }: ClosePickerOptions) => {
    setDatePickerOpen(false);
    if (validate) {
      setTouched((prev) => ({ ...prev, bookingDate: true }));
      setErrors((prev) => ({
        ...prev,
        bookingDate: validateField("bookingDate", form),
      }));
    }
    if (restoreFocus) window.setTimeout(() => dateRef.current?.focus(), 0);
  };

  const closeTimePicker = ({ validate, restoreFocus }: ClosePickerOptions) => {
    setPickerOpen(false);
    if (validate) {
      setTouched((prev) => ({ ...prev, bookingTime: true }));
      setErrors((prev) => ({
        ...prev,
        bookingTime: validateField("bookingTime", form),
      }));
    }
    if (restoreFocus) window.setTimeout(() => timeRef.current?.focus(), 0);
  };

  const closeDatePickerRef = useRef(closeDatePicker);
  const closeTimePickerRef = useRef(closeTimePicker);
  closeDatePickerRef.current = closeDatePicker;
  closeTimePickerRef.current = closeTimePicker;

  const datePicker = useAnchoredPicker({
    open: datePickerOpen,
    triggerRef: dateRef,
    onRequestClose: (options) => closeDatePickerRef.current(options),
    initialFocusSelectors: [
      '[data-day-selected="true"]:not(:disabled)',
      '[data-today="true"]:not(:disabled)',
      "[data-day]:not(:disabled)",
    ],
  });

  const timePicker = useAnchoredPicker({
    open: pickerOpen,
    triggerRef: timeRef,
    onRequestClose: (options) => closeTimePickerRef.current(options),
    initialFocusSelectors: [
      '[data-slot-selected="true"]:not(:disabled)',
      "[data-slot]:not(:disabled)",
    ],
  });

  useEffect(() => {
    if (!form.bookingDate || !form.bookingTime) return;
    const message = validateField("bookingTime", form);
    if (!message) return;
    if (
      message !== "Please select a future time." &&
      message !== NO_SLOTS_TODAY
    ) {
      return;
    }
    setForm((prev) => ({ ...prev, bookingTime: "" }));
    setTouched((prev) => ({ ...prev, bookingTime: true }));
    setErrors((prev) => ({ ...prev, bookingTime: message }));
  }, [form.bookingDate, form.bookingTime, today, nowMinutes]);

  const openDatePicker = () => {
    if (datePickerOpen) {
      closeDatePicker({ validate: true, restoreFocus: false });
      return;
    }
    if (pickerOpen) closeTimePicker({ validate: false, restoreFocus: false });

    if (form.bookingDate) {
      const [year, month] = form.bookingDate.split("-").map(Number);
      setViewMonth({ year, month: month - 1 });
    } else {
      const fresh = getNepalParts();
      setViewMonth({ year: fresh.year, month: fresh.month - 1 });
    }
    setDatePickerOpen(true);
  };

  const openTimePicker = () => {
    if (pickerOpen) {
      closeTimePicker({ validate: true, restoreFocus: false });
      return;
    }
    if (datePickerOpen) closeDatePicker({ validate: false, restoreFocus: false });
    setPickerOpen(true);
  };

  const handleSelectDate = (iso: string) => {
    if (iso < today) return;

    const previousTime = form.bookingTime;
    const candidate: BookingInput = { ...form, bookingDate: iso, bookingTime: previousTime };
    const timeMessage = previousTime
      ? validateField("bookingTime", candidate)
      : undefined;
    const next: BookingInput = {
      ...candidate,
      bookingTime: timeMessage ? "" : previousTime,
    };

    setForm(next);
    setTouched((prev) => ({
      ...prev,
      bookingDate: true,
      ...(timeMessage ? { bookingTime: true } : {}),
    }));
    setErrors((prev) => ({
      ...prev,
      bookingDate: undefined,
      bookingTime: timeMessage
        ? timeMessage
        : touched.bookingTime
          ? validateField("bookingTime", next)
          : undefined,
    }));
    setDatePickerOpen(false);
    window.setTimeout(() => dateRef.current?.focus(), 0);
  };

  const handleSelectTime = (value: string) => {
    const minutes = ALLOWED_SLOTS.get(value);
    if (minutes === undefined) return;
    if (form.bookingDate === today && minutes < nowMinutes) return;

    const next: BookingInput = { ...form, bookingTime: value };
    setForm(next);
    setTouched((prev) => ({ ...prev, bookingTime: true }));
    setErrors((prev) => ({
      ...prev,
      bookingTime: validateField("bookingTime", next),
    }));
    setPickerOpen(false);
    window.setTimeout(() => timeRef.current?.focus(), 0);
  };

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  };

  const handleCalendarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const iso = target.dataset.day;
    if (!iso) return;
    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : event.key === "ArrowDown"
              ? 7
              : 0;
    if (!delta) return;

    event.preventDefault();
    const [year, month, day] = iso.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + delta));
    const nextIso = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
    if (nextIso < today) return;

    setViewMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    window.setTimeout(() => {
      datePicker.panelRef.current
        ?.querySelector<HTMLElement>(`[data-day="${nextIso}"]`)
        ?.focus();
    }, 0);
  };

  const focusFirstError = (nextErrors: BookingErrors) => {
    if (nextErrors.bookingDate) {
      dateRef.current?.focus();
      return;
    }
    if (nextErrors.bookingTime) {
      timeRef.current?.focus();
      return;
    }
    if (nextErrors.address) {
      addressRef.current?.focus();
      return;
    }
    if (nextErrors.description) descRef.current?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError("");
    setDatePickerOpen(false);
    setPickerOpen(false);

    setTouched({
      bookingDate: true,
      bookingTime: true,
      address: true,
      description: true,
    });

    const nextErrors = validateBookingForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      onClose();
      navigate("/login");
      return;
    }

    const payload: BookingInput = {
      ...form,
      address: form.address.trim(),
      description: form.description.trim(),
    };

    try {
      setSubmitting(true);
      await createBooking(payload);
      setSuccess(true);
    } catch (error: any) {
      console.error("Booking failed:", error);
      setApiError(
        error?.response?.data?.message || "Unable to send booking request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!provider) return null;

  const titleId = `booking-modal-title-${provider._id}`;
  const status =
    AVAILABILITY_STYLES[provider.availability] ??
    AVAILABILITY_STYLES.Unavailable;
  const descLength = form.description.length;
  const hasDate = Boolean(form.bookingDate);
  const hasTime = Boolean(form.bookingTime);
  const noSlotsToday = noRemainingSlots(form.bookingDate);
  const canGoPrev =
    viewMonth.year > nepalNow.year ||
    (viewMonth.year === nepalNow.year && viewMonth.month > nepalNow.month - 1);
  const monthLabel = new Date(
    Date.UTC(viewMonth.year, viewMonth.month, 1)
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const calendarWeeks = chunkWeeks(
    buildCalendarCells(viewMonth.year, viewMonth.month)
  );

  const inputBase =
    "w-full rounded-xl border px-4 py-2.5 text-sm text-[#16233B] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E3A73A]/30";
  const inputOk = "border-gray-200 bg-white focus:border-[#E3A73A]";
  const inputError =
    "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200";

  const datePanel = (
    <div
      ref={datePicker.panelRef}
      id="booking-date-picker"
      role="dialog"
      aria-label="Select a date"
      onKeyDown={handleCalendarKeyDown}
      style={
        datePicker.pos
          ? {
              left: datePicker.pos.left,
              width: datePicker.pos.width,
              maxHeight: datePicker.pos.maxHeight,
              top: datePicker.pos.top,
              bottom: datePicker.pos.bottom,
              transformOrigin:
                datePicker.pos.placement === "below" ? "top right" : "bottom right",
            }
          : { visibility: "hidden" }
      }
      className={pickerMotionClass(datePickerOpen, datePicker.visible)}
    >
      <div className="border-b border-gray-100 bg-[#F7F4EE]/50 px-4 pb-3 pt-4">
        <p className="text-sm font-bold text-[#16233B]">Select a date</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Choose a convenient date for your service
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#16233B]">{monthLabel}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#16233B] transition-colors hover:border-[#E3A73A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#16233B] transition-colors hover:border-[#E3A73A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div role="grid" aria-label={monthLabel}>
          <div role="row" className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                role="columnheader"
                className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400"
              >
                {weekday}
              </div>
            ))}
          </div>
          {calendarWeeks.map((week, weekIndex) => (
            <div key={weekIndex} role="row" className="grid grid-cols-7 gap-y-1">
              {week.map((cell, cellIndex) => {
                if (!cell) {
                  return <span key={`${weekIndex}-${cellIndex}`} aria-hidden="true" />;
                }
                const selected = form.bookingDate === cell.iso;
                const isToday = cell.iso === today;
                const disabled = cell.iso < today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    data-day={cell.iso}
                    data-day-selected={selected ? "true" : "false"}
                    data-today={isToday ? "true" : "false"}
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={formatCardDate(cell.iso)}
                    onClick={() => handleSelectDate(cell.iso)}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] ${
                      disabled
                        ? "cursor-not-allowed text-gray-300"
                        : selected
                          ? "bg-[#16233B] text-white"
                          : isToday
                            ? "text-[#16233B] ring-1 ring-[#E3A73A] hover:bg-[#E3A73A]/10"
                            : "text-[#16233B] hover:bg-[#E3A73A]/10"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <span className="min-w-0 truncate text-xs text-gray-500">
          {hasDate ? (
            <>
              Selected:{" "}
              <span className="font-semibold text-[#16233B]">
                {formatCardDate(form.bookingDate)}
              </span>
            </>
          ) : (
            "No date selected"
          )}
        </span>
        <button
          type="button"
          onClick={() => closeDatePicker({ validate: true, restoreFocus: true })}
          className="shrink-0 rounded-lg bg-[#16233B] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-1"
        >
          Done
        </button>
      </div>
    </div>
  );

  const timePanel = (
    <div
      ref={timePicker.panelRef}
      id="booking-time-picker"
      role="dialog"
      aria-label="Select a time"
      style={
        timePicker.pos
          ? {
              left: timePicker.pos.left,
              width: timePicker.pos.width,
              maxHeight: timePicker.pos.maxHeight,
              top: timePicker.pos.top,
              bottom: timePicker.pos.bottom,
              transformOrigin:
                timePicker.pos.placement === "below" ? "top right" : "bottom right",
            }
          : { visibility: "hidden" }
      }
      className={pickerMotionClass(pickerOpen, timePicker.visible)}
    >
      <div className="border-b border-gray-100 bg-[#F7F4EE]/50 px-4 pb-3 pt-4">
        <p className="text-sm font-bold text-[#16233B]">Select a time</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Choose a convenient time for your service
        </p>
        {hasDate && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16233B]">
            <CalendarDays size={12} className="text-[#E3A73A]" />
            {formatCardDate(form.bookingDate)}
          </p>
        )}
        <p className="mt-2 text-[11px] text-gray-400">Nepal Time · 10:00 AM – 6:00 PM</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {noSlotsToday && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {NO_SLOTS_TODAY}
          </p>
        )}

        {TIME_GROUPS.map(({ key, label, Icon, slots }) => (
          <div key={key} role="group" aria-label={label}>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <Icon size={12} className="text-[#E3A73A]" aria-hidden="true" />
              {label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const selected = form.bookingTime === slot.value;
                const disabled =
                  form.bookingDate === today && slot.minutes < nowMinutes;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    data-slot
                    data-slot-selected={selected ? "true" : "false"}
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => handleSelectTime(slot.value)}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-1 motion-reduce:transition-none ${
                      disabled
                        ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-50"
                        : selected
                          ? "border-[#16233B] bg-[#16233B] text-white"
                          : "border-gray-200 bg-white text-[#16233B] hover:border-[#E3A73A] hover:bg-[#E3A73A]/5"
                    }`}
                  >
                    {selected && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <span className="min-w-0 truncate text-xs text-gray-500">
          {hasTime ? (
            <>
              Selected:{" "}
              <span className="font-semibold text-[#16233B]">
                {formatDisplayTime(form.bookingTime)}
              </span>
            </>
          ) : (
            "No time selected"
          )}
        </span>
        <button
          type="button"
          onClick={() => closeTimePicker({ validate: true, restoreFocus: true })}
          className="shrink-0 rounded-lg bg-[#16233B] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-1"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (success) {
    return (
      <LocalModalShell open={open} onClose={onClose} labelledBy={titleId}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
        >
          <X size={18} />
        </button>

        <div className="p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} />
          </div>
          <h2 id={titleId} className="mt-5 text-xl font-bold text-[#16233B] sm:text-2xl">
            Booking Request Sent!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Your booking request has been successfully sent to{" "}
            <span className="font-semibold text-[#16233B]">{name}</span>.
          </p>
          <dl className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <LocalDetailRow Icon={Briefcase} label="Service">
              {serviceName}
            </LocalDetailRow>
            <LocalDetailRow Icon={UserRound} label="Professional">
              {name}
            </LocalDetailRow>
            <LocalDetailRow Icon={CalendarDays} label="Date">
              {formatDisplayDate(form.bookingDate)}
            </LocalDetailRow>
            <LocalDetailRow Icon={Clock} label="Time">
              {formatDisplayTime(form.bookingTime)}
            </LocalDetailRow>
            <LocalDetailRow Icon={Banknote} label="Starting price">
              NPR {provider.price.toLocaleString()}
            </LocalDetailRow>
            <LocalDetailRow Icon={MapPin} label="Address">
              {form.address.trim()}
            </LocalDetailRow>
          </dl>
          <button
            type="button"
            onClick={onClose}
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#16233B] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 sm:w-auto sm:px-8 motion-reduce:transition-none"
          >
            Done
          </button>
        </div>
      </LocalModalShell>
    );
  }

  return (
    <LocalModalShell open={open} onClose={onClose} labelledBy={titleId}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
      >
        <X size={18} />
      </button>

      <div className="p-6 sm:p-8">
        <button
          type="button"
          onClick={onBack}
          className="group mb-4 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-[#16233B]/70 transition-colors duration-200 hover:text-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          Back to Details
        </button>

        <div>
          <h2 id={titleId} className="text-xl font-bold text-[#16233B] sm:text-2xl">
            Book a Service
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Book <span className="font-semibold text-[#16233B]">{name}</span> for
            your service
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#F7F4EE]/60 p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#F7F4EE] shadow-sm">
            <LocalProviderImage src={imageSrc} name={name} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#16233B]">{name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#F26B5E]">
                {serviceName}
              </span>
              <span className="text-gray-300" aria-hidden="true">
                •
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${status.badge}`}
              >
                <span className={`h-1 w-1 rounded-full ${status.dot}`} aria-hidden="true" />
                {provider.availability}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">From</p>
            <p className="text-sm font-bold text-[#16233B]">
              NPR {provider.price.toLocaleString()}
            </p>
          </div>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Service
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#F7F4EE]/60 px-4 py-2.5 text-sm font-semibold text-[#16233B]">
              <Briefcase size={15} className="text-[#16233B]/60" />
              {serviceName}
            </div>
          </div>

          <section>
            <h3 className="text-sm font-bold text-[#16233B]">
              When do you need the service?
            </h3>
            <p className="mb-3 mt-0.5 text-xs text-gray-500">
              Choose a convenient date and time
            </p>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <ScheduleField
                id="bookingDate"
                label="Booking Date"
                Icon={CalendarDays}
                valueText={hasDate ? formatCardDate(form.bookingDate) : ""}
                placeholder="Select a date"
                helper="Select your preferred service date"
                open={datePickerOpen}
                error={errors.bookingDate}
                errorId="err-bookingDate"
                controlsId="booking-date-picker"
                buttonRef={dateRef}
                onClick={openDatePicker}
              />

              <ScheduleField
                id="bookingTime"
                label="Booking Time"
                Icon={Clock}
                valueText={hasTime ? formatDisplayTime(form.bookingTime) : ""}
                placeholder="Select a time"
                helper={
                  hasTime
                    ? "Your selected booking time"
                    : "Choose your preferred time"
                }
                open={pickerOpen}
                error={errors.bookingTime}
                errorId="err-bookingTime"
                controlsId="booking-time-picker"
                buttonRef={timeRef}
                onClick={openTimePicker}
              />
            </div>

            {noSlotsToday && errors.bookingTime !== NO_SLOTS_TODAY && (
              <p className="mt-3 text-xs font-medium text-amber-700" aria-live="polite">
                {NO_SLOTS_TODAY}
              </p>
            )}

            {datePicker.mounted &&
              typeof document !== "undefined" &&
              createPortal(datePanel, document.body)}
            {timePicker.mounted &&
              typeof document !== "undefined" &&
              createPortal(timePanel, document.body)}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[#16233B]">
              Where is the service needed?
            </h3>
            <label
              htmlFor="address"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#16233B]"
            >
              <MapPin size={13} />
              Service Address
            </label>
            <input
              ref={addressRef}
              id="address"
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={200}
              placeholder="e.g. New Baneshwor, Kathmandu"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "err-address" : undefined}
              className={`${inputBase} ${errors.address ? inputError : inputOk}`}
            />
            {errors.address && (
              <p id="err-address" className="mt-1.5 text-xs font-medium text-red-600">
                {errors.address}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[#16233B]">
              What do you need?
            </h3>
            <label
              htmlFor="description"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#16233B]"
            >
              <FileText size={13} />
              Describe Your Requirement
            </label>
            <textarea
              ref={descRef}
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={4}
              maxLength={500}
              placeholder="Tell the professional what service you need..."
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "err-description" : "desc-count"
              }
              className={`${inputBase} resize-none ${
                errors.description ? inputError : inputOk
              }`}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              {errors.description ? (
                <p id="err-description" className="text-xs font-medium text-red-600">
                  {errors.description}
                </p>
              ) : (
                <span />
              )}
              <span
                id="desc-count"
                className={`text-[11px] tabular-nums ${
                  descLength > 500 ? "text-red-600" : "text-gray-400"
                }`}
              >
                {descLength} / 500
              </span>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[#16233B]">
              Booking Summary
            </h3>
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-[#F7F4EE]/40">
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-semibold text-[#16233B]">{serviceName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">Professional</span>
                <span className="font-semibold text-[#16233B]">{name}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-[#16233B]">
                  {form.bookingDate ? formatDisplayDate(form.bookingDate) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-semibold text-[#16233B]">
                  {form.bookingTime ? formatDisplayTime(form.bookingTime) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">Starting Price</span>
                <span className="font-bold text-[#16233B]">
                  NPR {provider.price.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-[#16233B] motion-reduce:transition-none"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                Confirm Booking
                <ChevronRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </>
            )}
          </button>
        </form>
      </div>
    </LocalModalShell>
  );
}