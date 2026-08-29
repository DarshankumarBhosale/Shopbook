import { describe, it, expect } from 'vitest';
import { assertOwner, canSeeProfit, PermissionError } from '../permissions';

describe('assertOwner', () => {
  it('lets the owner through', () => {
    expect(() => assertOwner('owner', 'closeDay')).not.toThrow();
    expect(() => assertOwner('owner', 'reverseSale')).not.toThrow();
  });

  it('stops a helper, whatever the UI showed them', () => {
    // Rule 5: enforcement lives here, not in a hidden button.
    expect(() => assertOwner('helper', 'closeDay')).toThrow(PermissionError);
    expect(() => assertOwner('helper', 'reopenDay')).toThrow(PermissionError);
    expect(() => assertOwner('helper', 'reverseSale')).toThrow(PermissionError);
    expect(() => assertOwner('helper', 'editMenu')).toThrow(PermissionError);
  });

  it('stops an unset role', () => {
    expect(() => assertOwner(null, 'closeDay')).toThrow(PermissionError);
  });

  it('names the action it blocked', () => {
    expect(() => assertOwner('helper', 'reverseSale')).toThrow(/Reversing a sale/);
  });
});

describe('canSeeProfit', () => {
  it('is owner-only', () => {
    expect(canSeeProfit('owner')).toBe(true);
    expect(canSeeProfit('helper')).toBe(false);
    expect(canSeeProfit(null)).toBe(false);
  });
});
