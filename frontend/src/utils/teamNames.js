/**
 * Traducción de nombres de equipos (inglés API → español display)
 * Los valores en DB se guardan en inglés (tal como vienen de TheSportsDB).
 * Esta función solo se usa para mostrar en pantalla.
 */
const EN_TO_ES = {
  // América del Sur
  'Argentina': 'Argentina',
  'Brazil': 'Brasil',
  'Uruguay': 'Uruguay',
  'Colombia': 'Colombia',
  'Ecuador': 'Ecuador',
  'Paraguay': 'Paraguay',
  'Chile': 'Chile',
  'Peru': 'Perú',
  'Venezuela': 'Venezuela',
  'Bolivia': 'Bolivia',

  // América del Norte / Central / Caribe
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'Mexico': 'México',
  'Canada': 'Canadá',
  'Costa Rica': 'Costa Rica',
  'Panama': 'Panamá',
  'Honduras': 'Honduras',
  'El Salvador': 'El Salvador',
  'Jamaica': 'Jamaica',
  'Haiti': 'Haití',
  'Trinidad and Tobago': 'Trinidad y Tobago',
  'Cuba': 'Cuba',

  // Europa
  'France': 'Francia',
  'Spain': 'España',
  'Germany': 'Alemania',
  'England': 'Inglaterra',
  'Portugal': 'Portugal',
  'Netherlands': 'Países Bajos',
  'Belgium': 'Bélgica',
  'Italy': 'Italia',
  'Croatia': 'Croacia',
  'Poland': 'Polonia',
  'Switzerland': 'Suiza',
  'Denmark': 'Dinamarca',
  'Sweden': 'Suecia',
  'Serbia': 'Serbia',
  'Scotland': 'Escocia',
  'Turkey': 'Turquía',
  'Austria': 'Austria',
  'Hungary': 'Hungría',
  'Greece': 'Grecia',
  'Ukraine': 'Ucrania',
  'Romania': 'Rumania',
  'Albania': 'Albania',
  'Georgia': 'Georgia',
  'Slovenia': 'Eslovenia',
  'Czech Republic': 'República Checa',
  'Slovakia': 'Eslovaquia',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Norway': 'Noruega',
  'Finland': 'Finlandia',
  'Iceland': 'Islandia',
  'Wales': 'Gales',
  'Northern Ireland': 'Irlanda del Norte',
  'Ireland': 'Irlanda',
  'Russia': 'Rusia',
  'Kosovo': 'Kosovo',
  'North Macedonia': 'Macedonia del Norte',
  'Bulgaria': 'Bulgaria',

  // África
  'Morocco': 'Marruecos',
  'Senegal': 'Senegal',
  'Nigeria': 'Nigeria',
  'Ghana': 'Ghana',
  'Cameroon': 'Camerún',
  'Ivory Coast': 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Tunisia': 'Túnez',
  'Algeria': 'Argelia',
  'Egypt': 'Egipto',
  'South Africa': 'Sudáfrica',
  'Mali': 'Mali',
  'Angola': 'Angola',
  'DR Congo': 'RD Congo',
  'Cape Verde': 'Cabo Verde',
  'Zambia': 'Zambia',
  'Tanzania': 'Tanzania',
  'Uganda': 'Uganda',
  'Guinea': 'Guinea',
  'Mozambique': 'Mozambique',
  'Burkina Faso': 'Burkina Faso',
  'Zimbabwe': 'Zimbabue',
  'Congo': 'Congo',
  'Kenya': 'Kenia',

  // Asia
  'Japan': 'Japón',
  'South Korea': 'Corea del Sur',
  'Australia': 'Australia',
  'Saudi Arabia': 'Arabia Saudita',
  'Iran': 'Irán',
  'Qatar': 'Qatar',
  'Iraq': 'Irak',
  'Uzbekistan': 'Uzbekistán',
  'China': 'China',
  'Indonesia': 'Indonesia',
  'Jordan': 'Jordania',
  'Oman': 'Omán',
  'Bahrain': 'Baréin',
  'United Arab Emirates': 'Emiratos Árabes',
  'India': 'India',
  'Thailand': 'Tailandia',
  'Vietnam': 'Vietnam',
  'Palestine': 'Palestina',
  'Syria': 'Siria',
  'Kuwait': 'Kuwait',
  'Kyrgyzstan': 'Kirguistán',
  'Tajikistan': 'Tayikistán',
  'Philippines': 'Filipinas',
  'Myanmar': 'Myanmar',
  'Malaysia': 'Malasia',

  // Oceanía
  'New Zealand': 'Nueva Zelanda',
  'Fiji': 'Fiyi',

  // Otros
  'Curaçao': 'Curazao',
  'Kosovo': 'Kosovo',
};

/**
 * Devuelve el nombre en español del equipo.
 * Si no hay traducción, devuelve el nombre original.
 */
export function teamName(englishName) {
  if (!englishName) return englishName;
  return EN_TO_ES[englishName] || englishName;
}

export default EN_TO_ES;
