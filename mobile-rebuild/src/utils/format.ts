export function formatRoleLabel(role: string | null) {
  if (!role) {
    return 'Guest';
  }

  return role.replace('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatUGX(amount: number) {
  return new Intl.NumberFormat('en-UG', {
    currency: 'UGX',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function formatStatusLabel(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
