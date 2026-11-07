"use client";

import {
  calculateBill,
  formatRinggit,
  parsePercent,
  parseRinggit,
} from "@splitlah/core";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  commitPending,
  type DraftLabels,
  emptyItemisedDraft,
  hasUnfinishedDish,
  isItemValid,
  type ItemDraft,
  type ItemisedDraft,
  itemisedDraftToBill,
  type PaymentDraft,
  type VoucherDraft,
} from "@/lib/draft";
import {
  newLocalId,
  readStored,
  removeStored,
  STORAGE_KEYS,
  writeStored,
} from "@/lib/storage";
import { useHashStep, useIsClient } from "@/lib/useClient";
import { type CreateError, requestCreateBill } from "./createBillRequest";
import { PaymentForm } from "./PaymentForm";
import {
  BottomBar,
  Card,
  Choice,
  Field,
  More,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Stepper,
  StepTitle,
  TextButton,
  Toggle,
} from "./ui";

const STEPS = ["items", "charges", "people", "vouchers", "pay"] as const;

type Patch = (change: Partial<ItemisedDraft>) => void;

export type RememberedPayer = { name: string; payment: PaymentDraft };

function loadDraft(): ItemisedDraft {
  const empty = emptyItemisedDraft();
  const saved = readStored<Partial<ItemisedDraft>>(STORAGE_KEYS.itemisedDraft);
  if (saved) return { ...empty, ...saved };
  const payer = readStored<RememberedPayer>(STORAGE_KEYS.payer);
  return payer
    ? { ...empty, payerName: payer.name, payment: payer.payment }
    : empty;
}

