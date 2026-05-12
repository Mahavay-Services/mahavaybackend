const yup = require("yup");
const { ROLES } = require("../config/constants");

const createUserSchema = yup.object({
  full_name: yup.string().required("Full name is required").max(100),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup
    .string()
    .required("Phone is required")
    .matches(/^[0-9]{10}$/, "Invalid phone number"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),
  role: yup
    .string()
    .oneOf(Object.values(ROLES), "Invalid role")
    .required("Role is required"),
  department: yup.string().max(50).nullable(),
  position: yup.string().max(50).nullable(),
  join_date: yup.date().nullable(),
  address: yup.string().nullable(),
  city: yup.string().max(50).nullable(),
  state: yup.string().max(50).nullable(),
  emergency_contact: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "phone",
      "Invalid emergency contact",
      (value) => !value || /^[0-9]{10}$/.test(value),
    ),
});

const updateUserSchema = yup.object({
  full_name: yup.string().max(100),
  phone: yup.string().matches(/^[0-9]{10}$/, "Invalid phone number"),
  role: yup.string().oneOf(Object.values(ROLES), "Invalid role"),
  department: yup.string().max(50).nullable(),
  position: yup.string().max(50).nullable(),
  join_date: yup.date().nullable(),
  address: yup.string().nullable(),
  city: yup.string().max(50).nullable(),
  state: yup.string().max(50).nullable(),
  emergency_contact: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "phone",
      "Invalid emergency contact",
      (value) => !value || /^[0-9]{10}$/.test(value),
    ),
  is_active: yup.boolean(),
});

const resetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(8, "Password must be at least 8 characters"),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
};
