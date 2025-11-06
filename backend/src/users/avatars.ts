/**
 * Liste d'avatars prédéfinis pour les utilisateurs
 * Utilise l'API DiceBear pour générer des avatars personnalisés avec différents styles
 */

export interface AvatarOption {
  id: string;
  name: string;
  url: string;
  gender?: 'male' | 'female';
  skin?: 'light' | 'medium' | 'dark';
  hair?: 'short' | 'long' | 'locks';
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // Hommes - Peau claire
  { id: 'male-1', name: 'Homme - Peau claire - Cheveux courts', gender: 'male', skin: 'light', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale1&backgroundColor=b6e3f4&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'male-2', name: 'Homme - Peau claire - Cheveux longs', gender: 'male', skin: 'light', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale2&backgroundColor=b6e3f4&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
  { id: 'male-3', name: 'Homme - Peau claire - Locks', gender: 'male', skin: 'light', hair: 'locks', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale3&backgroundColor=b6e3f4&top=frizzle,curly&accessories=blank&hairColor=black' },
  
  // Hommes - Peau foncée
  { id: 'male-4', name: 'Homme - Peau foncée - Cheveux courts', gender: 'male', skin: 'dark', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale4&backgroundColor=b6e3f4&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'male-5', name: 'Homme - Peau foncée - Cheveux longs', gender: 'male', skin: 'dark', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale5&backgroundColor=b6e3f4&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
  { id: 'male-6', name: 'Homme - Peau foncée - Locks', gender: 'male', skin: 'dark', hair: 'locks', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale6&backgroundColor=b6e3f4&top=frizzle,curly&accessories=blank&hairColor=black' },
  
  // Hommes - Peau moyenne
  { id: 'male-7', name: 'Homme - Peau moyenne - Cheveux courts', gender: 'male', skin: 'medium', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale7&backgroundColor=b6e3f4&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'male-8', name: 'Homme - Peau moyenne - Cheveux longs', gender: 'male', skin: 'medium', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyMale8&backgroundColor=b6e3f4&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
  
  // Femmes - Peau claire
  { id: 'female-1', name: 'Femme - Peau claire - Cheveux courts', gender: 'female', skin: 'light', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale1&backgroundColor=ffd5dc&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'female-2', name: 'Femme - Peau claire - Cheveux longs', gender: 'female', skin: 'light', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale2&backgroundColor=ffd5dc&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
  { id: 'female-3', name: 'Femme - Peau claire - Locks', gender: 'female', skin: 'light', hair: 'locks', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale3&backgroundColor=ffd5dc&top=frizzle,curly&accessories=blank&hairColor=black' },
  
  // Femmes - Peau foncée
  { id: 'female-4', name: 'Femme - Peau foncée - Cheveux courts', gender: 'female', skin: 'dark', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale4&backgroundColor=ffd5dc&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'female-5', name: 'Femme - Peau foncée - Cheveux longs', gender: 'female', skin: 'dark', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale5&backgroundColor=ffd5dc&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
  { id: 'female-6', name: 'Femme - Peau foncée - Locks', gender: 'female', skin: 'dark', hair: 'locks', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale6&backgroundColor=ffd5dc&top=frizzle,curly&accessories=blank&hairColor=black' },
  
  // Femmes - Peau moyenne
  { id: 'female-7', name: 'Femme - Peau moyenne - Cheveux courts', gender: 'female', skin: 'medium', hair: 'short', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale7&backgroundColor=ffd5dc&top=shortHairShortWaved,shortHairShortFlat,shortHairShortCurly&accessories=blank&hairColor=black' },
  { id: 'female-8', name: 'Femme - Peau moyenne - Cheveux longs', gender: 'female', skin: 'medium', hair: 'long', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=volleyFemale8&backgroundColor=ffd5dc&top=longHairStraight,longHairCurly,longHairBob&accessories=blank&hairColor=black' },
];

/**
 * Récupère tous les avatars disponibles
 */
export function getAvatars(): AvatarOption[] {
  return AVATAR_OPTIONS;
}

/**
 * Récupère un avatar par son ID
 */
export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATAR_OPTIONS.find(avatar => avatar.id === id);
}

