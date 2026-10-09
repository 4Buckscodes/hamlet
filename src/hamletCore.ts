export type BookingWindowInput = {
  checkIn: string
  checkOut: string
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
  platformFeePercent,
  cautionFee,
  additionalCharges,
}: {
  nightlyRate: number
  nights: number
  platformFeePercent: number
  cautionFee: number
  additionalCharges: number
}): {
  accommodationTotal: number
  platformFee: number
  subtotal: number
  totalDue: number
  cautionFee: number
} {
  if (!Number.isFinite(nightlyRate) || nightlyRate < 0) {
    throw new Error('Nightly rate must be a non-negative number')
  }

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new Error('Nights must be a positive integer')
  }

  const accommodationTotal = nightlyRate * nights
  const platformFee = calculatePlatformFee({ amount: accommodationTotal, percent: platformFeePercent })
  const subtotal = accommodationTotal + additionalCharges + platformFee
  const totalDue = subtotal

  return {
    accommodationTotal,
    platformFee,
    subtotal,
    totalDue,
    cautionFee,
  }
}

export function calculateSettlement({
  accommodationTotal,
  platformFee,
  ownerRevenue,
  agentFee,
  cautionFee,
  refundAmount,
}: {
  accommodationTotal: number
  platformFee: number
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
  const ownerPayout = ownerRevenue
  const agentPayout = agentFee
  const cautionDepositLiability = cautionFee
  const netSettlement = ownerPayout + agentPayout - refundAmount

  const expectedGross = accommodationTotal - platformFee
  if (ownerPayout + agentPayout > expectedGross + 2) {
    throw new Error('Allocations exceed the gross accommodation value')
  }

  return {
    ownerPayout,
    agentPayout,
    cautionDepositLiability,
    netSettlement,
  }
}
