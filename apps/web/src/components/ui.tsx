import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { useId } from "react";
import { Link } from "@/i18n/navigation";
import { DisplaySettings } from "./DisplaySettings";
import { Awning } from "./illustrations";
import { LanguageSwitcher } from "./LanguageSwitcher";

const primaryClass =
  "flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-chilli px-6 text-center text-lg font-extrabold text-white shadow-float transition hover:brightness-110 active:translate-y-1 active:shadow-none disabled:cursor-progress disabled:opacity-70";
const secondaryClass =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-marble px-5 text-center text-base font-extrabold text-ink ring-2 ring-jade transition hover:brightness-95 active:translate-y-0.5";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={primaryClass} />;
}

export function SecondaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return <button type="button" {...props} className={secondaryClass} />;
}

export function TextButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-extrabold text-jade underline underline-offset-2"
    />
  );
}

/** Cream wall with an awning above and a tiled floor below. */
export function Screen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="kopitiam-wall shrink-0">
        <Awning className="relative h-9 w-full drop-shadow-md" />
        <div className="relative flex items-center justify-between px-3 py-2">
          <Link
            href="/"
            className="header-brand px-1 font-brush text-3xl text-chalk"
          >
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <DisplaySettings />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-4">
        {children}
      </main>
      {footer}
      {!footer && <div aria-hidden className="tile-floor h-8 shrink-0" />}
    </div>
  );
}

function Brand() {
  return "KiraLah";
}

/** Keeps the one main action under the thumb. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <footer className="sticky bottom-0 z-30 shrink-0 border-t-4 border-wood bg-cream px-4 pt-3 pb-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-2">
        {children}
      </div>
    </footer>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-marble p-4 shadow-float">
      {children}
    </section>
  );
}

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-extrabold text-ink">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        {...props}
        className={`min-h-12 w-full min-w-0 rounded-xl border-2 bg-field px-3 text-lg text-ink placeholder:text-ink-soft/70 focus:border-jade focus:outline-none ${
          error ? "border-chilli" : "border-ink-soft/40"
        }`}
      />
      {hint && !error && <p className="text-sm text-ink-soft">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm font-bold text-chilli">
          {error}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 text-left text-base font-bold text-ink"
    >
      {label}
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-jade" : "bg-ink-soft/50"
        }`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : ""
          }`}
        />
      </span>
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const buttonClass =
    "grid size-11 cursor-pointer place-items-center rounded-full bg-jade text-2xl leading-none font-extrabold text-white disabled:cursor-default disabled:bg-ink-soft/40";
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={buttonClass}
      >
        {"−"}
      </button>
      <output className="min-w-8 text-center text-lg font-extrabold text-ink">
        {value}
      </output>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={buttonClass}
      >
        {"+"}
      </button>
    </div>
  );
}

export function Choice<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-extrabold ring-2 ring-jade ${
            option.value === value ? "bg-jade text-white" : "bg-field text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function More({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-extrabold text-jade underline underline-offset-2">
        {label}
      </summary>
      <div className="flex flex-col gap-3 pt-2">{children}</div>
    </details>
  );
}

export function StepTitle({
  current,
  total,
  title,
}: {
  current: string;
  total?: number;
  title: string;
}) {
  return (
    <div>
      {total !== undefined && (
        <p className="text-sm font-bold text-ink-soft">{current}</p>
      )}
      <h1 className="text-3xl leading-tight font-extrabold text-jade">
        {title}
      </h1>
    </div>
  );
}
