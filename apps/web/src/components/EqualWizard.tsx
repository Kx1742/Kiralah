"use client";

import { calculateBill, formatRinggit, parseRinggit } from "@splitlah/core";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  emptyEqualDraft,
  type EqualDraft,
  equalDraftToBill,
} from "@/lib/draft";
import {
  readStored,
  removeStored,
  STORAGE_KEYS,
  writeStored,
} from "@/lib/storage";
import { useHashStep, useIsClient } from "@/lib/useClient";
import type { RememberedPayer } from "./BillWizard";
import { type CreateError, requestCreateBill } from "./createBillRequest";
import { PaymentForm } from "./PaymentForm";
import {
  BottomBar,
  Card,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Stepper,
  StepTitle,
} from "./ui";

const STEPS = ["split", "pay"] as const;

function loadDraft(): EqualDraft {
  const empty = emptyEqualDraft();
  const saved = readStored<Partial<EqualDraft>>(STORAGE_KEYS.equalDraft);
  if (saved) return { ...empty, ...saved };
  const payer = readStored<RememberedPayer>(STORAGE_KEYS.payer);
  return payer
    ? { ...empty, payerName: payer.name, payment: payer.payment }
    : empty;
}

export function EqualWizard() {
  const t = useTranslations("wizard");
  return useIsClient() ? (
    <Wizard />
  ) : (
    <Screen>
      <p className="text-lg font-bold text-ink-soft">{t("loading")}</p>
    </Screen>
  );
}

function Wizard() {
  const t = useTranslations("wizard");
  const tEqual = useTranslations("wizard.equal");
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState(loadDraft);
  const [step, goTo] = useHashStep(STEPS, "split");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<CreateError | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!saved.current) writeStored(STORAGE_KEYS.equalDraft, draft);
  }, [draft]);

  const patch = (change: Partial<EqualDraft>) =>
    setDraft((current) => ({ ...current, ...change }));

  const bill = equalDraftToBill(draft, {
    payer: t("people.defaultPayer"),
    friend: (number) => tEqual("friendNumber", { number }),
  });
  const result = calculateBill(bill);

  const totalSen = parseRinggit(draft.totalText);
  const problem =
    totalSen === null || totalSen === 0
      ? tEqual("needTotal")
      : draft.payerName.trim() === ""
        ? t("people.needName")
        : null;

  async function create() {
    setCreating(true);
    setCreateError(null);
    const outcome = await requestCreateBill({
      locale,
      restaurantName: draft.restaurantName,
      bill,
      payment: draft.payment,
    });
    if ("error" in outcome) {
      setCreateError(outcome.error);
      setCreating(false);
      return;
    }
    saved.current = true;
    removeStored(STORAGE_KEYS.equalDraft);
    writeStored(STORAGE_KEYS.payer, {
      name: draft.payerName.trim(),
      payment: draft.payment,
    } satisfies RememberedPayer);
    router.push(`/b/${outcome.id}`);
  }

  function next() {
    if (problem) {
      setShowProblems(true);
      return;
    }
    setShowProblems(false);
    if (step === "split") goTo("pay");
    else void create();
  }

  return (
    <Screen
      footer={
        <BottomBar>
          {showProblems && problem && (
            <p
              role="alert"
              className="text-center text-sm font-bold text-chilli"
            >
              {problem}
            </p>
          )}
          {createError && (
            <p
              role="alert"
              className="text-center text-sm font-bold text-chilli"
            >
              {t(`errors.${createError}`)}
            </p>
          )}
          <div className="flex items-center gap-2">
            {step === "pay" && (
              <div className="w-24 shrink-0">
                <SecondaryButton onClick={() => history.back()}>
                  {t("back")}
                </SecondaryButton>
              </div>
            )}
            <PrimaryButton onClick={next} disabled={creating}>
              {step === "pay"
                ? creating
                  ? t("creating")
                  : t("create")
                : t("next")}
            </PrimaryButton>
          </div>
        </BottomBar>
      }
    >
      {step === "split" ? (
        <>
          <StepTitle current="" title={tEqual("title")} />
          <Card>
            <Field
              label={tEqual("total")}
              inputMode="decimal"
              placeholder="0.00"
              value={draft.totalText}
              onChange={(event) => patch({ totalText: event.target.value })}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-extrabold text-ink">
                {tEqual("people")}
              </p>
              <Stepper
                value={draft.peopleCount}
                min={2}
                max={50}
                onChange={(peopleCount) => patch({ peopleCount })}
                label={tEqual("people")}
                decreaseLabel={tEqual("fewer")}
                increaseLabel={tEqual("more")}
              />
            </div>
            <Field
              label={t("people.yourName")}
              placeholder={t("people.yourNamePlaceholder")}
              maxLength={40}
              value={draft.payerName}
              onChange={(event) => patch({ payerName: event.target.value })}
            />
            <Field
              label={t("items.restaurant")}
              placeholder={t("items.restaurantPlaceholder")}
              maxLength={80}
              value={draft.restaurantName}
              onChange={(event) =>
                patch({ restaurantName: event.target.value })
              }
            />
          </Card>
          {totalSen !== null && totalSen > 0 && (
            <p
              role="status"
              className="text-center text-xl font-extrabold text-jade"
            >
              {tEqual("each", {
                amount: formatRinggit(result.shares[1]!.amountSen),
              })}
            </p>
          )}
        </>
      ) : (
        <>
          <StepTitle current="" title={t("pay.title")} />
          <p className="text-base text-ink-soft">{t("pay.hint")}</p>
          <PaymentForm
            payment={draft.payment}
            onChange={(payment) => patch({ payment })}
          />
          <p className="text-sm text-ink-soft">{t("pay.remembered")}</p>
        </>
      )}
    </Screen>
  );
}
