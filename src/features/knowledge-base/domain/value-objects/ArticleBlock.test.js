import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ArticleBlock, ARTICLE_BLOCK_TYPES, CALLOUT_TONES } from './ArticleBlock.js';

const build = (raw) => new ArticleBlock(raw);

test('every block type round-trips through JSON', () => {
  const blocks = [
    { type: ARTICLE_BLOCK_TYPES.TEXT, text: 'Absatz.' },
    { type: ARTICLE_BLOCK_TYPES.HEADING, text: 'Ablauf', level: 3 },
    { type: ARTICLE_BLOCK_TYPES.LIST, ordered: true, items: ['Eins', 'Zwei'] },
    {
      type: ARTICLE_BLOCK_TYPES.STEPS,
      items: [{ title: 'Antrag prüfen', text: 'Auf Vollständigkeit achten.' }],
    },
    { type: ARTICLE_BLOCK_TYPES.CALLOUT, tone: CALLOUT_TONES.WARNING, title: 'Frist', text: '14 Tage.' },
    { type: ARTICLE_BLOCK_TYPES.QUOTE, text: 'Klarheit vor Tempo.', attribution: 'Geschäftsführung' },
    { type: ARTICLE_BLOCK_TYPES.IMAGE, url: 'https://example.com/a.png', caption: 'Formular' },
    {
      type: ARTICLE_BLOCK_TYPES.VIDEO,
      url: 'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184',
      caption: '',
    },
    { type: ARTICLE_BLOCK_TYPES.LINK, url: 'https://example.com/f.pdf', label: 'Vorlage', description: '' },
    { type: ARTICLE_BLOCK_TYPES.DIVIDER },
  ];

  blocks.forEach((raw) => {
    assert.deepEqual(ArticleBlock.fromJSON(build(raw).toJSON()).toJSON(), build(raw).toJSON());
  });
});

test('unknown types and unknown tones are refused or defaulted', () => {
  assert.throws(() => build({ type: 'marquee', text: 'x' }), /Unknown article block type/);
  assert.equal(build({ type: 'callout', tone: 'party', text: 'x' }).data.tone, CALLOUT_TONES.INFO);
  assert.equal(build({ type: 'heading', text: 'x', level: 9 }).data.level, 2);
});

test('empty payloads are refused per type', () => {
  assert.throws(() => build({ type: 'text', text: '   ' }), /must not be empty/);
  assert.throws(() => build({ type: 'list', items: ['', '  '] }), /needs at least one entry/);
  assert.throws(() => build({ type: 'steps', items: [] }), /needs at least one entry/);
  assert.throws(() => build({ type: 'link', url: 'https://x.de', label: '' }), /must not be empty/);
});

test('URL-bearing blocks refuse anything that is not http(s)', () => {
  assert.throws(() => build({ type: 'image', url: 'javascript:alert(1)' }), /valid http\(s\) URL/);
  assert.throws(() => build({ type: 'link', url: 'data:text/html,x', label: 'X' }), /valid http\(s\) URL/);
  assert.throws(() => build({ type: 'video', url: 'https://dropbox.com/v.mp4' }), /nicht erkannt/);
});

test('video blocks expose the embed source of the pasted share link', () => {
  const block = build({
    type: ARTICLE_BLOCK_TYPES.VIDEO,
    url: 'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184?sid=abc',
  });

  assert.match(block.videoSource.embedUrl, /^https:\/\/www\.loom\.com\/embed\//);
  assert.equal(build({ type: 'text', text: 'x' }).videoSource, null);
});

test('searchText flattens the human text of a block', () => {
  assert.equal(build({ type: 'list', items: ['Eins', 'Zwei'] }).searchText, 'Eins Zwei');
  assert.equal(
    build({ type: 'steps', items: [{ title: 'A', text: 'B' }] }).searchText,
    'A B'
  );
  assert.equal(build({ type: 'divider' }).searchText, '');
});

test('block payloads are frozen once constructed', () => {
  const block = build({ type: ARTICLE_BLOCK_TYPES.LIST, items: ['Eins'] });

  assert.throws(() => {
    block.data.items.push('Zwei');
  }, TypeError);
});
