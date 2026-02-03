export function validateEmail(email: string): string {
  if (!email) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Invalid email address';
  return '';
}
export function validatePassword(password: string): string {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
}
export function validateConfirmPassword(password: string, confirmPassword: string): string {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}