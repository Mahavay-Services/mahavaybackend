const generateBookingNumber = async (Booking) => {
  const today = new Date();
  const year = today.getFullYear();

  const prefix = `ECRM-${year}-`;

  const lastBooking = await Booking.findOne({
    where: {
      booking_number: {
        [require("sequelize").Op.like]: `${prefix}%`,
      },
    },
    order: [["booking_number", "DESC"]],
  });

  let sequence = 1;
  if (lastBooking) {
    const lastSeq = parseInt(lastBooking.booking_number.split("-").pop());
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
};

const generateEmployeeId = async (User, department = "GEN") => {
  const prefix = department.slice(0, 3).toUpperCase();

  const lastUser = await User.findOne({
    where: {
      employee_id: {
        [require("sequelize").Op.like]: `${prefix}%`,
      },
    },
    order: [["employee_id", "DESC"]],
  });

  let sequence = 1;
  if (lastUser && lastUser.employee_id) {
    const lastSeq = parseInt(lastUser.employee_id.slice(-4));
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
};

const calculateGST = (baseAmount, gstPercentage) => {
  const base = parseFloat(baseAmount) || 0;
  const gst = parseFloat(gstPercentage) || 0;
  const gstAmount = (base * gst) / 100;
  const totalAmount = base + gstAmount;

  return {
    baseAmount: Math.round(base * 100) / 100,
    gstPercentage: gst,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
};

const calculateBookingTotals = (services) => {
  let subtotal = 0;
  let totalGst = 0;

  services.forEach((service) => {
    const price =
      parseFloat(service.custom_price || service.default_price) || 0;
    const gstPercent = parseFloat(service.gst_percentage) || 18;
    const gstAmount = (price * gstPercent) / 100;

    subtotal += price;
    totalGst += gstAmount;
  });

  return {
    subtotal_amount: Math.round(subtotal * 100) / 100,
    gst_amount: Math.round(totalGst * 100) / 100,
    total_amount: Math.round((subtotal + totalGst) * 100) / 100,
  };
};

const calculateBDMSplits = (totalAmount, bdm1Id, bdm2Id) => {
  const splits = [];
  const total = parseFloat(totalAmount) || 0;

  if (bdm2Id && bdm1Id !== bdm2Id) {
    splits.push({
      user_id: bdm1Id,
      split_percentage: 50.0,
      split_amount: Math.round(total * 0.5 * 100) / 100,
    });
    splits.push({
      user_id: bdm2Id,
      split_percentage: 50.0,
      split_amount: Math.round(total * 0.5 * 100) / 100,
    });
  } else {
    splits.push({
      user_id: bdm1Id,
      split_percentage: 100.0,
      split_amount: total,
    });
  }

  return splits;
};

const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount || 0);
};

const paginate = (page = 1, limit = 20, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(Math.max(1, parseInt(limit)), maxLimit);
  const offset = (pageNum - 1) * limitNum;

  return { limit: limitNum, offset, page: pageNum };
};

module.exports = {
  generateBookingNumber,
  generateEmployeeId,
  calculateGST,
  calculateBookingTotals,
  calculateBDMSplits,
  getClientIP,
  sanitizeFilename,
  formatCurrency,
  paginate,
};
