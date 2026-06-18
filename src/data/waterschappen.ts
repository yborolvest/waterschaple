export interface Waterschap {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * 20 Nederlandse waterschappen met centrale coördinaten.
 * EN: Dutch water boards with approximate centre coordinates.
 */
export const WATERSCHAPPEN: Waterschap[] = [
  { id: 'noorderzijlvest', name: 'Noorderzijlvest', lat: 53.2, lng: 6.5 },
  { id: 'fryslan', name: 'Fryslân', lat: 53.1, lng: 5.8 },
  { id: 'hunze-en-aas', name: "Hunze en Aa's", lat: 53.1, lng: 6.9 },
  { id: 'drents-overijsselse-delta', name: 'Drents Overijsselse Delta', lat: 52.5, lng: 6.1 },
  { id: 'vechtstromen', name: 'Vechtstromen', lat: 52.3, lng: 6.9 },
  { id: 'zuiderzeeland', name: 'Zuiderzeeland', lat: 52.5, lng: 5.5 },
  { id: 'vallei-en-veluwe', name: 'Vallei en Veluwe', lat: 52.2, lng: 5.6 },
  { id: 'rijn-en-ijssel', name: 'Rijn en IJssel', lat: 52.0, lng: 6.3 },
  { id: 'stichtse-rijnlanden', name: 'Stichtse Rijnlanden', lat: 52.0, lng: 5.0 },
  { id: 'amstel-gooi-en-vecht', name: 'Amstel, Gooi en Vecht', lat: 52.3, lng: 4.9 },
  { id: 'hollands-noorderkwartier', name: 'Hollands Noorderkwartier', lat: 52.6, lng: 4.9 },
  { id: 'rijnland', name: 'Rijnland', lat: 52.2, lng: 4.5 },
  { id: 'delfland', name: 'Delfland', lat: 52.0, lng: 4.3 },
  { id: 'schieland-krimpenerwaard', name: 'Schieland en de Krimpenerwaard', lat: 51.9, lng: 4.6 },
  { id: 'rivierenland', name: 'Rivierenland', lat: 51.9, lng: 5.3 },
  { id: 'brabantse-delta', name: 'Brabantse Delta', lat: 51.6, lng: 4.7 },
  { id: 'de-dommel', name: 'De Dommel', lat: 51.4, lng: 5.4 },
  { id: 'aa-en-maas', name: 'Aa en Maas', lat: 51.7, lng: 5.5 },
  { id: 'limburg', name: 'Limburg', lat: 51.2, lng: 6.0 },
  { id: 'scheldestromen', name: 'Scheldestromen', lat: 51.4, lng: 3.9 },
];
