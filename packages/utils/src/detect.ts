export type Vertical = 
  | 'restaurant'
  | 'retail'
  | 'service'
  | 'healthcare'
  | 'legal'
  | 'real-estate'
  | 'automotive'
  | 'beauty'
  | 'fitness'
  | 'education'
  | 'technology'
  | 'consulting'
  | 'non-profit'
  | 'other';

export function detectVertical(content: string, domain: string): Vertical {
  const text = content.toLowerCase();
  const domainLower = domain.toLowerCase();
  
  // Simple keyword-based detection
  const keywords = {
    restaurant: ['menu', 'food', 'dining', 'restaurant', 'cafe', 'bar', 'kitchen'],
    retail: ['shop', 'store', 'buy', 'purchase', 'product', 'shopping', 'retail'],
    service: ['service', 'repair', 'maintenance', 'cleaning', 'consultation'],
    healthcare: ['doctor', 'medical', 'health', 'clinic', 'hospital', 'therapy'],
    legal: ['lawyer', 'attorney', 'legal', 'law', 'court', 'litigation'],
    'real-estate': ['property', 'real estate', 'homes', 'houses', 'realtor'],
    automotive: ['car', 'auto', 'vehicle', 'repair', 'mechanic', 'dealership'],
    beauty: ['beauty', 'salon', 'spa', 'cosmetic', 'hair', 'nail'],
    fitness: ['gym', 'fitness', 'workout', 'training', 'exercise', 'yoga'],
    education: ['school', 'education', 'learning', 'training', 'course', 'university'],
    technology: ['software', 'tech', 'digital', 'app', 'website', 'development'],
    consulting: ['consulting', 'advisory', 'strategy', 'business'],
    'non-profit': ['non-profit', 'charity', 'foundation', 'donation', 'volunteer'],
  };
  
  for (const [vertical, words] of Object.entries(keywords)) {
    if (words.some(word => text.includes(word) || domainLower.includes(word))) {
      return vertical as Vertical;
    }
  }
  
  return 'other';
}

export function extractBusinessType(content: string): string[] {
  const text = content.toLowerCase();
  const businessTypes: string[] = [];
  
  // Common business type indicators
  if (text.includes('llc')) businessTypes.push('LLC');
  if (text.includes('inc')) businessTypes.push('Corporation');
  if (text.includes('corp')) businessTypes.push('Corporation');
  if (text.includes('ltd')) businessTypes.push('Limited');
  if (text.includes('partnership')) businessTypes.push('Partnership');
  if (text.includes('sole proprietorship')) businessTypes.push('Sole Proprietorship');
  
  return businessTypes;
}
