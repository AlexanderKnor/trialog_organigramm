/**
 * Catalog: ArticleCategory
 * The knowledge base's topic catalog, admin-managed as shared Topic documents.
 *
 * Consumers read categories synchronously all over the feature (cards, chips,
 * composer, reader), so the catalog is a module-level snapshot: the screen
 * loads the persisted topics once at mount and adopts them here before
 * anything renders. Until an admin has saved a catalog for the first time,
 * the built-in defaults below are active.
 */

const DEFAULTS = Object.freeze([
  Object.freeze({ id: 'guides', label: 'Leitfäden', icon: 'fileText', tint: 'blue' }),
  Object.freeze({ id: 'templates', label: 'Vorlagen', icon: 'copy', tint: 'gold' }),
  Object.freeze({ id: 'processes', label: 'Prozesse', icon: 'refresh', tint: 'green' }),
  Object.freeze({ id: 'faq', label: 'FAQ', icon: 'info', tint: 'purple' }),
  Object.freeze({ id: 'compliance', label: 'Compliance', icon: 'lock', tint: 'slate' }),
]);

export const DEFAULT_ARTICLE_TOPICS = DEFAULTS;

const toView = (topic) =>
  Object.freeze({ type: topic.id, label: topic.label, icon: topic.icon, tint: topic.tint });

let catalog = DEFAULTS.map(toView);

/** Replaces the active catalog with the given Topic list (or topic-shaped objects). */
export function adoptArticleTopics(topics) {
  if (Array.isArray(topics) && topics.length > 0) {
    catalog = topics.map(toView);
  }
}

export function getAllArticleCategories() {
  return catalog;
}

export function getArticleCategory(type) {
  return catalog.find((category) => category.type === type) || null;
}
