// Generate consistent color for lead avatar based on name
export const generateAvatarColor = (name: string | null | undefined): string => {
  if (!name) return '#6366F1';
  // Create a simple hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Convert hash to a color
  const color = Math.abs(hash) % 360;
  // Generate HSL color with good saturation and lightness
  return `hsl(${color}, 70%, 50%)`;
};
// Get first letter of first name
export const getFirstLetterOfFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return '?';
  const firstName = fullName.trim().split(' ')[0];
  return firstName.charAt(0).toUpperCase();
};