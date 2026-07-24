import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VideoSource, VIDEO_PROVIDERS } from './VideoSource.js';
import { LearningVideo } from '../entities/LearningVideo.js';

const LOOM_EMBED =
  'https://www.loom.com/embed/0281766fa2d04bb788eaf19e65135184' +
  '?hideEmbedTopBar=true&hide_owner=true&hide_share=true&hide_title=true';

test('parses Loom share URLs into embed URLs', () => {
  const source = new VideoSource(
    'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184?sid=abc'
  );

  assert.equal(source.provider, VIDEO_PROVIDERS.LOOM);
  assert.equal(source.embedUrl, LOOM_EMBED);
});

test('accepts Loom embed URLs directly', () => {
  const source = new VideoSource('https://loom.com/embed/0281766fa2d04bb788eaf19e65135184');
  assert.equal(source.embedUrl, LOOM_EMBED);
});

test('the embed suppresses Loom chrome that would overlap the picture', () => {
  const { embedUrl } = new VideoSource(
    'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184'
  );
  const params = new URL(embedUrl).searchParams;

  assert.equal(params.get('hideEmbedTopBar'), 'true');
  assert.equal(params.get('hide_owner'), 'true');
  assert.equal(params.get('hide_share'), 'true');
  assert.equal(params.get('hide_title'), 'true');
});

test('autoplay embed url spells the parameter the way each provider expects', () => {
  const loom = new VideoSource('https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184');
  const youtube = new VideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // Loom already carries the chrome parameters, so autoplay has to join them.
  assert.equal(new URL(loom.autoplayEmbedUrl).searchParams.get('autoplay'), 'true');
  assert.equal(new URL(loom.autoplayEmbedUrl).searchParams.get('hide_title'), 'true');
  assert.equal(new URL(youtube.autoplayEmbedUrl).searchParams.get('autoplay'), '1');
});

test('parses YouTube watch, short and youtu.be URLs to nocookie embeds', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

  assert.equal(new VideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ').embedUrl, expected);
  assert.equal(new VideoSource('https://youtu.be/dQw4w9WgXcQ?t=10').embedUrl, expected);
  assert.equal(new VideoSource('https://www.youtube.com/shorts/dQw4w9WgXcQ').embedUrl, expected);
});

test('parses Vimeo URLs', () => {
  assert.equal(
    new VideoSource('https://vimeo.com/123456789').embedUrl,
    'https://player.vimeo.com/video/123456789'
  );
});

test('refuses lookalike hosts and non-https URLs', () => {
  assert.equal(VideoSource.isValid('https://evil-loom.com/share/0281766fa2d04bb788eaf19e6513'), false);
  assert.equal(VideoSource.isValid('https://loom.com.evil.de/share/0281766fa2d04bb788eaf19e'), false);
  assert.equal(VideoSource.isValid('http://www.loom.com/share/0281766fa2d04bb788eaf19e65135184'), false);
  assert.equal(VideoSource.isValid('javascript:alert(1)'), false);
  assert.equal(VideoSource.isValid('https://www.loom.com/'), false);
});

test('video entity round-trips through JSON', () => {
  const video = new LearningVideo({
    categoryType: 'sales',
    title: 'Einwandbehandlung',
    shareUrl: 'https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184',
  });

  const restored = LearningVideo.fromJSON(video.toJSON());

  assert.deepEqual(restored.toJSON(), video.toJSON());
  assert.equal(restored.source.embedUrl, LOOM_EMBED);
});

test('video entity refuses unknown share URLs', () => {
  assert.throws(
    () =>
      new LearningVideo({
        categoryType: 'sales',
        title: 'Test',
        shareUrl: 'https://dropbox.com/video.mp4',
      }),
    /Video-Link nicht erkannt/
  );
});
