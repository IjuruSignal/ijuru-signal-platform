# Design foundation

## Shared principles
Landing pages persuade; the eventual application screens help people operate. Keep the main task obvious, use plain language, meaningful focus states, semantic HTML, accessible contrast, 44px targets, responsive layouts and reduced-motion support. No real outcome, partner, data or certification may be represented by illustrative UI. Add Kinyarwanda with locally reviewed translations; do not suggest that it is available before it is. Test with farmers, extension workers and accessibility users on low-end phones and low bandwidth.

## Ijuru Signal
A geographic evidence publication: deep ink `#132e36`, teal `#195c70`, pale paper `#f3f4ee`, signal yellow `#e3ed8c`; DM Serif Display and Manrope. Its eventual application prioritizes location, date, source and data quality. Show a simple readable summary before optional layers, visible legends and timestamps, keyboard-accessible alternatives to maps, and warnings about cloud, scale and missing data. Forecasts, observations and local reports must be distinct.


## Components
Source-owned shadcn-style components live in `components/ui`. Each project controls its own styles and dependencies.

## Mobile application direction
Treat the first screen as a short evidence briefing: selected area, explicit illustrative/live status, then forecast, observation, history and field note in that order. Use deep ink for the frame, teal for the action area and pale paper for legibility. Information type and timestamps must be written in words, not communicated by color. On a phone, stack evidence and field note; on wider screens, give the note a separate rail. A map may supplement the list but must never be the only path. Design no coverage, stale forecast, source failure, conflicting field report, unauthorized edit and unavailable official bulletin as first-class states. The standalone HTML is a concept, not a live dashboard.
