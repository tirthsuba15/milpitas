import type { WorldState, AllocateMaterialAction } from '@/types'

// Real-world embodied carbon coefficients (kgCO2e per kg of material)
const CARBON_COEFFICIENTS: Record<string, number> = {
  imported_timber:  12.0,
  imported_panels:  18.0,
  salvaged_timber:   0.2,   // only transport cost
  recycled_panels:   0.8,
  salvaged_steel:    1.2,
  salvaged_aggregate:0.1,
}

const KG_PER_MODULE = 800  // average kg of primary material per home module

export function updateCarbonLedger(state: WorldState, action: AllocateMaterialAction): WorldState {
  const site = state.buildSites.find(s => s.id === action.siteId)
  if (!site) return state

  const conventionalCostPerModule = CARBON_COEFFICIENTS['imported_timber'] * KG_PER_MODULE
  const actualCostPerModule = (CARBON_COEFFICIENTS[action.materialChoice] ?? 12) * KG_PER_MODULE
  const savedPerModule = conventionalCostPerModule - actualCostPerModule

  return {
    ...state,
    carbon: {
      ...state.carbon,
      avoidedKgCo2e: state.carbon.avoidedKgCo2e + Math.max(0, savedPerModule * site.modulesRequired),
      spentKgCo2e: state.carbon.spentKgCo2e + actualCostPerModule * site.modulesRequired,
    },
  }
}

export function deductMaterial(state: WorldState, materialChoice: string, modulesNeeded: number): WorldState {
  const kgNeeded = KG_PER_MODULE * modulesNeeded
  const inv = { ...state.inventory }

  switch (materialChoice) {
    case 'imported_timber':  inv.importedTimber  = Math.max(0, inv.importedTimber  - kgNeeded); break
    case 'imported_panels':  inv.importedPanels  = Math.max(0, inv.importedPanels  - kgNeeded); break
    case 'salvaged_timber':  inv.salvagedTimber  = Math.max(0, inv.salvagedTimber  - kgNeeded); break
    case 'recycled_panels':  inv.recycledPanels  = Math.max(0, inv.recycledPanels  - kgNeeded); break
  }

  return { ...state, inventory: inv }
}

export function addSalvage(state: WorldState, debrisType: string, massKg: number, kgCo2eIfSalvaged: number): WorldState {
  const inv = { ...state.inventory }
  switch (debrisType) {
    case 'timber':          inv.salvagedTimber    += massKg; break
    case 'steel':           inv.salvagedSteel     += massKg; break
    case 'aggregate':       inv.salvagedAggregate += massKg; break
    case 'recycled_plastic':inv.recycledPanels    += massKg * 0.4; break   // conversion ratio
  }
  return {
    ...state,
    inventory: inv,
    carbon: { ...state.carbon, avoidedKgCo2e: state.carbon.avoidedKgCo2e + kgCo2eIfSalvaged },
  }
}
