// ─── Primitives ──────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number }

// ─── Robot fleet ─────────────────────────────────────────────────────────────

export type RobotType =
  | 'recon_drone'
  | 'rescue_unit'
  | 'medic'
  | 'sorting_robot'
  | 'hauler'
  | 'builder_robot'
  | 'restoration_unit'

export type RobotStatus = 'idle' | 'moving' | 'working' | 'blocked' | 'failed'

export interface Task {
  id: string
  type: 'rescue' | 'recon' | 'sort_debris' | 'haul_material' | 'build_module' | 'restore_land'
  targetEntityId: string
  targetPosition: Vec3
  assignedBy: AgentType
  priority: number     // 0–100
  startedAt: number    // tick
}

export interface RobotEntity {
  kind: 'robot'
  id: string
  type: RobotType
  position: Vec3
  status: RobotStatus
  task: Task | null
  batteryLevel: number   // 0–1
  speed: number          // cells per second
  clearanceRadius: number
}

// ─── People ──────────────────────────────────────────────────────────────────

export type PersonStatus = 'undiscovered' | 'discovered' | 'rescued' | 'housed'
export type VulnerabilityLevel = 'low' | 'medium' | 'high'

export interface PersonEntity {
  kind: 'person'
  id: string
  subtype: 'survivor' | 'displaced_family'
  position: Vec3
  status: PersonStatus
  vulnerability: VulnerabilityLevel   // high = children / elderly / medical
  urgencyScore: number                // 0–100, increases over time near hazards
  discoveredAtTick: number | null
  rescuedAtTick: number | null
  housedAtTick: number | null
  membersCount: number                // family size
}

// ─── Debris ──────────────────────────────────────────────────────────────────

export type DebrisType = 'timber' | 'steel' | 'aggregate' | 'recycled_plastic' | 'contaminated'

export interface DebrisEntity {
  kind: 'debris'
  id: string
  position: Vec3
  debrisType: DebrisType
  massKg: number
  kgCo2eIfSalvaged: number   // carbon avoided vs landfill
  salvaged: boolean
}

export type Entity = RobotEntity | PersonEntity | DebrisEntity

// ─── Hazard grid ─────────────────────────────────────────────────────────────

export type TerrainType = 'clear' | 'rubble' | 'asphalt' | 'mud' | 'water'

// Land-use zone for a cell. Drives both pathfinding cost biasing and what the
// visual agent renders on top of a cell. Deterministic, set once at world build.
//   nature       — open green space / fields / parks (default surround)
//   road         — suburban street; cheap to traverse, never built on
//   sidewalk     — pedestrian strip flanking roads
//   yard         — residential lot greenery around a house footprint
//   house_lot    — a cell occupied by a house footprint (impassable)
//   civic        — small civic/community block footprint (impassable)
//   disaster_core— the central worn relief/work zone (the original demo region)
export type ZoneType =
  | 'nature'
  | 'road'
  | 'sidewalk'
  | 'yard'
  | 'house_lot'
  | 'civic'
  | 'disaster_core'

export interface GridCell {
  x: number
  y: number
  elevation: number        // meters above sea level
  terrain: TerrainType
  zone: ZoneType           // land-use classification (deterministic, seeded)
  traversalCost: number    // A* weight; 1.0 = normal, 10 = impassable
  fireIntensity: number    // 0–1
  floodDepth: number       // meters
  fuelLoad: number         // 0–1; burns down as fire spreads
  isRevealed: boolean      // fog of war
}

// ─── Suburban layout (seeded, deterministic) ───────────────────────────────────
// A placed structure the visual agent maps to a model. Positions are in GRID
// cells (gridX, gridZ) — convert to world with *cellSizeM. rotationDeg is the
// yaw the model should face (0 = +Z). All produced by a seeded generator so
// every render is identical.
export type StructureType =
  | 'house_small'
  | 'house_medium'
  | 'house_large'
  | 'civic_block'

export interface PlacedStructure {
  id: string
  type: StructureType
  gridX: number        // cell column (footprint origin / center)
  gridZ: number        // cell row
  rotationDeg: number  // yaw in degrees, 0 = facing +Z
  footprintCells: number   // square footprint side in cells (e.g. 2 = 2×2)
}

export interface SuburbLayout {
  seed: number
  structures: PlacedStructure[]
  // World-space bounds of the central disaster/work zone (a sub-region, not a
  // separate world). The renderer uses this to blend the worn ground patch.
  disasterCore: { minX: number; minZ: number; maxX: number; maxZ: number }
}

// ─── Build sites ─────────────────────────────────────────────────────────────

export type BuildSiteStatus = 'planned' | 'active' | 'complete'
export type MaterialChoice = 'imported_timber' | 'salvaged_timber' | 'recycled_panels'

export interface BuildSite {
  id: string
  position: Vec3
  modulesRequired: number
  modulesComplete: number
  status: BuildSiteStatus
  assignedFamilyId: string | null
  materialChoice: MaterialChoice
  kgCo2eSpent: number
  // Optional urban-layout metadata (Phase B). Absent = renders as a default 8×8 axis-aligned lot.
  footprint?: { width: number; depth: number; rotationY: number }
  zoneType?: string
}

// ─── Ledgers ─────────────────────────────────────────────────────────────────

export interface MaterialInventory {
  importedTimber: number      // kg
  importedPanels: number      // kg
  salvagedTimber: number      // kg
  salvagedSteel: number       // kg
  salvagedAggregate: number   // kg
  recycledPanels: number      // kg
}

export interface EnergyBudget {
  totalKwh: number
  usedKwh: number
  solarGeneratedKwh: number
}

export interface CarbonLedger {
  avoidedKgCo2e: number    // vs conventional build
  spentKgCo2e: number
  baselineKgCo2e: number   // what a conventional rebuild would cost = 45,000
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface MissionScore {
  familiesHoused: number
  familiesTotal: number
  vulnerableHousedPct: number   // % of high-vulnerability families housed first
  peopleRescued: number
  peopleTotal: number
  wasteDivertedKg: number
}

// ─── Comms ───────────────────────────────────────────────────────────────────

export type AgentType = 'commander' | 'rescue' | 'salvage' | 'rebuild' | 'logistics'

export interface CommsEntry {
  tick: number
  agent: AgentType
  message: string
  actionTag?: string   // e.g. "REROUTE", "MATERIAL_SWITCH"
}

// ─── World state (the blackboard) ────────────────────────────────────────────

export interface WorldState {
  tick: number
  elapsedSeconds: number
  phase: 'deploying' | 'active' | 'recovery' | 'complete'

  entities: Entity[]

  // 100×100 grid @ 5 m/cell = 500 m square; access as grid[y][x].
  // cell (x,y) ↔ world (x*cellSizeM, z=y*cellSizeM) on the XZ plane.
  // Dimensions are sourced from src/simulation/grid.ts (single source of truth).
  grid: GridCell[][]
  gridWidth: number
  gridHeight: number
  cellSizeM: number   // meters per cell = 5

  // Seeded suburban layout the renderer maps to models and the sim respects.
  suburb: SuburbLayout

  buildSites: BuildSite[]
  inventory: MaterialInventory
  energy: EnergyBudget
  carbon: CarbonLedger
  score: MissionScore
  commsLog: CommsEntry[]

  // set by Integration lead's chaos controls
  activeEvents: string[]
  windDirection: { dx: number; dy: number }
}
