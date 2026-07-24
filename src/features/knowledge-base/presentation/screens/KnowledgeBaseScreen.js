/**
 * Screen: KnowledgeBaseScreen
 * The knowledge area of the portal: the editorial article library, full width.
 */

import { clearElement } from '../../../../core/utils/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { PortalShell } from '../../../../shared/presentation/PortalShell.js';
import { ArticleLibraryPanel } from '../components/organisms/ArticleLibraryPanel.js';

export class KnowledgeBaseScreen {
  #container;
  #articleService;
  #topicService;
  #shell = null;
  #articlePanel = null;

  constructor(container, articleService, topicService) {
    this.#container =
      typeof container === 'string' ? document.querySelector(container) : container;
    this.#articleService = articleService;
    this.#topicService = topicService;
  }

  async mount() {
    clearElement(this.#container);

    this.#articlePanel = new ArticleLibraryPanel({
      articleService: this.#articleService,
      topicService: this.#topicService,
    });

    try {
      await this.#articlePanel.initialize();
    } catch (error) {
      Logger.error('Failed to initialize article library:', error);
    }

    this.#shell = new PortalShell({
      active: 'knowledge',
      title: 'Wissensdatenbank',
      subtitle: 'Leitfäden, Vorlagen, Prozesse und FAQs',
      backBar: { title: 'Wissensdatenbank' },
    });

    this.#shell.contentElement.appendChild(this.#articlePanel.element);
    this.#container.appendChild(this.#shell.element);
  }

  unmount() {
    this.#articlePanel?.destroy();
    this.#shell?.destroy();
    this.#shell = null;
  }
}
