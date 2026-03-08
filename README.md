# Wildfire Tactics

Wildfire Tactics is an interactive wildfire evacuation simulation built for exploring how fire spread, road constraints, guide coordination, and resident behavior affect emergency outcomes in a dynamic scenario.

Instead of treating evacuation as a static shortest-path problem, the project models a changing environment:

- fire cells grow, spread, and burn out over time
- residents react with delay, panic, reroute, and either reach safety or die
- guides periodically choose safe points and influence nearby residents
- roadblocks affect both evacuation routing and fire propagation

## Highlights

- Dynamic fire spread with intensity, age, burnout, spacing, and wind-aware directionality
- Road-constrained resident movement using shared flow-field routing
- AI-assisted guide agents with live decision logs
- Interactive placement of fire, residents, guides, and roadblocks
- Pause/resume simulation controls for inspection and demo playback
- Map-based visualization powered by Deck.gl and Mapbox

## How It Works

### Fire Model

Each fire cell stores:

- geographic position
- intensity
- age
- size

Fire behavior evolves in three phases:

1. Growth: cells can intensify over time.
2. Spread: mature cells attempt to ignite neighboring cells.
3. Burnout: older cells decay and eventually disappear.

Spread probability depends on both fire intensity and directional alignment with wind. Roadblocks also reduce the chance that fire crosses certain segments, so user interventions affect more than just pathfinding.

### Resident Logic

Residents are not free-moving markers. Each resident has:

- reaction delay
- movement speed
- current road node
- target safe point
- optional guide-follow state
- panic state
- path history

Residents remain idle until they detect nearby fire or a nearby guide. Once activated, they move along the road graph rather than cutting directly across the map. If fire gets too close, they panic, temporarily move faster, and may stop following a guide. Residents eventually transition to either `safe` or `dead`.

### Guide Logic

Guides act as coordination agents rather than simple evacuees.

- They receive AI decisions on a fixed cadence.
- They choose a target safe point.
- They influence nearby residents within a guide radius.
- They can be clicked, tracked, and removed from the map.

Each guide can be inspected through a draggable live log panel that shows recent AI decisions and the selected evacuation target.

### Routing

The evacuation system uses shared flow fields rather than running a full path search independently for every resident on every tick. This is more efficient for crowd-style movement toward a small number of safe points.

Routing is also threat-aware:

- fire adds path cost
- severe fire can make areas effectively impassable
- blocked road segments are excluded from routing

This creates a simulation where fire, roads, guides, and residents continuously influence one another.

## Tech Stack

- React
- TypeScript
- Vite
- Mapbox GL JS
- Deck.gl
- Lucide React
- Backboard API for guide decision-making and report generation

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` with values like:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token
BACKBOARD_API_KEY=your_backboard_api_key
BACKBOARD_BASE_URL=https://app.backboard.io/api
```

Notes:

- `VITE_MAPBOX_TOKEN` is exposed to the browser, which is expected for the Mapbox client token.
- `BACKBOARD_API_KEY` is intentionally not prefixed with `VITE_`, so it stays on the Vite proxy side instead of being injected into frontend bundles.

### 3. Start the app

```bash
npm run dev
```

Then open:

- [http://127.0.0.1:4173/](http://127.0.0.1:4173/) if running on that port
- or the local URL printed by Vite

## Backboard Proxy Setup

Guide AI and report generation call Backboard through a local Vite proxy instead of direct browser requests.

The frontend sends requests to:

```text
/api/backboard
```

Vite then forwards those requests to the configured Backboard base URL and injects the `X-API-Key` header on the proxy side.

This solves two problems for local demo use:

- avoids browser CORS failures when calling Backboard
- avoids exposing the Backboard API key directly in frontend code

Important limitation:

- This proxy works in local `vite dev` and local `vite preview`.
- It is not a production backend. A real deployed app would still need a proper server-side proxy or API route.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Demo Flow

For a short demo, the cleanest sequence is:

1. Start from the empty map.
2. Place one or two fire sources.
3. Place residents near and far from the threat.
4. Place one or more guides.
5. Start the simulation.
6. Show fire expansion and resident evacuation.
7. Click a guide to open tracking.
8. Show the live decision log.
9. Pause/resume the simulation.
10. Show final safe/dead outcomes.

## Current Scope

This project is a tactical simulation and visualization prototype. It is designed to demonstrate dynamic interactions between:

- wildfire spread
- evacuation routing
- guide intervention
- user-driven scenario editing

It is not intended to be a scientifically validated wildfire forecasting tool or a complete emergency management platform.

## Next Steps

Potential future extensions include:

- path visualization overlays for agents
- congestion and crowd-capacity modeling
- terrain and weather integration
- automated map ingestion from GIS or OpenStreetMap data
- richer post-simulation analytics
- more advanced guide behaviors beyond safe-point selection
