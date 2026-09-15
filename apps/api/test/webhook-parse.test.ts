import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractPaymentEntity } from '../src/routes/webhook.js';

describe('extractPaymentEntity', () => {
  it('reads the payment entity from a real Razorpay payment.captured envelope', () => {
    const event = {
      entity: 'event',
      account_id: 'acc_test',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            entity: 'payment',
            amount: 103,
            currency: 'INR',
            status: 'captured',
            order_id: 'order_456',
          },
        },
      },
      created_at: 1725000000,
    };
    const entity = extractPaymentEntity(event);
    assert.equal(entity.id, 'pay_123');
    assert.equal(entity.order_id, 'order_456');
    assert.equal(entity.amount, 103);
    assert.equal(entity.currency, 'INR');
  });

  it('reads the entity from an order.paid-style envelope (multiple contains keys)', () => {
    const event = {
      entity: 'event',
      event: 'order.paid',
      contains: ['payment', 'order'],
      payload: {
        payment: {
          entity: { id: 'pay_abc', order_id: 'order_xyz', amount: 103, currency: 'INR', status: 'captured' },
        },
        order: {
          entity: { id: 'order_xyz', status: 'paid' },
        },
      },
    };
    assert.equal(extractPaymentEntity(event).id, 'pay_abc');
  });

  it('falls back to a top-level entity for flat payloads', () => {
    const event = { event: 'payment.captured', entity: { id: 'pay_x', order_id: 'order_y' } };
    assert.equal(extractPaymentEntity(event).id, 'pay_x');
  });

  it('returns an empty object when no payment entity exists', () => {
    assert.deepEqual(extractPaymentEntity({ event: 'whatever' }), {});
    assert.deepEqual(extractPaymentEntity({ entity: 'event', contains: ['payment'] }), {});
  });
});