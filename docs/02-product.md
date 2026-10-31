# Product and MVP

## Ijuru Signal: signal to field verification

**Problem hypothesis:** district or cooperative teams need a shared, traceable way to decide which areas merit field checks when rainfall and vegetation signals change. **User:** a local climate or agriculture practitioner, not an automated public warning authority. **Value:** an area and period view with distinct forecast, satellite observation and historical rainfall; the user can record a verification and disposition.

**MVP:** one district, a small set of precomputed area polygons, a weather forecast, recent Sentinel-2 cloud-masked vegetation summary and a clearly dated CHIRPS historical comparison; simple explanation and source panel; save a field-check note. If provider credentials or data are unavailable, use a labelled static example and show the data as unavailable. No risk score until thresholds are co-designed and evaluated.

**Not:** a flood prediction system, official warning, causal diagnosis of drought or disease, or a substitute for Meteo Rwanda. NDVI is a vegetation proxy and depends on crop season, land cover, cloud and pixel scale. A low value alone cannot establish a hazard or crop loss.

**Acceptance:** a user sees source, observation window, last refresh, spatial scale and missing data; can compare time windows without confusing forecast and observations; records a field check; and can trace a statement to data. Test against historical periods and actual field reports with local experts; document false alarms, misses, latency, usability and the denominator of all metrics.

