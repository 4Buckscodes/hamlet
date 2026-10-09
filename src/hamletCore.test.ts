import { describe, expect, it } from 'vitest'
import {
  calculatePlatformFee,
  createBookingSummary,
  validateBookingWindow,
  calculateSettlement,
} from './hamletCore'

describe('HAMLET booking rules', () => {
  it('rejects invalid or unavailable date windows', () => {
    expect(() => validateBookingWindow({ checkIn: '2026-10-10', checkOut: '2026-10-08' })).toThrow('Check-out date must be after check-in date')
    expect(() => validateBookingWindow({ checkIn: '2026-10-10', checkOut: '2026-10-11' })).not.toThrow()
  })

  it('calculates platform fee and total using integer amounts', () => {
    const summary = createBookingSummary({
      nightlyRate: 120000,
      nights: 3,
      platformFeePercent: 3,
      cautionFee: 25000,
      additionalCharges: 15000,
    })

    expect(summary.accommodationTotal).toBe(360000)
    expect(summary.platformFee).toBe(10800)
    expect(summary.totalDue).toBe(385800)
    expect(summary.cautionFee).toBe(25000)
  })

  it('keeps settlements separate from caution deposits', () => {
    const settlement = calculateSettlement({
      accommodationTotal: 360000,
      platformFee: 10800,
      ownerRevenue: 349200,
      agentFee: 0,
      cautionFee: 25000,
      refundAmount: 0,
    })

    expect(settlement.ownerPayout).toBe(349200)
    expect(settlement.agentPayout).toBe(0)
    expect(settlement.cautionDepositLiability).toBe(25000)
    expect(settlement.netSettlement).toBe(349200)
  })
})

describe('HAMLET platform fee rules', () => {
  it('applies percentage fee from the active configured rule', () => {
    expect(calculatePlatformFee({ amount: 100000, percent: 3 })).toBe(3000)
  })
})
