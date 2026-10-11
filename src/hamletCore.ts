export type BookingWindowInput = {
  checkIn: string
  checkOut: string
}

export const HAMLET_GUEST_SERVICE_FEE_PERCENT = 3

export type HamletPriceBreakdown = {
  accommodationSubtotal: number
  mandatoryCharges: number
  serviceFeePercent: number
  serviceFee: number
  guestTotal: number
}

/**
 * The single source of truth for guest-facing HAMLET pricing.
 *
 * All amounts are integer NGN amounts. The guest service fee is charged only
 * on the discounted accommodation subtotal. Mandatory non-accommodation
 * charges are added transparently but are not fee-bearing by default.
 *
 * Payment-provider processing charges are deliberately excluded until the
 * provider, merchant terms and pass-through policy are confirmed.
 */
export function calculateHamletPrice({
  accommodationSubtotal,
  mandatoryCharges = 0,
  serviceFeePercent = HAMLET_GUEST_SERVICE_FEE_PERCENT,
}: {
  accommodationSubtotal: number
  mandatoryCharges?: number
  serviceFeePercent?: number
}): HamletPriceBreakdown {
  if (!Number.isSafeInteger(accommodationSubtotal) || accommodationSubtotal < 0) {
    throw new Error('Accommodation subtotal must be a non-negative whole NGN amount')
  }

  if (!Number.isSafeInteger(mandatoryCharges) || mandatoryCharges < 0) {
    throw new Error('Mandatory charges must be a non-negative whole NGN amount')
  }

  if (!Number.isFinite(serviceFeePercent) || serviceFeePercent < 0) {
    throw new Error('Service fee percent must be a valid non-negative number')
  }

  const serviceFee = Math.round((accommodationSubtotal * serviceFeePercent) / 100)

  return {
    accommodationSubtotal,
    mandatoryCharges,
    serviceFeePercent,
    serviceFee,
    guestTotal: accommodationSubtotal + mandatoryCharges + serviceFee,
  }
}

export function validateBookingWindow(input: BookingWindowInput): void {
  const checkIn = new Date(`${input.checkIn}T00:00:00Z`)
  const checkOut = new Date(`${input.checkOut}T00:00:00Z`)

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new Error('Booking dates must be valid ISO dates')
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new Error('Check-out date must be after check-in date')
  }
}

/** @deprecated Prefer calculateHamletPrice for all guest-facing totals. */
export function calculatePlatformFee({ amount, percent }: { amount: number; percent: number }): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be a valid non-negative number')
  }

  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error('Percent must be a valid non-negative number')
  }

  return Math.round((amount * percent) / 100)
}

export function createBookingSummary({
  nightlyRate,
  nights,
  platformFeePercent = HAMLET_GUEST_SERVICE_FEE_PERCENT,
  cautionFee,
  additionalCharges,
}: {
  nightlyRate: number
  nights: number
  platformFeePercent?: number
  cautionFee: number
  additionalCharges: number
}): {
  accommodationTotal: number
  platformFee: number
  subtotal: number
  totalDue: number
  cautionFee: number
} {
  if (!Number.isSafeInteger(nightlyRate) || nightlyRate < 0) {
    throw new Error('Nightly rate must be a non-negative whole NGN amount')
  }

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new Error('Nights must be a positive integer')
  }

  if (!Number.isSafeInteger(cautionFee) || cautionFee < 0) {
    throw new Error('Caution fee must be a non-negative whole NGN amount')
  }

  const accommodationTotal = nightlyRate * nights
  const price = calculateHamletPrice({
    accommodationSubtotal: accommodationTotal,
    mandatoryCharges: additionalCharges,
    serviceFeePercent: platformFeePercent,
  })

  return {
    accommodationTotal,
    platformFee: price.serviceFee,
    subtotal: price.guestTotal,
    totalDue: price.guestTotal,
    cautionFee,
  }
}

export function calculateSettlement({
  accommodationTotal,
  ownerRevenue,
  agentFee,
  cautionFee,
  refundAmount,
}: {
  accommodationTotal: number
  ownerRevenue: number
  agentFee: number
  cautionFee: number
  refundAmount: number
}): {
  ownerPayout: number
  agentPayout: number
  cautionDepositLiability: number
  netSettlement: number
} {
  for (const [label, amount] of Object.entries({ accommodationTotal, ownerRevenue, agentFee, cautionFee, refundAmount })) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(`${label} must be a non-negative whole NGN amount`)
    }
  }

  const ownerPayout = ownerRevenue
  const agentPayout = agentFee
  const cautionDepositLiability = cautionFee
  const netSettlement = ownerPayout + agentPayout - refundAmount

  // HAMLET's 3% fee is guest-paid and is not deducted from owner proceeds.
  // Any agreed partner commission must fit within the separately agreed
  // accommodation settlement allocation.
  if (ownerPayout + agentPayout > accommodationTotal + 2) {
    throw new Error('Owner and partner allocations exceed the accommodation value')
  }

  return {
    ownerPayout,
    agentPayout,
    cautionDepositLiability,
    netSettlement,
  }
}
