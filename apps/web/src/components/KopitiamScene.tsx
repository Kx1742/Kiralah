"use client";

import { formatRinggit, sumSen } from "@kiralah/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Awning,
  Birdcage,
  Cat,
  Chair,
  Fan,
  KayaToast,
  KopiCup,
  Lamp,
  MenuBoard,
  Plant,
  Receipt,
  Shutter,
  TableTop,
  TehTarik,
  WindowView,
} from "./illustrations";

function tapFeedback() {
  navigator.vibrate?.(10);
}

/*
 * The lamp, shutters and cat are toys: nothing depends on them, so they stay out
 * of the keyboard order and away from screen readers.
 */
const toyProps = { type: "button", tabIndex: -1, "aria-hidden": true } as const;

function WindowShutter({ className }: { className: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`absolute aspect-[7/22] perspective-[500px] ${className}`}>
      <WindowView className="absolute inset-0 h-full w-full" />
      <button
        {...toyProps}
        onClick={() => {
          tapFeedback();
          setOpen(!open);
        }}
        className="absolute inset-0 origin-left cursor-pointer transition-transform duration-500 ease-out"
        style={{ transform: open ? "rotateY(-72deg)" : "rotateY(0)" }}
      >
        <Shutter className="h-full w-full" />
      </button>
    </div>
  );
}

export function KopitiamWall({ children }: { children: React.ReactNode }) {
  const [lampOn, setLampOn] = useState(true);
  const [taps, setTaps] = useState(0);

  return (
    <section
      data-lamp={lampOn ? "on" : "off"}
      className="kopitiam-wall flex flex-1 flex-col"
    >
      <div
        aria-hidden
        className="wall-tiles absolute inset-x-0 bottom-0 h-22 sm:h-36"
      />
      <Awning className="relative z-10 h-9 w-full drop-shadow-md" />

      <button
        {...toyProps}
        onClick={() => {
          tapFeedback();
          setLampOn(!lampOn);
          setTaps(taps + 1);
        }}
        className="absolute top-6 left-6 z-[5] w-14 cursor-pointer px-2 pb-2 sm:left-[30%] sm:w-20"
      >
        <Lamp
          key={taps}
          lit={lampOn}
          className="w-full origin-top animate-swing"
        />
      </button>

      <Fan className="absolute top-8 left-[86px] z-[5] w-20 sm:left-1/2 sm:w-36 sm:-translate-x-1/2" />
      <MenuBoard className="absolute top-20 left-[18%] hidden w-28 lg:block" />
      <Birdcage className="absolute top-8 right-[24%] hidden w-16 animate-sway lg:block" />

      <WindowShutter className="top-24 -left-1 w-10 sm:top-28 sm:left-[6%] sm:w-28" />
      <WindowShutter className="top-24 -right-1 w-10 -scale-x-100 sm:top-28 sm:right-[6%] sm:w-28" />

      {children}
    </section>
  );
}

function CatUnderTable() {
  const t = useTranslations("home.demo");
  const [pets, setPets] = useState(0);

  return (
    <button
      {...toyProps}
      onClick={() => {
        tapFeedback();
        setPets(pets + 1);
      }}
      className="absolute right-[12%] -bottom-1 z-20 w-14 cursor-pointer sm:w-20"
    >
      {pets > 0 && (
        <span
          key={pets}
          className="absolute -top-6 left-1/2 -translate-x-1/2 animate-floatup rounded-full bg-marble px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-ink shadow-md"
        >
          {t("meow")}
        </span>
      )}
      <Cat key={pets} awake={pets > 0} wagging={pets > 0} className="w-full" />
    </button>
  );
}

const dishes = [
  { id: "kopi", priceSen: 250, Art: KopiCup, place: "left-[4%] w-[29%]" },
  { id: "teh", priceSen: 300, Art: TehTarik, place: "left-[33%] w-[18%]" },
  { id: "toast", priceSen: 380, Art: KayaToast, place: "left-[51%] w-[30%]" },
] as const;

type DishId = (typeof dishes)[number]["id"];

/* Try the real friend flow before making a bill: tap what you had, see what you pay. */
export function TableDemo() {
  const t = useTranslations("home.demo");
  const [picked, setPicked] = useState<readonly DishId[]>([]);
  const totalSen = sumSen(
    dishes
      .filter((dish) => picked.includes(dish.id))
      .map((dish) => dish.priceSen),
  );

  return (
    <div className="relative z-10 -mb-4 flex flex-col items-center">
      <p
        aria-live="polite"
        className={`z-20 mb-1 rounded-full px-4 py-1 text-sm font-extrabold shadow-md transition-colors duration-200 ${
          picked.length > 0 ? "bg-kaya text-ink" : "bg-marble text-ink"
        }`}
      >
        <span key={totalSen} className="inline-block animate-pop">
          {picked.length > 0
            ? t("youPay", { amount: formatRinggit(totalSen) })
            : t("hint")}
        </span>
      </p>

      <div className="relative w-64 sm:w-96">
        <TableTop className="block w-full" />

        {dishes.map(({ id, priceSen, Art, place }) => {
          const isPicked = picked.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isPicked}
              aria-label={`${t(id)}, ${formatRinggit(priceSen)}`}
              onClick={() => {
                tapFeedback();
                setPicked(
                  isPicked
                    ? picked.filter((other) => other !== id)
                    : [...picked, id],
                );
              }}
              className={`absolute top-0 flex h-[54%] cursor-pointer items-end justify-center transition-transform duration-200 hover:-translate-y-1 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-kaya ${place} ${
                isPicked ? "-translate-y-1.5" : ""
              }`}
            >
              {isPicked && (
                <span
                  aria-hidden
                  className="absolute top-0 right-0 z-10 grid size-5 animate-pop place-items-center rounded-full bg-kaya text-ink"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m3 8.5 3.2 3L13 4.5"
                    />
                  </svg>
                </span>
              )}
              <Art className="max-h-full w-full" />
            </button>
          );
        })}

        <Receipt
          ticks={picked.length}
          className="absolute top-[6%] right-[3%] w-[14%]"
        />
        <CatUnderTable />
        <Chair className="absolute bottom-1 -left-12 w-11 sm:-left-28 sm:w-20" />
        <Plant className="absolute -right-12 bottom-1 w-12 origin-bottom animate-sway sm:-right-28 sm:w-24" />
      </div>
    </div>
  );
}
