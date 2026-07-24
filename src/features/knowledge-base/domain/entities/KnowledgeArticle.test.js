import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KnowledgeArticle } from './KnowledgeArticle.js';
import { ArticleBlock, ARTICLE_BLOCK_TYPES } from '../value-objects/ArticleBlock.js';
import { ArticleService } from '../services/ArticleService.js';

const validArticle = (overrides = {}) =>
  new KnowledgeArticle({
    categoryType: 'guides',
    title: 'Antragstellung Krankenversicherung',
    summary: 'Schritt für Schritt durch den Antrag.',
    blocks: [{ type: 'text', text: 'Erst prüfen, dann einreichen.' }],
    ...overrides,
  });

test('article round-trips through JSON', () => {
  const article = validArticle({
    blocks: [
      { type: 'text', text: 'Absatz eins.' },
      { type: 'image', url: 'https://example.com/bild.png', caption: 'Formular' },
    ],
    tags: ['kv', 'antrag'],
    pinned: true,
  });

  const restored = KnowledgeArticle.fromJSON(article.toJSON());

  assert.deepEqual(restored.toJSON(), article.toJSON());
  assert.equal(restored.blocks.length, 2);
  assert.equal(restored.blocks[1].type, ARTICLE_BLOCK_TYPES.IMAGE);
});

test('article refuses a missing category type but accepts unknown ones', () => {
  assert.throws(() => validArticle({ categoryType: '  ' }), /non-empty string/);
  // Topics are admin-managed; an id no longer in the catalog must still load.
  assert.equal(validArticle({ categoryType: 'removed-topic' }).categoryType, 'removed-topic');
});

test('article requires at least one block', () => {
  assert.throws(() => validArticle({ blocks: [] }), /at least one content block/);
});

test('image block refuses non-http URLs', () => {
  assert.throws(
    () => new ArticleBlock({ type: ARTICLE_BLOCK_TYPES.IMAGE, url: 'javascript:alert(1)' }),
    /valid http\(s\) URL/
  );
  assert.throws(
    () => new ArticleBlock({ type: ARTICLE_BLOCK_TYPES.IMAGE, url: 'data:image/png;base64,x' }),
    /valid http\(s\) URL/
  );
});

test('withUpdates keeps id and createdAt, touches updatedAt', () => {
  const article = validArticle();
  const updated = article.withUpdates({ title: 'Neuer Titel' });

  assert.equal(updated.id, article.id);
  assert.equal(updated.createdAt, article.createdAt);
  assert.equal(updated.title, 'Neuer Titel');
  assert.ok(updated.updatedAt >= article.updatedAt);
});

test('reading time is at least one minute', () => {
  assert.equal(validArticle().readingMinutes, 1);
});

test('search matches title, tags and block text case-insensitively', () => {
  const articles = [
    validArticle({ title: 'BU-Leitfaden' }),
    validArticle({ title: 'Stornoprozess', tags: ['intern'] }),
    validArticle({
      title: 'Sonstiges',
      blocks: [{ type: 'text', text: 'Hier geht es um Maklervollmacht.' }],
    }),
  ];

  assert.equal(ArticleService.search(articles, 'bu-leit').length, 1);
  assert.equal(ArticleService.search(articles, 'INTERN').length, 1);
  assert.equal(ArticleService.search(articles, 'maklervollmacht').length, 1);
  assert.equal(ArticleService.search(articles, '').length, 3);
});

test('search reaches the text of every block type, not just paragraphs', () => {
  const articles = [
    validArticle({
      title: 'Sonstiges',
      blocks: [
        { type: 'heading', text: 'Widerrufsbelehrung' },
        { type: 'list', items: ['Vollmacht prüfen', 'Antrag scannen'] },
        { type: 'callout', tone: 'warning', text: 'Fristen beachten.' },
      ],
    }),
  ];

  assert.equal(ArticleService.search(articles, 'widerruf').length, 1);
  assert.equal(ArticleService.search(articles, 'scannen').length, 1);
  assert.equal(ArticleService.search(articles, 'fristen').length, 1);
});
