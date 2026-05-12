const yup = require('yup');
const { LEAD_SOURCES, PAYMENT_TERMS, PAYMENT_MODES, AGREEMENT_TYPES } = require('../config/constants');

const createBookingSchema = yup.object({
  client_name: yup.string().required('Client name is required').max(100),
  company_name: yup.string().max(150),
  mobile: yup.string().required('Mobile is required').matches(/^[0-9]{10}$/, 'Invalid mobile number'),
  email: yup.string().email('Invalid email'),
  pan_number: yup.string().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number').nullable(),
  gst_number: yup.string().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').nullable(),
  address: yup.string(),
  city: yup.string().max(50),
  state: yup.string().max(50),
  bdm_id: yup.number().required('BDM is required'),
  bdm2_id: yup.number().nullable(),
  lead_source: yup.string().oneOf(LEAD_SOURCES, 'Invalid lead source'),
  payment_terms: yup.string().oneOf(Object.values(PAYMENT_TERMS)),
  payment_mode: yup.string().oneOf(Object.values(PAYMENT_MODES)),
  agreement_type: yup.string().oneOf(Object.values(AGREEMENT_TYPES)),
  received_amount: yup.number().min(0, 'Amount must be positive'),
  services: yup.array().of(
    yup.object({
      service_id: yup.number().required('Service ID is required'),
      custom_price: yup.number().min(0, 'Price must be positive'),
      gst_percentage: yup.number().min(0).max(100)
    })
  ).min(1, 'At least one service is required')
});

const updateBookingSchema = yup.object({
  client_name: yup.string().max(100),
  company_name: yup.string().max(150),
  mobile: yup.string().matches(/^[0-9]{10}$/, 'Invalid mobile number'),
  email: yup.string().email('Invalid email'),
  pan_number: yup.string().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number').nullable(),
  gst_number: yup.string().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').nullable(),
  address: yup.string(),
  city: yup.string().max(50),
  state: yup.string().max(50),
  bdm_id: yup.number(),
  bdm2_id: yup.number().nullable(),
  lead_source: yup.string().oneOf(LEAD_SOURCES),
  payment_terms: yup.string().oneOf(Object.values(PAYMENT_TERMS)),
  payment_mode: yup.string().oneOf(Object.values(PAYMENT_MODES)),
  agreement_type: yup.string().oneOf(Object.values(AGREEMENT_TYPES))
});

module.exports = {
  createBookingSchema,
  updateBookingSchema
};
