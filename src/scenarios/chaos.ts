import type { World } from '@/simulation/World'
import type { PersonEntity } from '@/types'

// Called by bus.on('chaos:new_families') in App.tsx
export function addNewFamilies(world: World): void {
  const newFamilies: PersonEntity[] = [
    { kind: 'person', id: `fam-surge-${Date.now()}-1`, subtype: 'displaced_family', position: { x: 35,  y: 0, z: 25  }, status: 'discovered', vulnerability: 'high',   urgencyScore: 60, discoveredAtTick: world.state.tick, rescuedAtTick: null, housedAtTick: null, membersCount: 5 },
    { kind: 'person', id: `fam-surge-${Date.now()}-2`, subtype: 'displaced_family', position: { x: 55,  y: 0, z: 20  }, status: 'discovered', vulnerability: 'high',   urgencyScore: 55, discoveredAtTick: world.state.tick, rescuedAtTick: null, housedAtTick: null, membersCount: 4 },
    { kind: 'person', id: `fam-surge-${Date.now()}-3`, subtype: 'displaced_family', position: { x: 75,  y: 0, z: 30  }, status: 'discovered', vulnerability: 'medium', urgencyScore: 40, discoveredAtTick: world.state.tick, rescuedAtTick: null, housedAtTick: null, membersCount: 3 },
    { kind: 'person', id: `fam-surge-${Date.now()}-4`, subtype: 'displaced_family', position: { x: 100, y: 0, z: 15  }, status: 'discovered', vulnerability: 'high',   urgencyScore: 50, discoveredAtTick: world.state.tick, rescuedAtTick: null, housedAtTick: null, membersCount: 6 },
  ]

  world.state = {
    ...world.state,
    entities: [...world.state.entities, ...newFamilies],
    score: {
      ...world.state.score,
      familiesTotal: world.state.score.familiesTotal + newFamilies.length,
    },
  }

  // Immediately add build sites for the surge
  world.state = {
    ...world.state,
    buildSites: [
      ...world.state.buildSites,
      { id: `site-surge-1`, position: { x: 50,  y: 0, z: 55 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'recycled_panels', kgCo2eSpent: 0 },
      { id: `site-surge-2`, position: { x: 70,  y: 0, z: 55 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'recycled_panels', kgCo2eSpent: 0 },
    ],
  }
}
