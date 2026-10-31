# Research and competition context

Research date: 27 October 2026. The workspace began empty; the products and names are hypotheses, not pre-existing validated ventures.

## Code for Impact Rwanda 2026

The [official competition site](https://www.codeforimpact.rw/) describes eight focus areas including Agriculture and Technology & AI, youth-led impact, and inclusion of women, people with disabilities, refugees and rural youth. Climate is not listed as a standalone track; position Ijuru Signal as an intersection of agriculture and technology/AI, and verify its fit with organizers. The [official timeline](https://www.codeforimpact.rw/about) lists applications 1–31 October 2026, top-50 pitch day 20 November (3 minutes plus 2 Q&A), top-20 pitch day 14 December (7 plus 3), and finale 18 December (15 plus 5). The shortlist evaluates clarity, originality, feasibility and impact, and requests a deck of at most 10 slides. Verify eligibility and terms for each team and whether two submissions are allowed before applying. These are organizer claims and plans, not evidence that our products qualify or will win.

Do not confuse this competition with the separate NISR Big Data Hackathon; its rules and deadlines are different. NISR data are useful evidence regardless.

## The problem and existing landscape

[NISR's 2025 Seasonal Agricultural Survey](https://www.alpha.statistics.gov.rw/data-sources/surveys/Seasonal-Agricultural-Survey/Seasonal-Agricultural-Survey/seasonal-agricultural-survey-2025) reports 1.423 million hectares used for agriculture in season B, approximately 60% of national land; these are aggregate survey estimates, not evidence of the size of our addressable market. The [Rwanda Green Fund](https://www.greenfund.rw/ireme-invest) identifies erratic rainfall and soil degradation among challenges to smallholders. These sources establish relevance, not proof of our specific users' unmet needs.

Rwanda already has services: [MINAGRI's annual report](https://www.minagri.gov.rw/fileadmin/user_upload/Minagri/Publications/Annual_Reports/MINAGRI_Annual_Report_2022-23FY_Final.pdf) describes satellite crop monitoring, an agricultural call center, a weather/crop calendar and Smart Nkunganire; [BK Techouse](https://www.bktechouse.rw/bk_techouse_products_profiles.pdf) describes Smart Nkunganire's input-supply and subsidy role. [Meteo Rwanda](https://www.meteorwanda.gov.rw/publications-1/news/news-detail?cHash=7e7904cef04ef17f7f4c3057981be5f9&tx_news_pi1%5Baction%5D=detail&tx_news_pi1%5Bcontroller%5D=News&tx_news_pi1%5Bnews%5D=82767) already publishes forecasts and recommends complementary forecasts and warnings. We have not tested these systems or established a comparative performance advantage.

Further, [FAO describes Smart Hinga](https://www.fao.org/science-technology-and-innovation/science-innovation-forum-2025/programme-sif-2025/agrifood-pitch-battle-%28cont-d%29/en), a Rwanda-based digital platform providing weather, soil and market insights, and [FAO reports Hinga Transit-AI](https://www.fao.org/in-action/global-network-digital-agriculture-innovation-hubs/highlights/highlights-detail/reboot-the-earth-2025-ignites-youth-innovation-in-kigali-to-combat-the-climate-crisis/en), a crop-transport concept. These are relevant to both differentiation and name clearance; neither their claims nor ours have been independently verified here.

Our testable opportunity is the connective workflow: a farmer's question and photo plus sourced local guidance and an extension handoff; or a shared climate evidence record linking observations, forecast, uncertainty and field verification. Validate that this fills a real gap with 10–15 interviews across farmers, extension workers and district practitioners before asserting differentiation.

## Data source register

| Source | Proposed use and acquisition | Limitations / access |
|---|---|---|
| [Copernicus Data Space Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html) | Register for Sentinel Hub credentials, use Catalog to find scenes and Process API for red B04, near-infrared B08 and scene classification/cloud masks over an area. | Cloud cover and mixed pixels are serious limits for small fields. Quotas and current terms must be verified. |
| [Open-Meteo forecast](https://open-meteo.com/en/docs) | Server-side forecast request for consented coordinates; persist issue/fetch time and attribution. | Model forecasts, not official alerts; free API use is non-commercial, check [pricing](https://open-meteo.com/en/pricing) for commercial use. Data attribution is required. |
| [CHIRPS rainfall](https://chc.ucsb.edu/data/chirps/) | Download historical gridded rainfall for a district and compute comparable seasonal anomalies offline or in a scheduled worker. | Historical estimates, not a real-time warning; check resolution, update lag, license and version. |
| [NISR SAS 2025](https://www.statistics.gov.rw/sites/default/files/documents/2025-12/SAS%202025%20summary%20in%20English.pdf) | National and district context for the case and pilot selection; download published tables or request microdata where needed. | Survey estimates are not individual farm measurements; check access and reuse terms. |
| [Meteo Rwanda](https://www.meteorwanda.gov.rw/) | Link to official bulletins and warnings; seek permission and a documented integration agreement before automated ingestion. | No public API or reuse permission assumed. |
| [Rwanda climate-smart extension manual](https://nozubu.minagri.gov.rw/fileadmin/user_upload/Climate_Smart_Agriculture_in_Extension_and_Advisory_Services_-_Manual.pdf) | Candidate source for a reviewed, versioned knowledge base. | Confirm permission and have Rwandan agronomists curate applicability before use. |

## Research still needed

Interview target users; establish language, connectivity and disability needs; compare existing advisory services firsthand; request source and practitioner permissions; verify prices, provider terms, representative data quality and crop-specific recommendations; establish a real baseline before claiming impact.

## Additional technical and user research

[Copernicus documents](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html) Sentinel-2 L2A B04 and B08 at 10 m and the scene classification band used for cloud and shadow screening. That is pixel spacing, not proof that individual small plots can be monitored accurately. [Copernicus examples](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Examples.html) illustrate cloud masking and NDVI, but the project's area coverage threshold and aggregation need expert validation. [Meteo Rwanda publishes agricultural climate services](https://www.meteorwanda.gov.rw/services/climate-services-for-agriculture) and [ten-day forecasts](https://www.meteorwanda.gov.rw/products/ten-day-forecast); verify user workflows and permission before proposing automated reuse. The [Open-Meteo terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing) distinguish the non-commercial free API from commercial service. Compare the proposed workflow with existing products through field interviews rather than assuming that data integration is new.
