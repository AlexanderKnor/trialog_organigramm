/**
 * Molecule: KnowledgeEntryCard
 * One knowledge entry: what it says, who it is about, where to go next.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { FreshnessBadge } from './FreshnessBadge.js';

export class KnowledgeEntryCard {
  #props;
  #element;

  constructor(props = {}) {
    this.#props = {
      entry: props.entry,
      isAdmin: props.isAdmin || false,
      onEdit: props.onEdit || null,
      onDelete: props.onDelete || null,
      onMarkReviewed: props.onMarkReviewed || null,
    };

    this.#element = this.#render();
  }

  #render() {
    const entry = this.#props.entry;

    const children = [this.#createHeader(entry)];

    if (entry.description) {
      // pre-wrap in CSS keeps the author's line breaks; the text is inserted as
      // a text node, so there is no markup to sanitise.
      children.push(createElement('p', { className: 'kb-entry-description' }, [entry.description]));
    }

    if (entry.links.length > 0) {
      children.push(this.#createLinks(entry));
    }

    if (entry.tags.length > 0) {
      children.push(this.#createTags(entry));
    }

    if (this.#props.isAdmin) {
      children.push(this.#createAdminActions(entry));
    }

    return createElement('article', { className: 'kb-entry' }, children);
  }

  #createHeader(entry) {
    const meta = [new FreshnessBadge({ freshness: entry.freshness }).element];

    if (!entry.isActive) {
      meta.unshift(createElement('span', { className: 'kb-entry-inactive' }, ['Inaktiv']));
    }

    const titleBlock = [createElement('h3', { className: 'kb-entry-title' }, [entry.title])];

    if (entry.partnerName) {
      titleBlock.push(createElement('p', { className: 'kb-entry-partner' }, [entry.partnerName]));
    }

    if (entry.partnerContact) {
      titleBlock.push(
        createElement('p', { className: 'kb-entry-contact' }, [
          new Icon({ name: 'mail', size: 13 }).element,
          createElement('span', {}, [entry.partnerContact]),
        ])
      );
    }

    return createElement('div', { className: 'kb-entry-header' }, [
      createElement('div', { className: 'kb-entry-heading' }, titleBlock),
      createElement('div', { className: 'kb-entry-meta' }, meta),
    ]);
  }

  #createLinks(entry) {
    return createElement(
      'ul',
      { className: 'kb-entry-links' },
      entry.links.map((link) =>
        createElement('li', { className: 'kb-entry-link-item' }, [this.#createLink(link)])
      )
    );
  }

  #createLink(link) {
    const attributes = {
      className: 'kb-entry-link',
      // href goes through setAttribute, never innerHTML. The URL itself was
      // already vetted by the KnowledgeLink value object.
      href: link.url,
    };

    if (link.isExternal) {
      attributes.target = '_blank';
      // noreferrer for privacy, noopener so the opened page cannot reach back
      // through window.opener and redirect this tab.
      attributes.rel = 'noopener noreferrer';
    }

    return createElement('a', attributes, [
      new Icon({ name: link.isExternal ? 'externalLink' : 'link', size: 14 }).element,
      createElement('span', {}, [link.label]),
    ]);
  }

  #createTags(entry) {
    return createElement(
      'ul',
      { className: 'kb-entry-tags' },
      entry.tags.map((tag) => createElement('li', { className: 'kb-tag' }, [tag]))
    );
  }

  #createAdminActions(entry) {
    const actions = [];

    if (!entry.freshness.isCurrent && this.#props.onMarkReviewed) {
      actions.push(
        this.#createAction({
          label: 'Als aktuell bestätigen',
          icon: 'checkCircle',
          className: 'kb-entry-action-confirm',
          onClick: () => this.#props.onMarkReviewed(entry),
        })
      );
    }

    actions.push(
      this.#createAction({
        label: 'Bearbeiten',
        icon: 'edit',
        onClick: () => this.#props.onEdit?.(entry),
      })
    );

    actions.push(
      this.#createAction({
        label: 'Löschen',
        icon: 'delete',
        className: 'kb-entry-action-danger',
        onClick: () => this.#props.onDelete?.(entry),
      })
    );

    return createElement('div', { className: 'kb-entry-actions' }, actions);
  }

  #createAction({ label, icon, className = '', onClick }) {
    return createElement(
      'button',
      {
        className: `kb-entry-action ${className}`.trim(),
        type: 'button',
        title: label,
        'aria-label': `${label}: ${this.#props.entry.title}`,
        onclick: onClick,
      },
      [new Icon({ name: icon, size: 16 }).element, createElement('span', {}, [label])]
    );
  }

  get element() {
    return this.#element;
  }
}