export function BillWizard() {
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
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState(loadDraft);
  const [step, goTo] = useHashStep(STEPS, "items");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<CreateError | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!saved.current) writeStored(STORAGE_KEYS.itemisedDraft, draft);
  }, [draft]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const patch: Patch = (change) =>
    setDraft((current) => ({ ...current, ...change }));

  const labels: DraftLabels = {
    payer: t("people.defaultPayer"),
    adjustment: t("charges.adjustment"),
    voucher: (voucher) => voucherLabel(voucher, draft, t),
  };
  const bill = itemisedDraftToBill(draft, labels);
  const result = calculateBill(bill);

  const validItems = draft.items.filter(isItemValid).length;
  const problem = (() => {
    switch (step) {
      case "items":
        if (hasUnfinishedDish(draft)) return t("items.finishDish");
        if (validItems === 0 && draft.pendingDishName.trim() === "")
          return t("items.needItem");
        if (validItems !== draft.items.length) return t("items.fixRows");
        return null;
      case "charges":
        return ratesAreValid(draft) ? null : t("charges.fixRates");
      case "people":
        return draft.payerName.trim() === "" ? t("people.needName") : null;
      default:
        return null;
    }
  })();

  const index = STEPS.indexOf(step);

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
    removeStored(STORAGE_KEYS.itemisedDraft);
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
    setDraft((current) => commitPending(current, newLocalId));
    const following = STEPS[index + 1];
    if (following) goTo(following);
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
          <p className="flex items-baseline justify-between text-lg font-extrabold text-ink">
            {t("total")}
            <span
              data-testid="running-total"
              className="font-brush text-3xl text-jade"
            >
              {formatRinggit(result.totalSen)}
            </span>
          </p>
          <div className="flex items-center gap-2">
            {index > 0 && (
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
      <StepTitle
        total={STEPS.length}
        current={t("stepOf", { current: index + 1, total: STEPS.length })}
        title={t(`${step}.title`)}
      />
      {step === "items" && <ItemsStep draft={draft} patch={patch} />}
      {step === "charges" && (
        <ChargesStep draft={draft} patch={patch} result={result} />
      )}
      {step === "people" && <PeopleStep draft={draft} patch={patch} />}
      {step === "vouchers" && (
        <VouchersStep draft={draft} patch={patch} result={result} />
      )}
      {step === "pay" && (
        <>
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

type Translate = ReturnType<typeof useTranslations<"wizard">>;
type Result = ReturnType<typeof calculateBill>;

function ratesAreValid(draft: ItemisedDraft): boolean {
  if (draft.pricesIncludeCharges) return true;
  return (
    (!draft.serviceOn || parsePercent(draft.serviceRateText) !== null) &&
    (!draft.taxOn || parsePercent(draft.taxRateText) !== null)
  );
}

function voucherLabel(
  voucher: VoucherDraft,
  draft: ItemisedDraft,
  t: Translate,
): string {
  const value = voucher.valueText.trim();
  if (voucher.kind === "percentOff")
    return t("vouchers.labelPercent", { value });
  if (voucher.kind === "amountOff") return t("vouchers.labelAmount", { value });
  const item =
    draft.items.find((candidate) => candidate.id === voucher.itemId)?.name ??
    "";
  switch (voucher.promoType) {
    case "oneForOne":
      return t("vouchers.labelOneForOne", { item });
    case "freeUnits":
      return t("vouchers.labelFree", { item });
    case "percentOff":
      return t("vouchers.labelItemPercent", { value, item });
    case "amountOff":
      return t("vouchers.labelItemAmount", { value, item });
  }
}

function ItemsStep({ draft, patch }: { draft: ItemisedDraft; patch: Patch }) {
  const t = useTranslations("wizard.items");
  const name = draft.pendingDishName;
  const price = draft.pendingDishPrice;
  const [error, setError] = useState<"name" | "price" | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [removed, setRemoved] = useState<{
    item: ItemDraft;
    index: number;
  } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const updateItem = (id: string, change: Partial<ItemDraft>) =>
    patch({
      items: draft.items.map((item) =>
        item.id === id ? { ...item, ...change } : item,
      ),
    });

  function addItem() {
    if (name.trim() === "") {
      setError("name");
      nameRef.current?.focus();
      return;
    }
    if (parseRinggit(price) === null) {
      setError("price");
      priceRef.current?.focus();
      return;
    }
    patch(commitPending(draft, newLocalId));
    setError(null);
    nameRef.current?.focus();
  }

  return (
    <>
      <Field
        label={t("restaurant")}
        placeholder={t("restaurantPlaceholder")}
        maxLength={80}
        value={draft.restaurantName}
        onChange={(event) => patch({ restaurantName: event.target.value })}
      />

      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            addItem();
          }}
        >
          <div className="flex gap-2">
            <div className="flex-[2]">
              <Field
                ref={nameRef}
                label={t("name")}
                placeholder={t("namePlaceholder")}
                enterKeyHint="next"
                maxLength={120}
                value={name}
                error={error === "name" ? t("nameError") : undefined}
                onChange={(event) =>
                  patch({ pendingDishName: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (price === "") priceRef.current?.focus();
                    else addItem();
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <Field
                ref={priceRef}
                label={t("price")}
                placeholder="0.00"
                inputMode="decimal"
                enterKeyHint="done"
                value={price}
                error={error === "price" ? t("priceError") : undefined}
                onChange={(event) =>
                  patch({ pendingDishPrice: event.target.value })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-jade px-5 text-base font-extrabold text-white transition hover:brightness-110 active:translate-y-0.5"
          >
            {t("add")}
          </button>
        </form>
      </Card>

      {removed && (
        <p
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl bg-ink px-3 py-1 text-sm font-bold text-cream"
        >
          {t("removed", { name: removed.item.name })}
          <button
            type="button"
            className="min-h-11 cursor-pointer px-2 font-extrabold text-kaya underline"
            onClick={() => {
              const items = [...draft.items];
              items.splice(removed.index, 0, removed.item);
              patch({ items });
              setRemoved(null);
            }}
          >
            {t("undo")}
          </button>
        </p>
      )}

      {draft.items.length === 0 ? (
        <p className="text-center text-base text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {draft.items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl bg-marble p-3 shadow-sm"
            >
              <div className="flex gap-2">
                <div className="flex-[2]">
                  <Field
                    label={t("nameOf", { number: index + 1 })}
                    value={item.name}
                    maxLength={120}
                    error={item.name.trim() === "" ? t("nameError") : undefined}
                    onChange={(event) =>
                      updateItem(item.id, { name: event.target.value })
                    }
                  />
                </div>
                <div className="flex-1">
                  <Field
                    label={t("priceEach")}
                    inputMode="decimal"
                    value={item.priceText}
                    error={
                      parseRinggit(item.priceText) === null
                        ? t("priceError")
                        : undefined
                    }
                    onChange={(event) =>
                      updateItem(item.id, { priceText: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Stepper
                  value={item.quantity}
                  min={1}
                  max={999}
                  onChange={(quantity) => updateItem(item.id, { quantity })}
                  label={t("quantityOf", { name: item.name })}
                  decreaseLabel={t("fewer", { name: item.name })}
                  increaseLabel={t("more", { name: item.name })}
                />
                <TextButton
                  aria-label={t("removeNamed", { name: item.name })}
                  onClick={() => {
                    setRemoved({ item, index });
                    patch({
                      items: draft.items.filter(
                        (other) => other.id !== item.id,
                      ),
                    });
                  }}
                >
                  {t("remove")}
                </TextButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(draft.items.length > 0 || draft.restaurantName !== "") && (
        <div className="text-center">
          <TextButton
            onClick={() => {
              if (!confirmingClear) {
                setConfirmingClear(true);
                return;
              }
              setConfirmingClear(false);
              setRemoved(null);
              patch({
                ...emptyItemisedDraft(),
                payerName: draft.payerName,
                payment: draft.payment,
              });
            }}
          >
            {confirmingClear ? t("startOverConfirm") : t("startOver")}
          </TextButton>
        </div>
      )}
    </>
  );
}

function ChargesStep({
  draft,
  patch,
  result,
}: {
  draft: ItemisedDraft;
  patch: Patch;
  result: Result;
}) {
  const t = useTranslations("wizard.charges");
  const check = result.receiptCheck;

  return (
    <>
      <Card>
        <Toggle
          label={t("pricesInclude")}
          checked={draft.pricesIncludeCharges}
          onChange={(pricesIncludeCharges) => patch({ pricesIncludeCharges })}
        />
        {!draft.pricesIncludeCharges && (
          <>
            <Toggle
              label={t("service")}
              checked={draft.serviceOn}
              onChange={(serviceOn) => patch({ serviceOn })}
            />
            {draft.serviceOn && (
              <Field
                label={t("serviceRate")}
                inputMode="decimal"
                value={draft.serviceRateText}
                error={
                  parsePercent(draft.serviceRateText) === null
                    ? t("rateError")
                    : undefined
                }
                onChange={(event) =>
                  patch({ serviceRateText: event.target.value })
                }
              />
            )}
            <Toggle
              label={t("tax")}
              checked={draft.taxOn}
              onChange={(taxOn) => patch({ taxOn })}
            />
            {draft.taxOn && (
              <Field
                label={t("taxRate")}
                inputMode="decimal"
                value={draft.taxRateText}
                error={
                  parsePercent(draft.taxRateText) === null
                    ? t("rateError")
                    : undefined
                }
                onChange={(event) => patch({ taxRateText: event.target.value })}
              />
            )}
          </>
        )}
        <More label={t("more")}>
          {!draft.pricesIncludeCharges && (
            <Toggle
              label={t("taxOnService")}
              checked={draft.taxOnServiceCharge}
              onChange={(taxOnServiceCharge) => patch({ taxOnServiceCharge })}
            />
          )}
          <p className="text-sm font-extrabold text-ink">
            {t("voucherTiming")}
          </p>
          <Choice
            label={t("voucherTiming")}
            value={draft.discountTiming}
            onChange={(discountTiming) => patch({ discountTiming })}
            options={[
              { value: "beforeCharges", label: t("beforeCharges") },
              { value: "afterCharges", label: t("afterCharges") },
            ]}
          />
          <Toggle
            label={t("cashRounding")}
            checked={draft.cashRounding}
            onChange={(cashRounding) => patch({ cashRounding })}
          />
        </More>
      </Card>

      <Card>
        <Field
          label={t("receiptTotal")}
          hint={t("receiptHint")}
          inputMode="decimal"
          placeholder="0.00"
          value={draft.receiptTotalText}
          onChange={(event) => patch({ receiptTotalText: event.target.value })}
        />
        {check.status === "matches" && (
          <p role="status" className="font-extrabold text-jade">
            {t("matches")}
          </p>
        )}
        {check.status === "differs" && (
          <div role="status" className="flex flex-col gap-2">
            <p className="font-extrabold text-chilli">
              {check.differenceSen > 0
                ? t("receiptHigher", {
                    amount: formatRinggit(check.differenceSen),
                  })
                : t("receiptLower", {
                    amount: formatRinggit(-check.differenceSen),
                  })}
            </p>
            {check.cashRoundingWouldFix && (
              <SecondaryButton onClick={() => patch({ cashRounding: true })}>
                {t("useCashRounding")}
              </SecondaryButton>
            )}
            <SecondaryButton
              onClick={() =>
                patch({
                  adjustments: [
                    ...draft.adjustments,
                    { id: newLocalId(), amountSen: check.differenceSen },
                  ],
                })
              }
            >
              {t("addAdjustment", {
                amount: `${check.differenceSen > 0 ? "+" : "−"}${formatRinggit(Math.abs(check.differenceSen))}`,
              })}
            </SecondaryButton>
          </div>
        )}
        {draft.adjustments.map((adjustment) => (
          <p
            key={adjustment.id}
            className="flex items-center justify-between text-sm font-bold"
          >
            {`${t("adjustment")} ${adjustment.amountSen > 0 ? "+" : "−"}${formatRinggit(Math.abs(adjustment.amountSen))}`}
            <TextButton
              onClick={() =>
                patch({
                  adjustments: draft.adjustments.filter(
                    (other) => other.id !== adjustment.id,
                  ),
                })
              }
            >
              {t("removeAdjustment")}
            </TextButton>
          </p>
        ))}
      </Card>
    </>
  );
}

function PeopleStep({ draft, patch }: { draft: ItemisedDraft; patch: Patch }) {
  const t = useTranslations("wizard.people");

  const addFriend = () => patch(commitPending(draft, newLocalId));

  return (
    <Card>
      <Field
        label={t("yourName")}
        placeholder={t("yourNamePlaceholder")}
        maxLength={40}
        autoComplete="given-name"
        value={draft.payerName}
        onChange={(event) => patch({ payerName: event.target.value })}
      />
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addFriend();
        }}
      >
        <Field
          label={t("friend")}
          placeholder={t("friendPlaceholder")}
          hint={t("friendHint")}
          maxLength={40}
          enterKeyHint="done"
          value={draft.pendingFriendName}
          onChange={(event) => patch({ pendingFriendName: event.target.value })}
        />
      </form>
      <div>
        <SecondaryButton onClick={addFriend}>{t("add")}</SecondaryButton>
      </div>
      {draft.friends.length > 0 && (
        <ul className="flex flex-col gap-1">
          {draft.friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center justify-between text-lg font-bold"
            >
              <span>{friend.name}</span>
              <TextButton
                aria-label={t("removeNamed", { name: friend.name })}
                onClick={() =>
                  patch({
                    friends: draft.friends.filter(
                      (other) => other.id !== friend.id,
                    ),
                    vouchers: draft.vouchers.map((voucher) =>
                      voucher.keptBy === friend.id
                        ? { ...voucher, keptBy: "" }
                        : voucher,
                    ),
                  })
                }
              >
                {t("remove")}
              </TextButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function VouchersStep({
  draft,
  patch,
  result,
}: {
  draft: ItemisedDraft;
  patch: Patch;
  result: Result;
}) {
  const t = useTranslations("wizard.vouchers");

  const update = (id: string, change: Partial<VoucherDraft>) =>
    patch({
      vouchers: draft.vouchers.map((voucher) =>
        voucher.id === id ? { ...voucher, ...change } : voucher,
      ),
    });

  const people = [
    { id: "payer", name: draft.payerName.trim() },
    ...draft.friends.filter((friend) => friend.name.trim() !== ""),
  ];
  const items = draft.items.filter(isItemValid);

  return (
    <>
      <p className="text-base text-ink-soft">{t("hint")}</p>
      {draft.vouchers.map((voucher) => {
        const outcome = result.discounts.find(
          (entry) => entry.discountId === voucher.id,
        );
        const needsValue =
          voucher.kind !== "itemPromo" ||
          voucher.promoType === "percentOff" ||
          voucher.promoType === "amountOff";
        const isPercent =
          voucher.kind === "percentOff" ||
          (voucher.kind === "itemPromo" && voucher.promoType === "percentOff");

        return (
          <Card key={voucher.id}>
            <Choice
              label={t("kind")}
              value={voucher.kind}
              onChange={(kind) => update(voucher.id, { kind })}
              options={[
                { value: "percentOff", label: t("percentOff") },
                { value: "amountOff", label: t("amountOff") },
                { value: "itemPromo", label: t("itemPromo") },
              ]}
            />

            {voucher.kind === "itemPromo" && (
              <>
                {items.length > 1 ? (
                  <Choice
                    label={t("whichDish")}
                    value={voucher.itemId}
                    onChange={(itemId) => update(voucher.id, { itemId })}
                    options={items.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                ) : null}
                <Choice
                  label={t("promoType")}
                  value={voucher.promoType}
                  onChange={(promoType) => update(voucher.id, { promoType })}
                  options={[
                    { value: "oneForOne", label: t("oneForOne") },
                    { value: "freeUnits", label: t("free") },
                    { value: "percentOff", label: t("percentOffDish") },
                    { value: "amountOff", label: t("amountOffDish") },
                  ]}
                />
              </>
            )}

            {needsValue && (
              <Field
                label={isPercent ? t("percentValue") : t("amountValue")}
                inputMode="decimal"
                value={voucher.valueText}
                onChange={(event) =>
                  update(voucher.id, { valueText: event.target.value })
                }
              />
            )}

            {outcome?.status === "minSpendNotMet" && (
              <p role="status" className="font-bold text-chilli">
                {t("minSpendNotMet")}
              </p>
            )}
            {outcome?.status === "applied" && outcome.savedSen > 0 && (
              <p role="status" className="font-extrabold text-jade">
                {t("saves", { amount: formatRinggit(outcome.savedSen) })}
              </p>
            )}

            {voucher.kind !== "itemPromo" && (
              <More label={t("more")}>
                <Field
                  label={t("minSpend")}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={voucher.minSpendText}
                  onChange={(event) =>
                    update(voucher.id, { minSpendText: event.target.value })
                  }
                />
                <p className="text-sm font-extrabold text-ink">{t("whose")}</p>
                <Choice
                  label={t("whose")}
                  value={voucher.keptBy}
                  onChange={(keptBy) => update(voucher.id, { keptBy })}
                  options={[
                    { value: "", label: t("everyone") },
                    ...people.map((person) => ({
                      value: person.id,
                      label: t("keptBy", { name: person.name }),
                    })),
                  ]}
                />
              </More>
            )}

            <div>
              <TextButton
                onClick={() =>
                  patch({
                    vouchers: draft.vouchers.filter(
                      (other) => other.id !== voucher.id,
                    ),
                  })
                }
              >
                {t("remove")}
              </TextButton>
            </div>
          </Card>
        );
      })}

      <SecondaryButton
        onClick={() =>
          patch({
            vouchers: [
              ...draft.vouchers,
              {
                id: newLocalId(),
                kind: "percentOff",
                valueText: "",
                minSpendText: "",
                keptBy: "",
                itemId: items[0]?.id ?? "",
                promoType: "oneForOne",
              },
            ],
          })
        }
      >
        {t("add")}
      </SecondaryButton>
    </>
  );
}
