# Validation, delivery and operations

## Discovery and co-design

Interview 5–8 district, cooperative and extension practitioners and 2–3 remote-sensing or meteorology specialists as an initial, nonrepresentative discovery sample. Ask them to walk through a recent decision, which official products they use, what evidence is missing and who can act on it. Identify a real pilot area and permission to use its boundary. Establish the decision the system would support before deciding what data to display. Success requires a named operational partner, an agreed field-check workflow and access rights, none of which is confirmed.

## Delivery slices

| Slice | Deliverable | Exit gate |
|---|---|---|
| 0 | Define use case, area boundary, source rights and baseline. | Expert and practitioner agree the decision, scale and use limitations. |
| 1 | Area list and manual field notes with access control. | Phone usability and role isolation pass with labelled fixtures. |
| 2 | One real forecast adapter with timestamp, cache and attribution. | Stale and unavailable states verified; provider terms and costs checked. |
| 3 | Reproducible Sentinel-2 and CHIRPS processing for a fixed historical window. | Scene, mask, coverage, baseline and provenance inspected by a domain specialist. |
| 4 | Retrospective comparison and small pilot. | Field checks and reference data available; communicate false positives, missed cases and missing observations. |

## Evaluation plan

Before computing any risk flag, agree an outcome and a reference standard: e.g., documented expert field observations for preselected areas and dates. Separate historical development and held-out periods to avoid leakage. Define missing data rules, denominator, baseline comparator and coverage. Report valid observation coverage, time since source acquisition, field-check completion and median time from evidence to verification. If a decision rule is proposed, report confusion matrix, sensitivity and false-positive rate with sample sizes and uncertainty; stratify by season, land cover and area where data permit. Do not interpret absence of a field report as proof of no event. Experts must define stop thresholds before use; no official alerts or automated dispatch.

Test cloud-heavy periods, upstream outages, stale forecasts, invalid geometry, insufficient pixels, source revisions, conflicting local reports, unauthorized access, map-free navigation and keyboard use. Clearly label when comparison is unavailable. Pilot users must be able to identify source, scale, timestamp, quality and the next human action without relying on color.

## Operations and costs

Assign a data operator, domain reviewer, field coordinator and support owner. Estimate fixed hosting, database and storage plus provider usage, data processing, egress and field verification, then measure actual usage before budgeting scale. Set provider spend caps, alert on stale sources and failed ingestion, and monitor queue age, valid-pixel fraction, forecast age, source revisions and field-check backlog. Maintain a provider outage runbook, a data correction path and tested backup restoration. Data rights, retention and sensitive location handling require local review.

## Prototype test script

Open `prototype/index.html` on a phone and desktop. Select the example location and then a real district; confirm real locations say data is unavailable. Review the hazard categories and source descriptions, follow the official source link and enter a fictional field note. Confirm the page says the note is not saved and data are examples. Check keyboard navigation, zoom and map-free reading. The prototype contains no live data or database.
