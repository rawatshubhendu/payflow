import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, effectiveStatus, isEditable } from '../src/lib/invoice-status.js';

describe('invoice status transitions', () => {
  it('allows DRAFT -> SENT and DRAFT -> CANCELLED', () => {
    assert.equal(canTransition('DRAFT', 'SENT'), true);
    assert.equal(canTransition('DRAFT', 'CANCELLED'), true);
  });

  it('allows SENT -> PENDING, PAID, OVERDUE, CANCELLED', () => {
    for (const to of ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']) {
      assert.equal(canTransition('SENT', to as never), true);
    }
  });

  it('allows PENDING -> PAID, OVERDUE, CANCELLED', () => {
    for (const to of ['PAID', 'OVERDUE', 'CANCELLED']) {
      assert.equal(canTransition('PENDING', to as never), true);
    }
  });

  it('allows OVERDUE -> PAID and OVERDUE -> CANCELLED', () => {
    assert.equal(canTransition('OVERDUE', 'PAID'), true);
    assert.equal(canTransition('OVERDUE', 'CANCELLED'), true);
  });

  it('never allows PAID or CANCELLED to move again', () => {
    for (const from of ['PAID', 'CANCELLED']) {
      for (const to of ['DRAFT', 'SENT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']) {
        assert.equal(canTransition(from as never, to as never), false);
      }
    }
  });

  it('never returns to DRAFT once sent', () => {
    for (const from of ['SENT', 'PENDING', 'OVERDUE']) {
      assert.equal(canTransition(from as never, 'DRAFT'), false);
    }
  });

  it('only DRAFT invoices are editable', () => {
    assert.equal(isEditable({ status: 'DRAFT' }), true);
    for (const status of ['SENT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']) {
      assert.equal(isEditable({ status: status as never }), false);
    }
  });
});

describe('effectiveStatus', () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  it('keeps SENT before due date', () => {
    assert.equal(effectiveStatus({ status: 'SENT', dueDate: tomorrow }), 'SENT');
  });

  it('derives OVERDUE once the due date has fully passed', () => {
    assert.equal(effectiveStatus({ status: 'SENT', dueDate: yesterday }), 'OVERDUE');
    assert.equal(effectiveStatus({ status: 'PENDING', dueDate: yesterday }), 'OVERDUE');
  });

  it('keeps the stored status for DRAFT, PAID and CANCELLED regardless of due date', () => {
    assert.equal(effectiveStatus({ status: 'DRAFT', dueDate: yesterday }), 'DRAFT');
    assert.equal(effectiveStatus({ status: 'PAID', dueDate: yesterday }), 'PAID');
    assert.equal(effectiveStatus({ status: 'CANCELLED', dueDate: yesterday }), 'CANCELLED');
  });

  it('returns the stored status when there is no due date', () => {
    assert.equal(effectiveStatus({ status: 'SENT', dueDate: null }), 'SENT');
  });
});