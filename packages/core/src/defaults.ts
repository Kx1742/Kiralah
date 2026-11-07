import type { Charges } from "./schema";

/** Kept apart from the schemas so screens can read it without loading Zod. */
export const DEFAULT_CHARGES: Charges = {
  pricesIncludeCharges: false,
  serviceChargeBasisPoints: 1000,
  serviceTaxBasisPoints: 600,
  taxOnServiceCharge: true,
  discountTiming: "beforeCharges",
};
