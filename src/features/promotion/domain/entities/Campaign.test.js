import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Campaign } from './Campaign.js';
import { PromoResource } from './PromoResource.js';

const summerCampaign = (overrides = {}) =>
  new Campaign({
    title: 'Sommeroffensive 2026',
    focus: 'BU-Versicherung & Altersvorsorge',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    ...overrides,
  });

test('campaign activity is derived from the date range, boundaries inclusive', () => {
  const campaign = summerCampaign();

  assert.equal(campaign.isActiveOn('2026-06-30'), false);
  assert.equal(campaign.isActiveOn('2026-07-01'), true);
  assert.equal(campaign.isActiveOn('2026-08-31'), true);
  assert.equal(campaign.isActiveOn('2026-09-01'), false);

  assert.equal(campaign.isUpcomingOn('2026-06-30'), true);
  assert.equal(campaign.isEndedOn('2026-09-01'), true);
});

test('remaining days count the end day and floor at zero', () => {
  const campaign = summerCampaign();

  assert.equal(campaign.remainingDaysOn('2026-08-31'), 0);
  assert.equal(campaign.remainingDaysOn('2026-08-30'), 1);
  assert.equal(campaign.remainingDaysOn('2026-07-15'), 47);
  assert.equal(campaign.remainingDaysOn('2026-09-05'), 0);
});

test('campaign refuses an end before the start and malformed dates', () => {
  assert.throws(
    () => summerCampaign({ startDate: '2026-09-01', endDate: '2026-08-01' }),
    /End date must not be before start date/
  );
  assert.throws(() => summerCampaign({ startDate: '01.07.2026' }), /ISO date/);
});

test('campaign CTA URL is optional but validated when present', () => {
  assert.equal(summerCampaign({ ctaUrl: '' }).ctaUrl, '');
  assert.equal(
    summerCampaign({ ctaUrl: 'https://intranet.example.de/aktion' }).ctaUrl,
    'https://intranet.example.de/aktion'
  );
  assert.throws(() => summerCampaign({ ctaUrl: 'javascript:alert(1)' }), /valid http\(s\) URL/);
});

test('campaign round-trips through JSON', () => {
  const campaign = summerCampaign({ ctaLabel: 'Details', ctaUrl: 'https://example.de' });
  assert.deepEqual(Campaign.fromJSON(campaign.toJSON()).toJSON(), campaign.toJSON());
});

test('promo resource requires a valid link and known kind', () => {
  const resource = new PromoResource({
    kindType: 'social',
    title: 'LinkedIn-Kit Juli',
    url: 'https://drive.example.de/kit',
  });

  assert.deepEqual(PromoResource.fromJSON(resource.toJSON()).toJSON(), resource.toJSON());
  assert.throws(
    () => new PromoResource({ kindType: 'karaoke', title: 'x', url: 'https://x.de' }),
    /Unknown resource kind/
  );
  assert.throws(
    () => new PromoResource({ kindType: 'social', title: 'x', url: 'ftp://x.de' }),
    /valid http\(s\) URL/
  );
});
