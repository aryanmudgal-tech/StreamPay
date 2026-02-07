import { v4 as uuidv4 } from 'uuid';
import { PaymentProvider, PaymentResult } from '../types';

export class StubPaymentProvider implements PaymentProvider {
  name = 'stub';

  async charge(installId: string, amountCents: number, memo: string): Promise<PaymentResult> {
    console.log(`[stub-pay] charge ${amountCents}c to ${installId}: ${memo}`);
    return {
      success: true,
      transactionId: `stub_${uuidv4()}`,
      amountCents,
    };
  }

  async refund(transactionId: string): Promise<PaymentResult> {
    console.log(`[stub-pay] refund ${transactionId}`);
    return {
      success: true,
      transactionId,
      amountCents: 0,
    };
  }
}

export const paymentProvider: PaymentProvider = new StubPaymentProvider();
