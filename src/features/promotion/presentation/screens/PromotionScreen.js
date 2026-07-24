/**
 * Screen: PromotionScreen
 * The marketing area of the portal: the currently running campaign as a hero,
 * upcoming campaigns beneath it, and the material shelves (social, sales,
 * email, events) as a grid.
 *
 * SECURITY NOTE: isAdmin only hides affordances here; write access to
 * promo_campaigns and promo_resources is enforced by firestore.rules.
 */

import { createElement, clearElement } from '../../../../core/utils/index.js';
import { authService } from '../../../../core/auth/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { Button } from '../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { Icon } from '../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { getAllResourceKinds } from '../../domain/value-objects/ResourceKind.js';
import { CampaignEditor } from '../components/molecules/CampaignEditor.js';
import { ResourceEditor } from '../components/molecules/ResourceEditor.js';

const DIALOG_CLOSE_MS = 200;

/**
 * Launch gate: the area is built but ships dark until Geschäftsführung releases
 * it with real campaigns. While true, mount() renders only the coming-soon
 * card and never touches Firestore. Flip to false to launch — everything below
 * is the finished feature, not dead code.
 */
const UNDER_CONSTRUCTION = true;

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export class PromotionScreen {
  #container;
  #promotionService;
  #campaignHost;
  #resourceHost;
  #board = { active: [], upcoming: [], ended: [], today: '' };
  #resources = [];
  #isAdmin = false;
  #loadFailed = false;

  constructor(container, promotionService) {
    this.#container =
      typeof container === 'string' ? document.querySelector(container) : container;
    this.#promotionService = promotionService;
  }

  async mount() {
    clearElement(this.#container);

    if (UNDER_CONSTRUCTION) {
      this.#container.appendChild(this.#createComingSoon());
      return;
    }

    this.#isAdmin = authService.isAdmin();
    await this.#load();

    this.#container.appendChild(this.#render());
  }

  #createComingSoon() {
    return createElement('section', { className: 'promo-coming', 'aria-label': 'Bereich in Entwicklung' }, [
      createElement('span', { className: 'promo-coming-watermark', 'aria-hidden': 'true' }, [
        new Icon({ name: 'star', size: 220 }).element,
      ]),
      createElement('span', { className: 'promo-coming-kicker' }, [
        new Icon({ name: 'clock', size: 13 }).element,
        createElement('span', {}, ['In Entwicklung']),
      ]),
      createElement('h2', { className: 'promo-coming-title' }, ['Dieser Bereich entsteht gerade']),
      createElement('p', { className: 'promo-coming-text' }, [
        'Promotion und Marketing werden aktuell für Sie aufgebaut. Sobald der Bereich fertig ist, finden Sie hier laufende Kampagnen und fertige Materialien für Ihre Beratung.',
      ]),
      createElement('div', { className: 'promo-coming-chips' }, [
        this.#createComingChip('star', 'Kampagnen'),
        this.#createComingChip('briefcase', 'Sales Materialien'),
        this.#createComingChip('share', 'Social Media Vorlagen'),
      ]),
      createElement('p', { className: 'promo-coming-note' }, [
        'Es ist nichts weiter zu tun. Der Bereich wird automatisch freigeschaltet.',
      ]),
    ]);
  }

  #createComingChip(icon, label) {
    return createElement('span', { className: 'promo-coming-chip' }, [
      new Icon({ name: icon, size: 14 }).element,
      createElement('span', {}, [label]),
    ]);
  }

  async #load() {
    try {
      const [board, resources] = await Promise.all([
        this.#promotionService.getCampaignBoard(),
        this.#promotionService.getAllResources(),
      ]);

      this.#board = board;
      this.#resources = resources;
      this.#loadFailed = false;
    } catch (error) {
      Logger.error('Failed to load promotion content:', error);
      this.#loadFailed = true;
    }
  }

  #render() {
    this.#campaignHost = createElement('section', {
      className: 'promo-campaigns',
      'aria-label': 'Kampagnen',
    });
    this.#resourceHost = createElement('section', {
      className: 'promo-resources',
      'aria-label': 'Materialien',
    });

    this.#renderCampaigns();
    this.#renderResources();

    // The persistent IntranetShell owns the frame and page head; the screen
    // only renders its content column.
    return createElement('div', { className: 'promo-screen' }, [
      this.#campaignHost,
      this.#resourceHost,
    ]);
  }

  // ========================================
  // CAMPAIGNS
  // ========================================

  #renderCampaigns() {
    if (this.#loadFailed) {
      this.#campaignHost.replaceChildren(
        this.#createState({
          icon: 'alertCircle',
          title: 'Promotion konnte nicht geladen werden',
          message: 'Die Inhalte sind derzeit nicht abrufbar. Bitte laden Sie die Seite neu.',
        })
      );
      return;
    }

    const children = [];

    const headRow = createElement('div', { className: 'promo-section-head' }, [
      createElement('h2', { className: 'promo-section-title' }, ['Kampagnen']),
      this.#isAdmin
        ? new Button({
            label: 'Neue Kampagne',
            variant: 'primary',
            size: 'sm',
            icon: new Icon({ name: 'plus', size: 15 }).element,
            onClick: () => this.#showCampaignDialog(null),
          }).element
        : null,
    ].filter(Boolean));

    children.push(headRow);

    if (this.#board.active.length === 0 && this.#board.upcoming.length === 0) {
      children.push(
        this.#createState({
          icon: 'star',
          title: 'Zurzeit keine laufende Kampagne',
          message: this.#isAdmin
            ? 'Legen Sie eine Kampagne mit Laufzeit an – sie erscheint hier automatisch.'
            : 'Sobald eine Aktion startet, erscheint sie hier.',
        })
      );
    }

    this.#board.active.forEach((campaign) => {
      children.push(this.#createCampaignHero(campaign));
    });

    if (this.#board.upcoming.length > 0) {
      children.push(
        createElement('h3', { className: 'promo-subsection-title' }, ['Demnächst']),
        ...this.#board.upcoming.map((campaign) => this.#createCampaignRow(campaign))
      );
    }

    // Ended campaigns are admin-only clutter control: visible to clean up,
    // invisible to everyone else.
    if (this.#isAdmin && this.#board.ended.length > 0) {
      children.push(
        createElement('h3', { className: 'promo-subsection-title' }, ['Beendet']),
        ...this.#board.ended.map((campaign) => this.#createCampaignRow(campaign, true))
      );
    }

    this.#campaignHost.replaceChildren(...children);
  }

  #createCampaignHero(campaign) {
    const remaining = campaign.remainingDaysOn(this.#board.today);

    const metaParts = [
      `${formatDate(campaign.startDate)} – ${formatDate(campaign.endDate)}`,
      remaining > 0 ? `Läuft noch ${remaining} ${remaining === 1 ? 'Tag' : 'Tage'}` : 'Letzter Tag',
    ];

    const body = createElement('div', { className: 'promo-hero-body' }, [
      createElement('span', { className: 'promo-hero-kicker' }, ['Aktive Kampagne']),
      createElement('h3', { className: 'promo-hero-title' }, [campaign.title]),
      campaign.focus
        ? createElement('p', { className: 'promo-hero-focus' }, [`Fokus: ${campaign.focus}`])
        : null,
      campaign.description
        ? createElement('p', { className: 'promo-hero-description' }, [campaign.description])
        : null,
      createElement('p', { className: 'promo-hero-meta' }, [metaParts.join(' · ')]),
      this.#createHeroActions(campaign),
    ].filter(Boolean));

    return createElement('article', { className: 'promo-hero' }, [
      createElement('span', { className: 'promo-hero-emblem', 'aria-hidden': 'true' }, [
        new Icon({ name: 'star', size: 30 }).element,
      ]),
      body,
    ]);
  }

  #createHeroActions(campaign) {
    const actions = [];

    if (campaign.ctaUrl) {
      actions.push(
        createElement(
          'a',
          {
            className: 'promo-hero-cta',
            href: campaign.ctaUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          [
            createElement('span', {}, [campaign.ctaLabel || 'Details ansehen']),
            new Icon({ name: 'externalLink', size: 14 }).element,
          ]
        )
      );
    }

    if (this.#isAdmin) {
      actions.push(this.#createAdminGroup(campaign, 'promo-hero-admin'));
    }

    return actions.length > 0
      ? createElement('div', { className: 'promo-hero-actions' }, actions)
      : null;
  }

  #createCampaignRow(campaign, isEnded = false) {
    const range = `${formatDate(campaign.startDate)} – ${formatDate(campaign.endDate)}`;

    return createElement(
      'div',
      { className: `promo-campaign-row ${isEnded ? 'promo-campaign-row--ended' : ''}`.trim() },
      [
        createElement('div', { className: 'promo-campaign-row-text' }, [
          createElement('span', { className: 'promo-campaign-row-title' }, [campaign.title]),
          createElement('span', { className: 'promo-campaign-row-meta' }, [
            [range, campaign.focus].filter(Boolean).join(' · '),
          ]),
        ]),
        this.#isAdmin ? this.#createAdminGroup(campaign, 'promo-campaign-row-admin') : null,
      ].filter(Boolean)
    );
  }

  #createAdminGroup(campaign, className) {
    return createElement('div', { className }, [
      this.#createIconButton('edit', 'Kampagne bearbeiten', () =>
        this.#showCampaignDialog(campaign)
      ),
      this.#createIconButton('trash', 'Kampagne löschen', () => this.#confirmDeleteCampaign(campaign)),
    ]);
  }

  // ========================================
  // RESOURCES
  // ========================================

  #renderResources() {
    if (this.#loadFailed) {
      this.#resourceHost.replaceChildren();
      return;
    }

    const headRow = createElement('div', { className: 'promo-section-head' }, [
      createElement('h2', { className: 'promo-section-title' }, ['Materialien']),
      this.#isAdmin
        ? new Button({
            label: 'Neues Material',
            variant: 'outline',
            size: 'sm',
            icon: new Icon({ name: 'plus', size: 15 }).element,
            onClick: () => this.#showResourceDialog(null, null),
          }).element
        : null,
    ].filter(Boolean));

    const grid = createElement(
      'div',
      { className: 'promo-kind-grid' },
      getAllResourceKinds().map((kind) => this.#createKindCard(kind))
    );

    this.#resourceHost.replaceChildren(headRow, grid);
  }

  #createKindCard(kind) {
    const items = this.#resources.filter((resource) => resource.kindType === kind.type);

    const list =
      items.length > 0
        ? createElement(
            'ul',
            { className: 'promo-resource-list' },
            items.map((resource) => this.#createResourceItem(resource))
          )
        : createElement('p', { className: 'promo-kind-empty' }, [
            this.#isAdmin ? 'Noch nichts hinterlegt.' : 'Folgt in Kürze.',
          ]);

    return createElement('article', { className: `promo-kind-card promo-kind-card--${kind.tint}` }, [
      createElement('div', { className: 'promo-kind-head' }, [
        createElement('span', { className: 'promo-kind-icon' }, [
          new Icon({ name: kind.icon, size: 20 }).element,
        ]),
        createElement('div', { className: 'promo-kind-heading' }, [
          createElement('h3', { className: 'promo-kind-title' }, [kind.label]),
          createElement('p', { className: 'promo-kind-description' }, [kind.description]),
        ]),
        createElement('span', { className: 'promo-kind-count' }, [String(items.length)]),
      ]),
      list,
    ]);
  }

  #createResourceItem(resource) {
    const link = createElement(
      'a',
      {
        className: 'promo-resource-link',
        href: resource.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [
        createElement('span', { className: 'promo-resource-title' }, [resource.title]),
        resource.description
          ? createElement('span', { className: 'promo-resource-description' }, [
              resource.description,
            ])
          : null,
        new Icon({ name: 'externalLink', size: 14 }).element,
      ].filter(Boolean)
    );

    const children = [link];

    if (this.#isAdmin) {
      children.push(
        createElement('div', { className: 'promo-resource-admin' }, [
          this.#createIconButton('edit', 'Material bearbeiten', () =>
            this.#showResourceDialog(resource, null)
          ),
          this.#createIconButton('trash', 'Material löschen', () =>
            this.#confirmDeleteResource(resource)
          ),
        ])
      );
    }

    return createElement('li', { className: 'promo-resource-item' }, children);
  }

  // ========================================
  // SHARED UI
  // ========================================

  #createIconButton(icon, label, onClick) {
    return createElement(
      'button',
      { className: 'promo-icon-btn', type: 'button', 'aria-label': label, title: label, onclick: onClick },
      [new Icon({ name: icon, size: 14 }).element]
    );
  }

  #createState({ icon, title, message }) {
    return createElement('div', { className: 'portal-state' }, [
      createElement('span', { className: 'portal-state-icon' }, [
        new Icon({ name: icon, size: 26 }).element,
      ]),
      createElement('h3', { className: 'portal-state-title' }, [title]),
      createElement('p', { className: 'portal-state-message' }, [message]),
    ]);
  }

  async #refresh() {
    await this.#load();
    this.#renderCampaigns();
    this.#renderResources();
  }

  async #confirmDeleteCampaign(campaign) {
    if (!window.confirm(`Kampagne „${campaign.title}" wirklich löschen?`)) {
      return;
    }

    try {
      await this.#promotionService.deleteCampaign(campaign.id);
      await this.#refresh();
    } catch (error) {
      Logger.error('Failed to delete campaign:', error);
      window.alert('Die Kampagne konnte nicht gelöscht werden.');
    }
  }

  async #confirmDeleteResource(resource) {
    if (!window.confirm(`Material „${resource.title}" wirklich löschen?`)) {
      return;
    }

    try {
      await this.#promotionService.deleteResource(resource.id);
      await this.#refresh();
    } catch (error) {
      Logger.error('Failed to delete resource:', error);
      window.alert('Das Material konnte nicht gelöscht werden.');
    }
  }

  #showCampaignDialog(campaign) {
    let close;

    const editor = new CampaignEditor(campaign, {
      onSave: async (data) => {
        try {
          if (campaign) {
            await this.#promotionService.updateCampaign(campaign.id, data);
          } else {
            await this.#promotionService.createCampaign(data);
          }
        } catch (error) {
          Logger.error('Failed to save campaign:', error);
          editor.showError(error.message || 'Die Kampagne konnte nicht gespeichert werden.');
          return;
        }

        close();
        await this.#refresh();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: campaign ? 'Kampagne bearbeiten' : 'Neue Kampagne',
      editor,
    });
  }

  #showResourceDialog(resource, defaultKindType) {
    let close;

    const editor = new ResourceEditor(resource, {
      defaultKindType,
      onSave: async (data) => {
        try {
          if (resource) {
            await this.#promotionService.updateResource(resource.id, data);
          } else {
            await this.#promotionService.createResource(data);
          }
        } catch (error) {
          Logger.error('Failed to save resource:', error);
          editor.showError(error.message || 'Das Material konnte nicht gespeichert werden.');
          return;
        }

        close();
        await this.#refresh();
      },
      onCancel: () => close(),
    });

    close = this.#openDialog({
      title: resource ? 'Material bearbeiten' : 'Neues Material',
      editor,
    });
  }

  #openDialog({ title, editor }) {
    const titleId = 'promo-dialog-title';

    const overlay = createElement('div', {
      className: 'dialog-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    });

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };

    const closeDialog = () => {
      document.removeEventListener('keydown', onKeydown);
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), DIALOG_CLOSE_MS);
    };

    overlay.appendChild(
      createElement('div', { className: 'dialog-content' }, [
        createElement('h2', { className: 'dialog-title', id: titleId }, [title]),
        editor.element,
      ])
    );

    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    editor.focus();

    return closeDialog;
  }

  unmount() {
    clearElement(this.#container);
  }
}
