'use client';

import { AppShell } from '@/components/app/app-shell';
import { InvoiceForm } from '@/components/app/invoice-form';

export default function CreateInvoicePage() {
  return (
    <AppShell
      title="Create Invoice"
      description="Build a professional invoice in seconds"
      backHref="/app/invoices"
    >
      <InvoiceForm mode="create" />
    </AppShell>
  );
}