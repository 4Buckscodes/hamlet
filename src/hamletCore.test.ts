import { describe, expect, it } from 'vitest'
import {
  calculateHamletPrice,
  calculatePlatformFee,
  createBookingSummary,
  validateBookingWindow,
  calculateSettlement,
} from './hamletCore'
import { isSupabaseBrowserKeySafe } from './supabaseClient'

describe('HAMLET booking rules', () => {
  it('rejects invalid or unavailable date windows', () => {
    expect(() => validateBookingWindow({ checkIn: '2026-10-10', checkOut: '2026-10-08' })).toThrow('Check-out date must be after check-in date')
    expect(() => validateBookingWindow({ checkIn: '2026-10-10', checkOut: '2026-10-11' })).not.toThrow()
  })

  it('uses one guest-only pricing function for the all-inclusive total', () => {
    expect(calculateHamletPrice({ accommodationSubtotal: 100000 })).toEqual({
      accommodationSubtotal: 100000,
      mandatoryCharges: 0,
      serviceFeePercent: 3,
      serviceFee: 3000,
      guestTotal: 103000,
    })
  })

  it('calculates the guest service fee on the accommodation subtotal only', () => {
    const price = calculateHamletPrice({
      accommodationSubtotal: 360000,
      mandatoryCharges: 15000,
    })

    expect(price.serviceFee).toBe(10800)
    expect(price.guestTotal).toBe(385800)
  })

  it('rejects invalid amounts rather than producing inconsistent totals', () => {
    expect(() => calculateHamletPrice({ accommodationSubtotal: -1 })).toThrow('Accommodation subtotal')
    expect(() => calculateHamletPrice({ accommodationSubtotal: 1000.5 })).toThrow('Accommodation subtotal')
    expect(() => calculateHamletPrice({ accommodationSubtotal: 1000, mandatoryCharges: -1 })).toThrow('Mandatory charges')
  })

  it('calculates booking totals through the central pricing function', () => {
    const summary = createBookingSummary({
      nightlyRate: 120000,
      nights: 3,
      cautionFee: 25000,
      additionalCharges: 15000,
    })

    expect(summary.accommodationTotal).toBe(360000)
    expect(summary.platformFee).toBe(10800)
    expect(summary.totalDue).toBe(385800)
    expect(summary.cautionFee).toBe(25000)
  })

  it('does not deduct HAMLET’s guest service fee from owner proceeds', () => {
    const settlement = calculateSettlement({
      accommodationTotal: 360000,
      ownerRevenue: 360000,
      agentFee: 0,
      cautionFee: 25000,
      refundAmount: 0,
    })

    expect(settlement.ownerPayout).toBe(360000)
    expect(settlement.agentPayout).toBe(0)
    expect(settlement.cautionDepositLiability).toBe(25000)
    expect(settlement.netSettlement).toBe(360000)
  })

  it('rejects owner and partner allocations above the accommodation value', () => {
    expect(() => calculateSettlement({
      accommodationTotal: 100000,
      ownerRevenue: 95000,
      agentFee: 6000,
      cautionFee: 0,
      refundAmount: 0,
    })).toThrow('Owner and partner allocations exceed the accommodation value')
  })
})

describe('HAMLET platform fee compatibility', () => {
  it('calculates a percentage fee for legacy callers', () => {
    expect(calculatePlatformFee({ amount: 100000, percent: 3 })).toBe(3000)
  })
})

describe('Supabase browser key safety', () => {
  it('rejects modern secret keys and legacy service-role JWTs', () => {
    const serviceRolePayload = btoa(JSON.stringify({ role: 'service_role' }))
    const serviceRoleJwt = `header.${serviceRolePayload}.signature`

    expect(isSupabaseBrowserKeySafe('sb_secret_not-for-browser')).toBe(false)
    expect(isSupabaseBrowserKeySafe(serviceRoleJwt)).toBe(false)
  })

  it('accepts publishable keys and legacy anon JWTs', () => {
    const anonPayload = btoa(JSON.stringify({ role: 'anon' }))
    const anonJwt = `header.${anonPayload}.signature`

    expect(isSupabaseBrowserKeySafe('sb_publishable_public-key')).toBe(true)
    expect(isSupabaseBrowserKeySafe(anonJwt)).toBe(true)
  })
})
