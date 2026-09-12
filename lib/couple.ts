export const SANTI_ID = '6d9edb4a-d7ef-4936-8a68-5175a15cc477';
export const KATE_ID = '5c4a09e9-0cd8-49c1-be28-76bc1380b6d0';

export function getUserName(userId?: string | null): string {
  if (!userId) return 'Pareja';
  if (userId === SANTI_ID) return 'Santi';
  if (userId === KATE_ID) return 'Kate';
  return 'Usuario';
}

export function getUserBadgeColor(userId?: string | null): { bg: string; text: string } {
  if (userId === SANTI_ID) {
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' }; // Azul suave para Santi
  }
  if (userId === KATE_ID) {
    return { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' }; // Rosa suave para Kate
  }
  return { bg: 'rgba(107, 114, 128, 0.15)', text: 'var(--text-muted)' };
}
