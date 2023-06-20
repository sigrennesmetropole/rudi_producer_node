// -------------------------------------------------------------------------------------------------
// Custom schema definition
// -------------------------------------------------------------------------------------------------

/**
 * Position on the South / North meridian
 */
export const Latitude = {
  type: Number,
  min: -90,
  max: 90,
}

/**
 * Position around the equator
 */
export const Longitude = {
  type: Number,
  min: -180,
  max: 180,
}

/**
 * 2D position on the globe
 */
export const GpsCoordinatesSchema = {
  latitude: Latitude,
  longitude: Longitude,
}
