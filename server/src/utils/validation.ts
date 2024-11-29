export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (field: any, fieldName: string): string | null => {
  if (!field) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validatePrice = (price: number): string | null => {
  if (price < 0) {
    return 'Price cannot be negative';
  }
  return null;
};
