const yup = require("yup");
const { PAYMENT_MODES, VERIFICATION_STATUS } = require("../config/constants");

const createPaymentSchema = yup.object({
  booking_id: yup.number().required("Booking ID is required"),
  payment_date: yup.date().required("Payment date is required"),
  payment_mode: yup
    .string()
    .oneOf(Object.values(PAYMENT_MODES))
    .required("Payment mode is required"),
  payment_reference: yup.string().max(100),
  base_amount: yup.number().required("Base amount is required").min(0),
  gst_amount: yup.number().min(0).default(0),
  total_amount: yup.number().required("Total amount is required").min(0),
  received_amount: yup.number().required("Received amount is required").min(0),
  remarks: yup.string(),
});

const remainingPaymentSchema = yup.object({
  booking_id: yup.number().required("Booking ID is required"),
  received_amount: yup
    .number()
    .required("Amount is required")
    .min(1, "Amount must be greater than 0"),
  payment_mode: yup
    .string()
    .oneOf(Object.values(PAYMENT_MODES))
    .required("Payment mode is required"),
  payment_date: yup.date(),
  payment_reference: yup.string().max(100),
  remarks: yup.string(),
});

const verifyPaymentSchema = yup.object({
  verification_status: yup
    .string()
    .oneOf([VERIFICATION_STATUS.VERIFIED, VERIFICATION_STATUS.REJECTED])
    .required(),
  verified_amount: yup.number().min(0),
  rejection_reason: yup.string().when("verification_status", {
    is: VERIFICATION_STATUS.REJECTED,
    then: (schema) => schema.required("Rejection reason is required"),
    otherwise: (schema) => schema,
  }),
  remarks: yup.string(),
});

module.exports = {
  createPaymentSchema,
  remainingPaymentSchema,
  verifyPaymentSchema,
};
