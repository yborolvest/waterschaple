export interface Snelweg {

  id: string;

  name: string;

  /** NL: Routebeschrijving / EN: Route description */

  route: string;

  lat: number;

  lng: number;

}



/**

 * Nederlandse rijksautosnelwegen met representatieve middenpunten.

 * EN: Dutch motorways with approximate midpoint coordinates.

 */

export const SNELWEGEN: Snelweg[] = [

  { id: 'a1', name: 'A1', route: 'Amsterdam – Oldenzaal', lat: 52.21, lng: 6.05 },

  { id: 'a2', name: 'A2', route: 'Amsterdam – Maastricht', lat: 51.7, lng: 5.3 },

  { id: 'a4', name: 'A4', route: 'Amsterdam – Antwerpen', lat: 51.99, lng: 4.35 },

  { id: 'a5', name: 'A5', route: 'Hoofddorp – Badhoevedorp', lat: 52.3, lng: 4.73 },

  { id: 'a6', name: 'A6', route: 'Amsterdam – Joure', lat: 52.51, lng: 5.48 },

  { id: 'a7', name: 'A7', route: 'Zaandam – Bad Nieuweschans', lat: 53.1, lng: 6.1 },

  { id: 'a8', name: 'A8', route: 'Amsterdam – Zaanstad', lat: 52.44, lng: 4.82 },

  { id: 'a9', name: 'A9', route: 'Amsterdam – Alkmaar', lat: 52.5, lng: 4.75 },

  { id: 'a10', name: 'A10', route: 'Ring Amsterdam', lat: 52.37, lng: 4.93 },

  { id: 'a12', name: 'A12', route: 'Den Haag – Arnhem', lat: 52.09, lng: 5.12 },

  { id: 'a13', name: 'A13', route: 'Den Haag – Rotterdam', lat: 51.95, lng: 4.4 },

  { id: 'a15', name: 'A15', route: 'Rotterdam – Nijmegen', lat: 51.83, lng: 5.02 },

  { id: 'a16', name: 'A16', route: 'Rotterdam – Antwerpen', lat: 51.58, lng: 4.77 },

  { id: 'a17', name: 'A17', route: 'Dordrecht – Moerdijk', lat: 51.76, lng: 4.62 },

  { id: 'a18', name: 'A18', route: 'Doetinchem – Varsseveld', lat: 51.97, lng: 6.3 },

  { id: 'a20', name: 'A20', route: 'Gouda – Rotterdam', lat: 51.92, lng: 4.55 },

  { id: 'a27', name: 'A27', route: 'Breda – Almere', lat: 52.08, lng: 5.08 },

  { id: 'a28', name: 'A28', route: 'Utrecht – Groningen', lat: 52.51, lng: 6.08 },

  { id: 'a29', name: 'A29', route: 'Rotterdam – Bergen op Zoom', lat: 51.62, lng: 4.3 },

  { id: 'a30', name: 'A30', route: 'Barneveld – Ede', lat: 52.2, lng: 5.6 },

  { id: 'a31', name: 'A31', route: 'Leeuwarden – Franeker', lat: 53.15, lng: 5.53 },

  { id: 'a32', name: 'A32', route: 'Meppel – Leeuwarden', lat: 52.96, lng: 5.92 },

  { id: 'a35', name: 'A35', route: 'Enschede – Zwolle', lat: 52.27, lng: 6.5 },

  { id: 'a50', name: 'A50', route: 'Eindhoven – Nijmegen', lat: 51.77, lng: 5.52 },

  { id: 'a58', name: 'A58', route: 'Eindhoven – Bergen op Zoom', lat: 51.56, lng: 5.02 },

  { id: 'a59', name: 'A59', route: "Oss – 's-Hertogenbosch", lat: 51.68, lng: 5.35 },

  { id: 'a65', name: 'A65', route: "Tilburg – 's-Hertogenbosch", lat: 51.61, lng: 5.2 },

  { id: 'a67', name: 'A67', route: 'Eindhoven – Venlo', lat: 51.45, lng: 5.7 },

  { id: 'a73', name: 'A73', route: 'Nijmegen – Maastricht', lat: 51.19, lng: 5.98 },

  { id: 'a76', name: 'A76', route: 'Heerlen – Duitsland', lat: 50.89, lng: 6.04 },

  { id: 'a79', name: 'A79', route: 'Heerlen – Maastricht', lat: 50.87, lng: 5.95 },

];



export function findSnelwegById(id: string): Snelweg | undefined {

  return SNELWEGEN.find((s) => s.id === id);

}



export function findSnelwegByName(name: string): Snelweg | undefined {

  const normalized = name.trim().toUpperCase();

  return SNELWEGEN.find((s) => s.name.toUpperCase() === normalized);

}



/** Sorteer op wegnummer (A1, A2, … A10) */

export function sortSnelwegen(roads: Snelweg[]): Snelweg[] {

  return [...roads].sort((a, b) => {

    const numA = parseInt(a.name.slice(1), 10);

    const numB = parseInt(b.name.slice(1), 10);

    return numA - numB;

  });

}


