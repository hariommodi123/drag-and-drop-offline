export const sanitizeMobileNumber = (mobile) =>
  (mobile || '')
    .toString()
    .replace(/\D/g, '')
    .slice(-10);

export const isValidMobileNumber = (mobile) => {
  const sanitized = sanitizeMobileNumber(mobile);
  return /^[6-9]\d{9}$/.test(sanitized);
};


