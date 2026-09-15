'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { InvoiceForm } from '@/components/app/invoice-form';

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();

  return (
    <AppShell
      title="Edit Invoice"
      description="Update this draft invoice"
      backHref="/app/invoices"
    >
      <InvoiceForm mode="edit" invoiceId={params.id} />
    </AppShell>
  );
}