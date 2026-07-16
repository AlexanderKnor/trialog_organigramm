/**
 * Molecule: OrgSearch
 * Elegant search/filter control for the organigramm. Lets the user find a
 * sales partner by name, live-highlights matches in the chart (dimming the
 * rest), and focuses the selected node.
 *
 * The component is data-source agnostic: it pulls the current set of nodes
 * lazily through `getNodes` on every keystroke, so it always reflects the
 * latest rendered tree without needing to be notified of updates.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Icon } from '../atoms/Icon.js';

export class OrgSearch {
  #element;
  #input;
  #clearButton;
  #resultsPanel;
  #resultsList;
  #emptyState;
  #countLabel;
  #props;
  #nodes;
  #matches;
  #activeIndex;
  #documentClickHandler;

  constructor(props = {}) {
    this.#props = {
      getNodes: props.getNodes || (() => []),
      onHighlight: props.onHighlight || (() => {}),
      onSelect: props.onSelect || (() => {}),
      onClear: props.onClear || (() => {}),
      placeholder: props.placeholder || 'Vertriebspartner suchen',
    };
    this.#nodes = [];
    this.#matches = [];
    this.#activeIndex = -1;
    this.#element = this.#render();
  }

  get element() {
    return this.#element;
  }

  #render() {
    const searchIcon = new Icon({ name: 'search', size: 18 });
    searchIcon.element.classList.add('org-search-icon');

    this.#input = createElement('input', {
      type: 'text',
      className: 'org-search-input',
      placeholder: this.#props.placeholder,
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-label': this.#props.placeholder,
    });
    this.#input.addEventListener('input', () => this.#handleInput());
    this.#input.addEventListener('focus', () => this.#handleFocus());
    this.#input.addEventListener('keydown', (e) => this.#handleKeydown(e));

    const clearIcon = new Icon({ name: 'close', size: 16 });
    this.#clearButton = createElement('button', {
      type: 'button',
      className: 'org-search-clear',
      'aria-label': 'Suche zurücksetzen',
    }, [clearIcon.element]);
    this.#clearButton.addEventListener('click', () => this.#handleClear());

    const field = createElement('div', { className: 'org-search-field' }, [
      searchIcon.element,
      this.#input,
      this.#clearButton,
    ]);

    this.#resultsList = createElement('div', { className: 'org-search-results-list' });
    this.#emptyState = createElement('div', { className: 'org-search-empty' }, [
      'Kein Vertriebspartner gefunden',
    ]);
    this.#countLabel = createElement('span', { className: 'org-search-count' });

    const resultsFooter = createElement('div', { className: 'org-search-footer' }, [
      this.#countLabel,
      createElement('span', { className: 'org-search-hint' }, ['Enter zum Fokussieren']),
    ]);

    this.#resultsPanel = createElement('div', { className: 'org-search-results' }, [
      this.#resultsList,
      this.#emptyState,
      resultsFooter,
    ]);

    const element = createElement('div', {
      className: 'org-search',
      role: 'search',
    }, [field, this.#resultsPanel]);

    // Close the dropdown when clicking outside the component
    this.#documentClickHandler = (e) => {
      if (!element.contains(e.target)) {
        this.#hideResults();
      }
    };
    document.addEventListener('click', this.#documentClickHandler);

    return element;
  }

  #normalize(value) {
    return (value || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  #computeMatches(query) {
    const terms = this.#normalize(query).split(/\s+/).filter(Boolean);
    this.#nodes = this.#props.getNodes();

    if (terms.length === 0) {
      this.#matches = [];
      return;
    }

    this.#matches = this.#nodes.filter((node) => {
      const haystack = this.#normalize(`${node.name} ${node.subtitle || ''}`);
      return terms.every((term) => haystack.includes(term));
    });
  }

  #handleInput() {
    const query = this.#input.value.trim();
    this.#updateClearVisibility();

    if (query.length === 0) {
      this.#matches = [];
      this.#props.onHighlight(null);
      this.#hideResults();
      return;
    }

    this.#computeMatches(query);
    this.#activeIndex = this.#matches.length > 0 ? 0 : -1;
    this.#props.onHighlight(new Set(this.#matches.map((n) => n.id)));
    this.#renderResults();
    this.#showResults();
  }

  #handleFocus() {
    if (this.#input.value.trim().length > 0) {
      this.#showResults();
    }
  }

  #handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.#moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.#moveActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.#activeIndex >= 0 && this.#matches[this.#activeIndex]) {
        this.#selectMatch(this.#matches[this.#activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (this.#resultsPanel.classList.contains('open')) {
        this.#hideResults();
      } else {
        this.#handleClear();
      }
    }
  }

  #moveActive(delta) {
    if (this.#matches.length === 0) return;
    this.#showResults();
    this.#activeIndex = (this.#activeIndex + delta + this.#matches.length) % this.#matches.length;
    this.#renderResults();

    const activeEl = this.#resultsList.querySelector('.org-search-result.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  #renderResults() {
    this.#resultsList.innerHTML = '';

    if (this.#matches.length === 0) {
      this.#emptyState.classList.add('visible');
      this.#countLabel.textContent = `0 von ${this.#nodes.length}`;
      return;
    }

    this.#emptyState.classList.remove('visible');

    this.#matches.forEach((node, index) => {
      const initial = (node.name || '?').trim().charAt(0).toUpperCase();
      const avatar = createElement('span', { className: 'org-search-result-avatar' }, [initial]);

      const name = createElement('span', { className: 'org-search-result-name' }, [node.name]);
      const meta = node.subtitle
        ? createElement('span', { className: 'org-search-result-meta' }, [node.subtitle])
        : null;

      const textWrapper = createElement('span', { className: 'org-search-result-text' },
        [name, meta].filter(Boolean));

      const result = createElement('div', {
        className: `org-search-result${index === this.#activeIndex ? ' active' : ''}`,
        role: 'option',
      }, [avatar, textWrapper]);

      result.addEventListener('mouseenter', () => {
        this.#activeIndex = index;
        this.#renderResults();
      });
      result.addEventListener('click', () => this.#selectMatch(node));

      this.#resultsList.appendChild(result);
    });

    this.#countLabel.textContent =
      `${this.#matches.length} von ${this.#nodes.length}`;
  }

  #selectMatch(node) {
    this.#input.value = node.name;
    this.#matches = [node];
    this.#activeIndex = 0;
    this.#updateClearVisibility();
    this.#props.onHighlight(new Set([node.id]));
    this.#props.onSelect(node.id);
    this.#hideResults();
  }

  #handleClear() {
    this.#input.value = '';
    this.#matches = [];
    this.#activeIndex = -1;
    this.#updateClearVisibility();
    this.#hideResults();
    this.#props.onHighlight(null);
    this.#props.onClear();
    this.#input.focus();
  }

  #updateClearVisibility() {
    const hasValue = this.#input.value.length > 0;
    this.#element.classList.toggle('has-value', hasValue);
  }

  #showResults() {
    this.#resultsPanel.classList.add('open');
    this.#element.classList.add('open');
  }

  #hideResults() {
    this.#resultsPanel.classList.remove('open');
    this.#element.classList.remove('open');
  }

  destroy() {
    if (this.#documentClickHandler) {
      document.removeEventListener('click', this.#documentClickHandler);
      this.#documentClickHandler = null;
    }
  }
}
