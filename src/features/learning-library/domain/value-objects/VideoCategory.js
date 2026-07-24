/**
 * Catalog: VideoCategory
 * The learning library's topic catalog, admin-managed as shared Topic
 * documents. Same snapshot pattern as ArticleCategory: the screen adopts the
 * persisted topics at mount, defaults apply until the first admin save.
 */

const DEFAULTS = Object.freeze([
  Object.freeze({ id: 'onboarding', label: 'Onboarding', icon: 'userCheck', tint: 'blue' }),
  Object.freeze({ id: 'sales', label: 'Vertrieb', icon: 'trendingUp', tint: 'teal' }),
  Object.freeze({ id: 'product', label: 'Produktwissen', icon: 'layers', tint: 'purple' }),
  Object.freeze({ id: 'compliance', label: 'Compliance', icon: 'lock', tint: 'gold' }),
  Object.freeze({ id: 'softskills', label: 'Kommunikation', icon: 'users', tint: 'green' }),
]);

export const DEFAULT_VIDEO_TOPICS = DEFAULTS;

const toView = (topic) =>
  Object.freeze({ type: topic.id, label: topic.label, icon: topic.icon, tint: topic.tint });

let catalog = DEFAULTS.map(toView);

/** Replaces the active catalog with the given Topic list (or topic-shaped objects). */
export function adoptVideoTopics(topics) {
  if (Array.isArray(topics) && topics.length > 0) {
    catalog = topics.map(toView);
  }
}

export function getAllVideoCategories() {
  return catalog;
}

export function getVideoCategory(type) {
  return catalog.find((category) => category.type === type) || null;
}
