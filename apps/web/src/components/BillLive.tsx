"use client";

import {
  type BillResult,
  calculateBill,
  formatRinggit,
  type Share,
} from "@splitlah/core";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { sendBillChange } from "@/lib/billClient";
import { claimKey, hasClaims, withClaimOverrides } from "@/lib/claims";
import type { SavedBill } from "@/lib/savedBill";
import { shareToWhatsApp } from "@/lib/share";
import {
  removeStored,
  STORAGE_KEYS,
  type StoredPerson,
  useStored,
  writeStored,
} from "@/lib/storage";
import { useIsClient } from "@/lib/useClient";
import { useLiveBill } from "@/lib/useLiveBill";
import { SharePanel } from "./SharePanel";
import {
  Card,
  Field,
  More,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TextButton,
} from "./ui";

type Person = SavedBill["people"][number];

function listNames(names: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}

export function BillLive({ initial }: { initial: SavedBill }) {
  const t = useTranslations("live");
  const tBill = useTranslations("bill");
  const isClient = useIsClient();
  const { saved, refresh, offline } = useLiveBill(initial);
  const editToken = useStored<string>(STORAGE_KEYS.editToken(saved.id));
  const storedPerson = useStored<StoredPerson>(STORAGE_KEYS.person(saved.id));

  const [claimOverrides, setClaimOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [paidOverrides, setPaidOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [failed, setFailed] = useState(false);

  const { payerId } = saved.bill;
  const isPayer = isClient && editToken !== null;
  const me = isPayer
    ? payerId
    : storedPerson &&
        saved.people.some((person) => person.id === storedPerson.personId)
      ? storedPerson.personId
      : null;
  const token = isPayer ? editToken : (storedPerson?.token ?? null);

  const bill = withClaimOverrides(saved.bill, claimOverrides);
  const people = saved.people.map((person) =>
    person.id in paidOverrides
      ? { ...person, paid: paidOverrides[person.id]! }
      : person,
  );
  const result = calculateBill(bill);
  const title = saved.restaurantName
    ? tBill("makanAt", { place: saved.restaurantName })
    : tBill("makanBill");

  async function change(
    path: string,
    body: unknown,
    showNow: () => void,
    settle: () => void,
  ) {
    setFailed(false);
    showNow();
    const outcome = await sendBillChange(
      `/api/bills/${saved.id}/${path}`,
      "PUT",
      body,
      token,
    );
    await refresh();
    settle();
    if (!outcome.ok) setFailed(true);
  }

  const setClaim = (itemId: string, personId: string, had: boolean) => {
    const key = claimKey(itemId, personId);
    void change(
      "claims",
      { itemId, personId, had },
      () => setClaimOverrides((current) => ({ ...current, [key]: had })),
      () => setClaimOverrides(({ [key]: _done, ...rest }) => rest),
    );
  };

  const setPaid = (personId: string, paid: boolean) => {
    void change(
      "paid",
      { personId, paid },
      () => setPaidOverrides((current) => ({ ...current, [personId]: paid })),
      () => setPaidOverrides(({ [personId]: _done, ...rest }) => rest),
    );
  };

  return (
    <Screen>
      <div>
        <h1 className="text-3xl leading-tight font-extrabold text-jade">
          {title}
        </h1>
        <p className="font-brush text-5xl text-chilli" data-testid="bill-total">
          {formatRinggit(result.totalSen)}
        </p>
        <p className="text-base font-bold text-ink-soft">
          {tBill("paidBy", { payer: saved.payerName })}
        </p>
      </div>

      {offline && (
        <p
          role="status"
          className="rounded-xl bg-ink px-3 py-2 text-sm font-bold text-cream"
        >
          {t("offline")}
        </p>
      )}
      {failed && (
        <p
          role="alert"
          className="rounded-xl bg-chilli px-3 py-2 text-sm font-bold text-white"
        >
          {t("failed")}
        </p>
      )}

      {isClient && isPayer && (
        <>
          <SharePanel
            billId={saved.id}
            message={tBill("whatsAppMessage", {
              title,
              total: formatRinggit(result.totalSen),
              payer: saved.payerName,
              url: "{url}",
            })}
          />
          {bill.mode === "itemised" && (
            <DishList
              bill={bill}
              people={people}
              me={payerId}
              title={t("yourDishes")}
              onSetClaim={setClaim}
            />
          )}
          <PayerDashboard
            saved={saved}
            bill={bill}
            people={people}
            result={result}
            title={title}
            token={token}
            onSetPaid={setPaid}
            onChanged={refresh}
          />
          <Link
            href={`/b/${saved.id}/edit`}
            className="text-center text-base font-extrabold text-jade underline underline-offset-2"
          >
            {t("editBill")}
          </Link>
        </>
      )}

      {isClient && !isPayer && me === null && (
        <WhoAreYou saved={saved} onJoined={refresh} />
      )}

      {isClient && !isPayer && me !== null && (
        <FriendView
          saved={saved}
          bill={bill}
          people={people}
          me={me}
          share={result.shares.find((share) => share.personId === me)!}
          onSetClaim={setClaim}
          onSetPaid={setPaid}
        />
      )}

      <BillDetails saved={saved} bill={bill} result={result} />
    </Screen>
  );
}

function WhoAreYou({
  saved,
  onJoined,
}: {
  saved: SavedBill;
  onJoined: () => Promise<void>;
}) {
  const t = useTranslations("live");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const friends = saved.people.filter(
    (person) => person.id !== saved.bill.payerId && !person.placeholder,
  );

  async function join(body: { personId: string } | { name: string }) {
    setBusy(true);
    setError(null);
    const outcome = await sendBillChange(
      `/api/bills/${saved.id}/join`,
      "POST",
      body,
      null,
    );
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    writeStored(STORAGE_KEYS.person(saved.id), outcome.data as StoredPerson);
    await onJoined();
  }

  const errorText =
    error === "taken"
      ? t("taken", { payer: saved.payerName })
      : error === "full"
        ? t("full", { payer: saved.payerName })
        : error
          ? t("failed")
          : null;

  return (
    <Card>
      <h2 className="text-2xl font-extrabold text-jade">{t("whoAreYou")}</h2>
      {friends.length > 0 && (
        <ul className="flex flex-col gap-2">
          {friends.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                disabled={person.joined || busy}
                onClick={() => void join({ personId: person.id })}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-full bg-jade px-6 text-left text-xl font-extrabold text-white transition hover:brightness-110 active:translate-y-0.5 disabled:cursor-default disabled:bg-ink-soft/20 disabled:text-ink-soft"
              >
                <span>{person.name}</span>
                {person.joined && (
                  <span className="text-sm font-bold">
                    {t("pickedElsewhere")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void join({ name: name.trim() });
        }}
      >
        <Field
          label={friends.length > 0 ? t("notOnList") : t("yourName")}
          placeholder={t("namePlaceholder")}
          maxLength={40}
          autoComplete="given-name"
          enterKeyHint="go"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <SecondaryButton type="submit" disabled={busy}>
          {t("join")}
        </SecondaryButton>
      </form>
      {errorText && (
        <p role="alert" className="font-bold text-chilli">
          {errorText}
        </p>
      )}
    </Card>
  );
}

function DishList({
  bill,
  people,
  me,
  title,
  onSetClaim,
}: {
  bill: SavedBill["bill"];
  people: Person[];
  me: string;
  title: string;
  onSetClaim: (itemId: string, personId: string, had: boolean) => void;
}) {
  const t = useTranslations("live");
  const locale = useLocale();
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  if (bill.mode !== "itemised") return null;

  const nameOf = (personId: string) =>
    personId === me
      ? t("you")
      : (people.find((person) => person.id === personId)?.name ?? "");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-2xl font-extrabold text-jade">{title}</h2>
        <p className="text-base text-ink-soft">{t("tapHint")}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {bill.items.map((item) => {
          const sharers = item.portions.map((portion) => portion.personId);
          const mine = sharers.includes(me);
          const name =
            item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name;
          return (
            <li key={item.id} className="rounded-2xl bg-marble p-3 shadow-sm">
              <button
                type="button"
                aria-pressed={mine}
                onClick={() => onSetClaim(item.id, me, !mine)}
                className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left transition-colors ${
                  mine ? "bg-kaya/30" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 text-lg font-extrabold ${
                    mine
                      ? "border-jade bg-jade text-white"
                      : "border-ink-soft/50 bg-white text-transparent"
                  }`}
                >
                  {"✓"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg font-extrabold break-words text-ink">
                    {name}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {sharers.length === 0
                      ? t("nobodyYet")
                      : t("hadBy", {
                          names: listNames(sharers.map(nameOf), locale),
                        })}
                  </span>
                </span>
                <span className="shrink-0 text-base font-extrabold text-ink">
                  {formatRinggit(item.quantity * item.unitPriceSen)}
                </span>
              </button>
              <TextButton
                aria-expanded={openPicker === item.id}
                onClick={() =>
                  setOpenPicker(openPicker === item.id ? null : item.id)
                }
              >
                {t("whoShared")}
              </TextButton>
              {openPicker === item.id && (
                <div
                  role="group"
                  aria-label={t("whoSharedItem", { item: item.name })}
                  className="flex flex-wrap gap-2 pt-1"
                >
                  {people.map((person) => {
                    const had = sharers.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        aria-pressed={had}
                        onClick={() => onSetClaim(item.id, person.id, !had)}
                        className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-extrabold ring-2 ring-jade ${
                          had ? "bg-jade text-white" : "bg-white text-ink"
                        }`}
                      >
                        {person.id === me ? t("you") : person.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FriendView({
  saved,
  bill,
  people,
  me,
  share,
  onSetClaim,
  onSetPaid,
}: {
  saved: SavedBill;
  bill: SavedBill["bill"];
  people: Person[];
  me: string;
  share: Share;
  onSetClaim: (itemId: string, personId: string, had: boolean) => void;
  onSetPaid: (personId: string, paid: boolean) => void;
}) {
  const t = useTranslations("live");
  const tBreakdown = useTranslations("breakdown");
  const myName = people.find((person) => person.id === me)?.name ?? "";
  const paid = people.find((person) => person.id === me)?.paid ?? false;

  return (
    <>
      <p className="flex items-center justify-between gap-2 text-base">
        <span>{t("hello", { name: myName })}</span>
        <TextButton onClick={() => removeStored(STORAGE_KEYS.person(saved.id))}>
          {t("notYou")}
        </TextButton>
      </p>

      {bill.mode === "itemised" && (
        <DishList
          bill={bill}
          people={people}
          me={me}
          title={t("whatDidYouHave")}
          onSetClaim={onSetClaim}
        />
      )}

      <section
        aria-live="polite"
        className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t-4 border-wood bg-cream px-4 pt-3 pb-4"
      >
        {share.amountSen === 0 ? (
          <p className="text-center text-lg font-extrabold text-ink-soft">
            {t("tapFirst")}
          </p>
        ) : (
          <>
            <p
              className="text-center text-xl font-extrabold text-ink"
              data-testid="you-pay"
            >
              {t("youPay", {
                payer: saved.payerName,
                amount: formatRinggit(share.amountSen),
              })}
            </p>
            <More label={t("howWorkedOut")}>
              <ul className="flex flex-col gap-1">
                {share.breakdown.map((line) => (
                  <li
                    key={line.key}
                    className="flex justify-between gap-3 text-base"
                  >
                    <span>{tBreakdown(line.key)}</span>
                    <span className="font-bold">
                      {`${line.amountSen < 0 ? "−" : ""}${formatRinggit(Math.abs(line.amountSen))}`}
                    </span>
                  </li>
                ))}
              </ul>
              {share.extraSen > 0 && (
                <p className="text-sm text-ink-soft">
                  {tBreakdown("extraSen", {
                    amount: formatRinggit(share.extraSen),
                  })}
                </p>
              )}
            </More>
            {paid ? (
              <p className="flex items-center justify-between rounded-xl bg-jade px-4 py-2 text-lg font-extrabold text-white">
                {t("youPaid")}
                <button
                  type="button"
                  onClick={() => onSetPaid(me, false)}
                  className="min-h-11 cursor-pointer px-2 text-sm text-kaya underline"
                >
                  {t("undo")}
                </button>
              </p>
            ) : (
              <PrimaryButton onClick={() => onSetPaid(me, true)}>
                {t("markPaid")}
              </PrimaryButton>
            )}
          </>
        )}
      </section>

      {share.amountSen > 0 && <PayDetails saved={saved} />}
    </>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("live");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
      className="min-h-11 shrink-0 cursor-pointer rounded-full bg-jade px-4 text-sm font-extrabold text-white"
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

function PayDetails({ saved }: { saved: SavedBill }) {
  const t = useTranslations("live");
  const tBill = useTranslations("bill");
  const { payment, payerName } = saved;
  if (!payment.hasQr && !payment.accountNumber && !payment.phone) {
    return (
      <Card>
        <p className="text-base">{t("askHowToPay", { payer: payerName })}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-extrabold text-ink">
        {tBill("payTo", { payer: payerName })}
      </h2>
      {payment.hasQr && (
        /* Served from our own API route, already compressed on the payer's phone. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/bills/${saved.id}/qr`}
          alt={tBill("qrAlt", { payer: payerName })}
          className="mx-auto size-56 rounded-xl bg-white object-contain"
        />
      )}
      {payment.accountNumber && (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-base break-words">
            {payment.bankName ? `${payment.bankName}: ` : ""}
            <strong>{payment.accountNumber}</strong>
          </p>
          <CopyButton text={payment.accountNumber} label={t("copyAccount")} />
        </div>
      )}
      {payment.phone && (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-base">
            {tBill("phone")} <strong>{payment.phone}</strong>
          </p>
          <CopyButton text={payment.phone} label={t("copyPhone")} />
        </div>
      )}
    </Card>
  );
}

function PayerDashboard({
  saved,
  bill,
  people,
  result,
  title,
  token,
  onSetPaid,
  onChanged,
}: {
  saved: SavedBill;
  bill: SavedBill["bill"];
  people: Person[];
  result: BillResult;
  title: string;
  token: string | null;
  onSetPaid: (personId: string, paid: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("live");
  const { payerId } = bill;
  const friends = people.filter((person) => person.id !== payerId);
  const amountOf = (personId: string) =>
    result.shares.find((share) => share.personId === personId)?.amountSen ?? 0;
  const needsToPick = (person: Person) =>
    bill.mode === "itemised" ? !hasClaims(bill, person.id) : !person.joined;

  const expected = friends.reduce(
    (total, person) => total + amountOf(person.id),
    0,
  );
  const collected = friends
    .filter((person) => person.paid)
    .reduce((total, person) => total + amountOf(person.id), 0);
  const unclaimed =
    bill.mode === "itemised"
      ? bill.items.filter((item) => item.portions.length === 0)
      : [];
  const url = () => `${window.location.origin}/b/${saved.id}`;

  const reminderFor = (person: Person) =>
    needsToPick(person) && bill.mode === "itemised"
      ? t("remindPick", { name: person.name, title, url: url() })
      : t("remindPay", {
          name: person.name,
          title,
          amount: formatRinggit(amountOf(person.id)),
          payer: saved.payerName,
          url: url(),
        });

  const unpaid = friends.filter((person) => !person.paid);
  const groupReminder = () =>
    [
      t("remindGroupIntro", { title }),
      ...unpaid.map((person) =>
        needsToPick(person) && bill.mode === "itemised"
          ? t("remindGroupPicking", { name: person.name })
          : t("remindGroupLine", {
              name: person.name,
              amount: formatRinggit(amountOf(person.id)),
            }),
      ),
      t("remindGroupOutro", { payer: saved.payerName, url: url() }),
    ].join("\n");

  return (
    <Card>
      <h2 className="text-2xl font-extrabold text-jade">{t("whoPaid")}</h2>
      <p className="text-lg font-extrabold text-ink" data-testid="collected">
        {t("collected", {
          collected: formatRinggit(collected),
          expected: formatRinggit(expected),
        })}
      </p>

      {result.unclaimedSen > 0 && (
        <div role="status" className="rounded-xl bg-kaya/30 p-3">
          <p className="font-extrabold text-ink">
            {t("unclaimed", { amount: formatRinggit(result.unclaimedSen) })}
          </p>
          <p className="text-sm text-ink">
            {unclaimed.map((item) => item.name).join(", ")}
          </p>
        </div>
      )}

      {friends.length === 0 ? (
        <p className="text-base text-ink-soft">{t("noFriendsYet")}</p>
      ) : (
        <ul className="flex flex-col divide-y-2 divide-dashed divide-ink-soft/20">
          {friends.map((person) => (
            <li
              key={person.id}
              className="flex flex-col gap-2 py-3"
              data-testid={`friend-${person.name}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-extrabold break-words">
                  {person.name}
                </span>
                <span className="shrink-0 text-base font-bold">
                  {person.paid
                    ? t("paidStatus")
                    : needsToPick(person)
                      ? bill.mode === "itemised"
                        ? t("notPicked")
                        : t("notOpened")
                      : t("owes", {
                          amount: formatRinggit(amountOf(person.id)),
                        })}
                </span>
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  aria-label={
                    person.paid
                      ? t("markUnpaidFor", { name: person.name })
                      : t("markPaidFor", { name: person.name })
                  }
                  onClick={() => onSetPaid(person.id, !person.paid)}
                >
                  {person.paid ? t("undoPaid") : t("markPaidShort")}
                </SecondaryButton>
                {!person.paid && (
                  <SecondaryButton
                    aria-label={t("remindNamed", { name: person.name })}
                    onClick={() => void shareToWhatsApp(reminderFor(person))}
                  >
                    {t("remind")}
                  </SecondaryButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {unpaid.length > 0 && (
        <PrimaryButton onClick={() => void shareToWhatsApp(groupReminder())}>
          {t("remindAll")}
        </PrimaryButton>
      )}

      {friends.some((person) => person.joined) && (
        <More label={t("phoneTrouble")}>
          <p className="text-sm text-ink-soft">{t("phoneTroubleHint")}</p>
          {friends
            .filter((person) => person.joined)
            .map((person) => (
              <SecondaryButton
                key={person.id}
                onClick={async () => {
                  await sendBillChange(
                    `/api/bills/${saved.id}/people/${person.id}/reset`,
                    "POST",
                    {},
                    token,
                  );
                  await onChanged();
                }}
              >
                {t("letPickAgain", { name: person.name })}
              </SecondaryButton>
            ))}
        </More>
      )}
    </Card>
  );
}

function BillDetails({
  saved,
  bill,
  result,
}: {
  saved: SavedBill;
  bill: SavedBill["bill"];
  result: BillResult;
}) {
  const t = useTranslations("bill");
  const tBreakdown = useTranslations("breakdown");
  const signed = (sen: number) =>
    `${sen < 0 ? "−" : ""}${formatRinggit(Math.abs(sen))}`;

  if (bill.mode === "equal") {
    return (
      <Card>
        <p className="text-lg font-bold">
          {t("equalSummary", {
            count: bill.people.length,
            amount: formatRinggit(
              result.shares[bill.people.length - 1]!.amountSen,
            ),
          })}
        </p>
      </Card>
    );
  }

  const lines = [
    { key: "discount", sen: -result.discountSen },
    { key: "serviceCharge", sen: result.serviceChargeSen },
    { key: "serviceTax", sen: result.serviceTaxSen },
    { key: "adjustment", sen: result.adjustmentSen },
    { key: "cashRounding", sen: result.cashRoundingSen },
  ] as const;

  return (
    <Card>
      <More label={t("wholeBill")}>
        <ul className="flex flex-col gap-1" data-testid={`details-${saved.id}`}>
          {bill.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-base">
              <span className="min-w-0 break-words">
                {item.quantity > 1
                  ? `${item.quantity} × ${item.name}`
                  : item.name}
              </span>
              <span className="shrink-0 font-bold">
                {formatRinggit(item.quantity * item.unitPriceSen)}
              </span>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-1 border-t-2 border-dashed border-ink-soft/30 pt-2">
          {lines
            .filter((line) => line.sen !== 0)
            .map((line) => (
              <li
                key={line.key}
                className="flex justify-between gap-3 text-base text-ink-soft"
              >
                <span>{tBreakdown(line.key)}</span>
                <span className="shrink-0 font-bold">{signed(line.sen)}</span>
              </li>
            ))}
        </ul>
      </More>
    </Card>
  );
}
