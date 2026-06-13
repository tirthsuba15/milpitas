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

export interface GridCell {
  x: number
  y: number
  elevation: number        // meters above sea level
  terrain: TerrainType
  traversalCost: number    // A* weight; 1.0 = normal, 10 = impassable
  fireIntensity: number    // 0–1
  floodDepth: number       // meters
  fuelLoad: number         // 0–1; burns down as fire spreads
  isRevealed: boolean      // fog of war
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

  // 50×50 grid; access as grid[y][x]
  grid: GridCell[][]
  gridWidth: number
  gridHeight: number
  cellSizeM: number   // meters per cell = 5

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
