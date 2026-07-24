/**
 * Screen: KnowledgeBaseScreen
 * The knowledge area of the intranet: the editorial article library, rendered
 * inside the persistent IntranetShell (which owns the frame and page head).
 */

import { clearElement } from '../../../../core/utils/index.js';
import { Logger } from '../../../../core/utils/logger.js';
import { ArticleLibraryPanel } from '../components/organisms/ArticleLibraryPanel.js';

export class KnowledgeBaseScreen {
  #container;
  #articleService;
  #topicService;
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

    this.#container.appendChild(this.#articlePanel.element);
  }

  unmount() {
    this.#articlePanel?.destroy();
    clearElement(this.#container);
  }
}
