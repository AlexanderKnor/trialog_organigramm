/**
 * Value Object: ResourceKind
 * The fixed shelves of the promotion area. Frozen catalog for the same reason
 * as the other portal categories: cards, icons and tints are designed around
 * exactly these.
 */

export const RESOURCE_KIND_TYPES = Object.freeze({
  SOCIAL: 'social',
  SALES: 'sales',
  EMAIL: 'email',
  EVENT: 'event',
});

const KINDS = Object.freeze([
  Object.freeze({
    type: RESOURCE_KIND_TYPES.SOCIAL,
    label: 'Social Media',
    description: 'Posts, Stories und Grafiken für LinkedIn, Instagram und Facebook',
    icon: 'share',
    tint: 'blue',
  }),
  Object.freeze({
    type: RESOURCE_KIND_TYPES.SALES,
    label: 'Sales-Materialien',
    description: 'Produktflyer, Präsentationen und Angebotsvorlagen für Kundentermine',
    icon: 'briefcase',
    tint: 'gold',
  }),
  Object.freeze({
    type: RESOURCE_KIND_TYPES.EMAIL,
    label: 'E-Mail-Vorlagen',
    description: 'Personalisierbare Vorlagen für Erstansprache, Follow-up und Abschluss',
    icon: 'mail',
    tint: 'green',
  }),
  Object.freeze({
    type: RESOURCE_KIND_TYPES.EVENT,
    label: 'Aktionen & Events',
    description: 'Veranstaltungen, Messeauftritte und interne Team-Events',
    icon: 'calendar',
    tint: 'purple',
  }),
]);

export function getAllResourceKinds() {
  return KINDS;
}

export function getResourceKind(type) {
  return KINDS.find((kind) => kind.type === type) || null;
}

export function isResourceKindType(type) {
  return KINDS.some((kind) => kind.type === type);
}
