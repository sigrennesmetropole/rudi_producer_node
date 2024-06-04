const mod = 'geo'

/**
 * Library for treating geography related properties
 */

// -------------------------------------------------------------------------------------------------
// External dependencies
// -------------------------------------------------------------------------------------------------
// import geojson from 'geojson'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { BadRequestError } from './errors.js'
import { logT, logW } from './logging.js'

// -------------------------------------------------------------------------------------------------
// Functions
// -------------------------------------------------------------------------------------------------
/**
 * Creates a GeoJSON Polygon object from a set of 4 coordinates
 * describing a bounding box
 */
export const bboxToGeoJsonPolygon = (western, southern, eastern, northern) => {
  const fun = 'bboxToGeoJsonPolygon'
  logT(mod, fun)

  if (southern > northern) {
    const errMsg = `Southern coordinate must be lower than northern coordinate`
    logW(mod, fun, errMsg)
    throw new BadRequestError(errMsg)
  }

  if (western === eastern && southern === northern) return coordsToGeoJsonPoint(western, southern)
  // The values of a "bbox" array are "[west, south, east, north]"
  // given in decimal degrees
  // source: https://tools.ietf.org/html/rfc7946#appendix-B.1
  const geoJsonBbox = [western, southern, eastern, northern]

  // Exterior rings are counterclockwise
  // source: https://tools.ietf.org/html/rfc7946#section-3.1.6
  const polygonExtRing = [
    [western, southern],
    [eastern, southern],
    [eastern, northern],
    [western, northern],
    [western, southern],
  ]

  // Coordinates of a Polygon are an array of linear ring
  // coordinate arrays.
  // The first element in the array represents the exterior ring.
  // Any subsequent elements represent interior rings (or holes).
  // source: https://tools.ietf.org/html/rfc7946#appendix-A.3
  const geoJsonPolygon = {
    type: 'Polygon',
    coordinates: [polygonExtRing],
    bbox: geoJsonBbox,
  }

  return geoJsonPolygon
}

export const coordsToGeoJsonPoint = (westLongitude, southLatitude) => {
  const fun = 'coordsToGeoJsonPoint'
  logT(mod, fun)

  // The values of a "bbox" array are "[west, south, east, north]"
  // given in decimal degrees
  // source: https://tools.ietf.org/html/rfc7946#appendix-B.1
  const geoJsonBbox = [westLongitude, southLatitude, westLongitude, southLatitude]

  // Coordinates of a Polygon are an array of linear ring
  // coordinate arrays.
  // The first element in the array represents the exterior ring.
  // Any subsequent elements represent interior rings (or holes).
  // source: https://tools.ietf.org/html/rfc7946#appendix-A.3
  const geoJsonPoint = {
    type: 'Point',
    coordinates: [westLongitude, southLatitude],
    bbox: geoJsonBbox,
  }

  return geoJsonPoint
}
/**
 * Creates a GeoJSON Polygon object from a set of 4 coordinates
 * describing a bounding box
 */
/*
export const bboxFromGeoJsonObject = (geoJsonObject) => {
  const fun = 'bboxFromGeoJsonObject'
  logT(mod, fun)

  const bbox = geojson.geo_bbox(geoJsonObject)
  logD(mod, fun, `bbox: ${bbox}`)

  return bbox
 */
