export const validateVIN = (vin: string): boolean => {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
