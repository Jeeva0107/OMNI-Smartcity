import { INITIAL_JUNCTIONS } from '../../data/mockData';

const junctionCoordinates = INITIAL_JUNCTIONS
  .map(({ lat, lng }) => [Number(lat), Number(lng)])
  .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

const latitudes = junctionCoordinates.map(([lat]) => lat);
const longitudes = junctionCoordinates.map(([, lng]) => lng);
const latPadding = Math.max(0.01, (Math.max(...latitudes) - Math.min(...latitudes)) * 0.08);
const lngPadding = Math.max(0.01, (Math.max(...longitudes) - Math.min(...longitudes)) * 0.08);

export const CHENNAI_JUNCTION_BOUNDS = [
  [Math.min(...latitudes) - latPadding, Math.min(...longitudes) - lngPadding],
  [Math.max(...latitudes) + latPadding, Math.max(...longitudes) + lngPadding],
];

export const CHENNAI_MAP_CENTER = [13.03, 80.25];
export const CHENNAI_MAP_ZOOM = 12;
export const CHENNAI_MAP_MIN_ZOOM = 11;
export const CHENNAI_MAP_MAX_ZOOM = 18;
