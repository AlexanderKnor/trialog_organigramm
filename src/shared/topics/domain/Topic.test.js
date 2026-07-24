import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Topic, TOPIC_ICONS, TOPIC_TINTS, MAX_TOPIC_LABEL_LENGTH } from './Topic.js';
import { TopicCatalogService, MAX_TOPICS } from './TopicCatalogService.js';
import { ITopicRepository } from './ITopicRepository.js';

const validTopic = (overrides = {}) =>
  new Topic({ label: 'Onboarding', icon: 'userCheck', tint: 'blue', order: 0, ...overrides });

class InMemoryTopicRepository extends ITopicRepository {
  topics = [];
  removedIds = [];

  async findAll() {
    return [...this.topics].sort((a, b) => a.order - b.order);
  }

  async replaceAll(topics, removedIds) {
    this.topics = [...topics];
    this.removedIds = removedIds;
  }
}

const DEFAULTS = [
  { id: 'guides', label: 'Leitfäden', icon: 'fileText', tint: 'blue' },
  { id: 'faq', label: 'FAQ', icon: 'info', tint: 'purple' },
];

test('topic round-trips through JSON and keeps its id', () => {
  const topic = validTopic({ id: 'onboarding' });
  const restored = Topic.fromJSON(topic.toJSON());

  assert.deepEqual(restored.toJSON(), topic.toJSON());
  assert.equal(restored.id, 'onboarding');
});

test('topic generates an id when none is given', () => {
  const topic = validTopic();
  assert.ok(topic.id.length > 0);
});

test('topic refuses empty and over-long labels', () => {
  assert.throws(() => validTopic({ label: '   ' }), /non-empty/);
  assert.throws(() => validTopic({ label: 'x'.repeat(MAX_TOPIC_LABEL_LENGTH + 1) }), /exceed/);
});

test('topic refuses icons and tints outside the curated sets', () => {
  assert.throws(() => validTopic({ icon: 'dragon' }), /Unknown topic icon/);
  assert.throws(() => validTopic({ tint: 'crimson' }), /Unknown topic tint/);
  assert.ok(TOPIC_ICONS.includes('fileText'));
  assert.ok(TOPIC_TINTS.includes('slate'));
});

test('catalog falls back to defaults while nothing is persisted', async () => {
  const service = new TopicCatalogService(new InMemoryTopicRepository(), { defaults: DEFAULTS });
  const catalog = await service.getCatalog();

  assert.deepEqual(
    catalog.map((topic) => topic.id),
    ['guides', 'faq']
  );
});

test('catalog degrades to defaults when reading fails', async () => {
  class BrokenRepository extends InMemoryTopicRepository {
    async findAll() {
      throw new Error('permission-denied');
    }
  }

  const service = new TopicCatalogService(new BrokenRepository(), { defaults: DEFAULTS });
  const catalog = await service.getCatalog();

  assert.equal(catalog.length, DEFAULTS.length);
});

test('saveCatalog persists drafts in order and generates ids for new topics', async () => {
  const repository = new InMemoryTopicRepository();
  const service = new TopicCatalogService(repository, { defaults: DEFAULTS });

  const saved = await service.saveCatalog([
    { id: 'faq', label: 'FAQ', icon: 'info', tint: 'purple' },
    { id: null, label: 'Vertrieb', icon: 'trendingUp', tint: 'teal' },
  ]);

  assert.equal(saved.length, 2);
  assert.deepEqual(
    saved.map((topic) => topic.order),
    [0, 1]
  );
  assert.ok(saved[1].id.length > 0);
  assert.equal(repository.topics.length, 2);
});

test('saveCatalog deletes persisted topics missing from the draft', async () => {
  const repository = new InMemoryTopicRepository();
  const service = new TopicCatalogService(repository, { defaults: DEFAULTS });

  await service.saveCatalog(DEFAULTS);
  await service.saveCatalog([DEFAULTS[0]]);

  assert.deepEqual(repository.removedIds, ['faq']);
  assert.equal(repository.topics.length, 1);
});

test('saveCatalog refuses empty, oversized and duplicate-label catalogs', async () => {
  const service = new TopicCatalogService(new InMemoryTopicRepository(), { defaults: DEFAULTS });

  await assert.rejects(() => service.saveCatalog([]), /at least one topic/);

  const many = Array.from({ length: MAX_TOPICS + 1 }, (_, i) => ({
    label: `Thema ${i}`,
    icon: 'tag',
    tint: 'blue',
  }));
  await assert.rejects(() => service.saveCatalog(many), /not exceed/);

  await assert.rejects(
    () =>
      service.saveCatalog([
        { label: 'FAQ', icon: 'info', tint: 'purple' },
        { label: ' faq ', icon: 'tag', tint: 'blue' },
      ]),
    /unique/
  );
});
