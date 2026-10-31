// Structural validation is not a geospatial topology or licensing review.
const validText = (v,max) => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max;
const timestamp = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function validateBoundary(input) {
 if (!input || !validText(input.version,128) || typeof input.fixture !== 'boolean' || !validText(input.sourceName,300) || !validText(input.license,500) || !timestamp(input.acquiredAt)) throw new Error('Invalid boundary provenance');
 let source;
 try { source = new URL(input.sourceUrl); } catch { throw new Error('Invalid boundary source'); }
 if (source.protocol !== 'https:' || source.username || source.password || source.hash) throw new Error('Invalid boundary source');
 const geometry = input.geometry;
 if (!geometry || !['Polygon','MultiPolygon'].includes(geometry.type) || !Array.isArray(geometry.coordinates)) throw new Error('Invalid geometry');
 const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
 if (!polygons.length || polygons.length > 1000) throw new Error('Invalid geometry');
 let positions = 0;
 const checked = polygons.map(polygon => {
  if (!Array.isArray(polygon) || !polygon.length || polygon.length > 1000) throw new Error('Invalid polygon');
  return polygon.map(ring => {
   if (!Array.isArray(ring) || ring.length < 4) throw new Error('Invalid ring');
   positions += ring.length;
   if (positions > 20000) throw new Error('Geometry too large');
   const out = ring.map(point => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) throw new Error('Invalid position');
    return [point[0],point[1]];
   });
   const first = out[0], last = out[out.length-1];
   if (first[0] !== last[0] || first[1] !== last[1] || new Set(out.slice(0,-1).map(p=>`${p[0]},${p[1]}`)).size < 3) throw new Error('Invalid ring');
   return out;
  });
 });
 return {version:input.version,fixture:input.fixture,sourceName:input.sourceName,sourceUrl:source.href,license:input.license,acquiredAt:input.acquiredAt,geometry:{type:geometry.type,coordinates:geometry.type === 'Polygon' ? checked[0] : checked}};
}
