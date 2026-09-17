export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export type NotificationType = 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED' | 'INVOICE_SENT';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  read: boolean;
  createdAt: string;
};

export type NotificationListResult = {
  notifications: AppNotification[];
  unreadCount: number;
};

export type SubscriptionPlan = 'FREE' | 'PRO' | 'BUSINESS';

export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'INACTIVE';

export const PLAN_CATALOG = {
  FREE: { name: 'Free', pricePerMonth: 0, invoiceLimitPerMonth: 5 },
  PRO: { name: 'Pro', pricePerMonth: 999, invoiceLimitPerMonth: 50 },
  BUSINESS: { name: 'Business', pricePerMonth: 2499, invoiceLimitPerMonth: 200 },
} as const;

export type SubscriptionInfo = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string | null;
  nextResetAt: string;
  sandbox: boolean;
  features: {
    analyticsCharts: boolean;
    customBranding: boolean;
    paymentReminders: boolean;
  };
  limits: {
    invoiceLimit: number;
    invoicesUsed: number;
    invoicesRemaining: number;
  };
};

export type SubscriptionSelectResult = SubscriptionInfo & {
  note: string;
};

export type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown> | null;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiFailure = {
  data: null;
  error: ApiErrorBody;
  meta: null;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: 'payflow-api';
  timestamp: string;
  database: 'connected' | 'disconnected';
};

export type UserSummary = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
};

export type BusinessSummary = {
  id: string;
  name: string;
  currency: string;
  invoicePrefix: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  defaultTaxRate?: number;
  defaultTaxType?: TaxType;
  defaultDueDays?: number;
  invoiceNotes?: string;
  thankYouNote?: string;
  notifyInvoiceSent?: boolean;
  notifyPaymentReceived?: boolean;
};

export type AuthResult = {
  user: UserSummary;
  business: BusinessSummary;
};

export type RegisterRequest = {
  email: string;
  password: string;
  businessName: string;
};

export type RegisterResult = {
  status: 'VERIFICATION_REQUIRED';
  email: string;
  expiresAt: string;
  devCode?: string;
};

export type VerifyEmailRequest = {
  email: string;
  code: string;
};

export type ResendOtpRequest = {
  email: string;
};

export type ResendOtpResult = {
  success: boolean;
  expiresAt?: string;
  devCode?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TaxType = 'NONE' | 'CGST_SGST' | 'IGST';

export type CustomerSummary = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
};

export type CreateCustomerRequest = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
};

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type CreateInvoiceRequest = {
  customerId: string;
  items: LineItemInput[];
  discountAmount?: number;
  taxRate?: number;
  taxType?: TaxType;
  issueDate?: string;
  dueDate?: string;
};

export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>;

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customer: { id: string; name: string };
  totalAmount: number;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
  createdAt: string;
  publicToken: string;
};

export type InvoiceDetail = InvoiceSummary & {
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxType: TaxType;
  taxAmount: number;
  sentAt: string | null;
  paidAt: string | null;
};

export type AnalyticsOverview = {
  kpis: {
    total: number;
    collected: number;
    pending: number;
    overdue: number;
  };
  counts: {
    invoices: number;
    customers: number;
    collected: number;
    pending: number;
    overdue: number;
  };
  recentInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
};

export type RevenuePoint = {
  date: string;
  label: string;
  revenue: number;
};

export type RevenueOverview = {
  range: 7 | 30 | 90;
  series: RevenuePoint[];
};

export type PaymentStatusOverview = {
  paid: number;
  pending: number;
  overdue: number;
  failed: number;
  total: number;
  counts: {
    paid: number;
    pending: number;
    overdue: number;
    failed: number;
    total: number;
  };
};

export type PublicInvoice = {
  businessName: string;
  businessLogoUrl?: string;
  invoiceNumber: string;
  status: Exclude<InvoiceStatus, 'DRAFT'>;
  currency: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  taxType: TaxType;
  items: LineItem[];
  dueDate: string | null;
};

export type PaymentOrderResult = {
  orderId: string;
  gateway: string;
  keyId: string | null;
  amount: number;
  currency: string;
  clientSecret: string | null;
};

export type PaymentListItem = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: string;
  method: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PaymentsOverview = {
  kpis: {
    collected: number;
    pending: number;
    failed: number;
  };
  counts: {
    collected: number;
    pending: number;
    failed: number;
  };
  payments: PaymentListItem[];
};

export type PaymentDetail = PaymentListItem & {
  customer: { id: string; name: string; email: string | null } | null;
  invoice: { id: string; invoiceNumber: string; status: InvoiceStatus } | null;
  gatewayPaymentId: string | null;
};

export type PaymentGatewayStatus = {
  connected: boolean;
  provider: 'razorpay' | null;
  mode: 'test' | 'live' | null;
  keyId: string | null;
  connectedAt: string | null;
  webhookUrl: string | null;
};

export type VerifyGatewayKeysResult = {
  valid: boolean;
  details?: string;
};

export type GatewayTestResult = {
  orderId: string;
  receipt: string;
  amount: number;
  currency: string;
};

export type AdminRole = {
  isAdmin: boolean;
};

export type AdminOverview = {
  counts: {
    users: number;
    businesses: number;
    invoices: number;
    customers: number;
    payments: number;
    errors: number;
  };
  revenue: {
    invoiced: number;
    collected: number;
    failed: number;
  };
  invoiceStatuses: Record<InvoiceStatus, number>;
  planDistribution: Record<SubscriptionPlan, number>;
  recentSignups: { id: string; email: string; emailVerified: boolean; createdAt: string }[];
  recentAudit: AdminAuditEntry[];
  recentErrors: AdminErrorEntry[];
};

export type AdminUserRow = {
  id: string;
  email: string;
  emailVerified: boolean;
  businessName: string | null;
  plan: SubscriptionPlan;
  invoiceCount: number;
  createdAt: string;
};

export type AdminAuditEntry = {
  id: string;
  businessId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

export type AdminErrorEntry = {
  id: string;
  requestId: string | null;
  method: string;
  path: string;
  status: number;
  code: string;
  message: string;
  createdAt: string;
};


