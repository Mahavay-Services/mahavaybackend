module.exports = {
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    SALES: 'sales',
    ACCOUNTS: 'accounts',
    LEGAL: 'legal',
    OPS_MANAGER: 'ops_manager',
    OPS_MEMBER: 'ops_member',
    RM: 'rm'
  },

  BOOKING_STAGES: {
    SALES_CREATED: 'sales_created',
    ACCOUNTS_VERIFICATION_PENDING: 'accounts_verification_pending',
    ACCOUNTS_VERIFIED: 'accounts_verified',
    LEGAL_PENDING: 'legal_pending',
    LEGAL_VERIFIED: 'legal_verified',
    OPERATIONS_STARTED: 'operations_started',
    PARTIALLY_COMPLETED: 'partially_completed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ON_HOLD: 'on_hold'
  },

  LEAD_SOURCES: [
    'Website',
    'Referral',
    'Cold Call',
    'Social Media',
    'Advertisement',
    'WhatsApp',
    'Walk-in',
    'Other'
  ],

  PAYMENT_TERMS: {
    ADVANCE: 'advance',
    AGREEMENT: 'agreement'
  },

  PAYMENT_MODES: {
    RAZORPAY: 'razorpay',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
    CASH: 'cash'
  },

  AGREEMENT_TYPES: {
    REFUNDABLE: 'refundable',
    NON_REFUNDABLE: 'non_refundable'
  },

  VERIFICATION_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  },

  APPROVAL_TYPES: {
    ACCOUNTS: 'accounts',
    LEGAL: 'legal'
  },

  DOCUMENT_TYPES: [
    'agreement',
    'nda',
    'invoice',
    'pan_copy',
    'gst_copy',
    'payment_receipt',
    'service_document',
    'other'
  ],

  OPERATION_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    WAITING_CLIENT: 'waiting_client',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
    ON_HOLD: 'on_hold'
  },

  AUDIT_ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    REJECT: 'reject',
    UPLOAD: 'upload',
    STAGE_CHANGE: 'stage_change',
    ASSIGN: 'assign'
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  }
};
