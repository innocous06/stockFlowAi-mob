# StockFlow AI Mobile 

> **Resilient Field Logistics, Offline-First Telemetry & Tactical Navigation**  
> Tailored for contested, air-gapped, and low-connectivity transit corridors.

---

##  Overview

**StockFlow AI Mobile** is the mobile-optimized, field-grade counterpart to the StockFlow AI supply chain web platform. Engineered for frontline convoy drivers, logistics operators, and humanitarian distribution teams operating in challenging environments (such as mountainous corridors and disrupted network areas).

### Core Capabilities

- **Resilient Offline-First Architecture**:
  - Local IndexedDB storage for offline field incident drafts, tile caches, and breadcrumb telemetry.
  - Conflict resolution protocol (HTTP 409) with side-by-side visual diffing and auto-merge.
  - Adaptive radio mode transceiver (Auto, Live RTK, High-Latency Mesh, and Airgap Protocol).
- **Tactical Navigation & Sub-meter Geo-Inspection**:
  - Offline-first road network routing with step-by-step guidance.
  - Interactive topographic and satellite mapping layers (Google Hybrid, Google Topo, OpenTopo Contours, Tactical Night HUD).
  - Micro-nudge coordinate precision adjustments (1m / 5m / 25m increments) with MGRS grid conversion.
  - Turn-by-Turn Active Driving Cockpit with live speed, arrival ETA, and distance countdowns.
- **Field Hazard & Incident Telemetry**:
  - Rapid one-tap hazard beacons (Landslide, Roadblock, Bridge Damage, Flash Flood).
  - Client-side image compression (<25KB) for instant offline outbox queueing.
  - Real-time Supabase broadcast sync with deduplication and idempotency keys.
- **Emergency SOS Transponder**:
  - 2-second hold-to-transmit safety interlock to prevent false triggers during rough transit.
  - Anti-retrigger lock window and immediate burst packet transmission.
  - Condition priority flags (Medical, Vehicle Breakdown, Route Threat).

---

##  Design System: StockFlow Dual Aesthetic

StockFlow AI Mobile adheres to an enterprise, non-AI aesthetic with human-crafted clarity:

- **Light Mode (Default Base)**:
  - Canvas: #F7F5F0 (Warm Cream)
  - Cards & Surfaces: #FFFFFF with hairline borders (#E2DDD5)
  - Typography: High-contrast charcoal (#1C1B1A) with muted slate secondary (#7A7568)
  - Accent: Brand Copper (#B8703D) and warm sand (#E4BC8C)
- **Dark Mode (Night Vision HUD)**:
  - Canvas: #0A0A0C (Pitch Black)
  - Cards & Surfaces: #14161C with crisp borders (#232733)
  - Typography: Pure warm white (#F7F5F0)
- **Form Factors**:
  - Pill-shaped tactile controls (border-radius: 9999px) or crisp 4px corners.
  - Zero neon glows or AI squircle cliches.
  - 100% WCAG AAA/AA compliant color contrast in both modes.

---

##  Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons, CSS Design Tokens
- **Mapping**: Leaflet, OpenStreetMap, Google Hybrid Tile Providers
- **Animation**: Motion (Framer Motion v12)
- **Local Storage**: IndexedDB (idb), LocalStorage
- **Backend & Sync**: Supabase Realtime & Postgres Broadcast

---

##  Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone repository
git clone https://github.com/innocous06/stockFlowAi-mob.git
cd stockFlowAi-mob

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📄 License

Proprietary — StockFlow AI Field Logistics. All rights reserved.
