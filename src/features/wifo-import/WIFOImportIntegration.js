/**
 * WIFO Import Integration Module
 * Provides factory functions to create and configure WIFO import components
 */

import { WIFOImportService } from './domain/services/WIFOImportService.js';
import { WIFOFileParser } from './data/data-sources/WIFOFileParser.js';
import { LocalStorageWIFORepository } from './data/repositories/LocalStorageWIFORepository.js';
import { WIFOImportState } from './presentation/state/WIFOImportState.js';
import { WIFOImportDialog } from './presentation/components/molecules/WIFOImportDialog.js';
import { createElement } from '../../core/utils/index.js';
import { Icon } from '../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { Button } from '../hierarchy-tracking/presentation/components/atoms/Button.js';

/**
 * Create a configured WIFO import service with all dependencies
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.revenueService - Revenue service for creating entries
 * @param {Object} dependencies.hierarchyService - Hierarchy service for employee lookup
 * @returns {WIFOImportService}
 */
export function createWIFOImportService({ revenueService, hierarchyService }) {
  const fileParser = new WIFOFileParser();
  const repository = new LocalStorageWIFORepository();

  return new WIFOImportService({
    revenueService,
    hierarchyService,
    wifoRepository: repository,
    fileParser,
  });
}

/**
 * Create a WIFO import button that opens the import dialog
 * @param {Object} options - Button configuration
 * @param {Object} options.revenueService - Revenue service
 * @param {Object} options.hierarchyService - Hierarchy service
 * @param {Function} options.onImportComplete - Callback when import completes
 * @param {string} options.variant - Button variant (default: 'secondary')
 * @returns {HTMLElement}
 */
export function createWIFOImportButton({
  revenueService,
  hierarchyService,
  onImportComplete = null,
  variant = 'secondary',
}) {
  // Create import service
  const importService = createWIFOImportService({
    revenueService,
    hierarchyService,
  });

  // Create state
  const state = new WIFOImportState();

  // Create button
  const button = new Button({
    label: 'WIFO Import',
    variant,
    icon: new Icon({ name: 'upload', size: 16 }),
    onClick: () => {
      const dialog = new WIFOImportDialog({
        importService,
        state,
        onImportComplete: (batch) => {
          if (onImportComplete) {
            onImportComplete(batch);
          }
        },
      });
      dialog.show();
    },
  });

  return button.element;
}

/**
 * Create a WIFO import icon button (minimal variant)
 * @param {Object} options - Same as createWIFOImportButton
 * @returns {HTMLElement}
 */
export function createWIFOImportIconButton(options) {
  const importService = createWIFOImportService({
    revenueService: options.revenueService,
    hierarchyService: options.hierarchyService,
  });

  const state = new WIFOImportState();

  const button = createElement('button', {
    className: 'btn-icon btn-wifo-import',
    title: 'WIFO-Datei importieren',
    onclick: () => {
      const dialog = new WIFOImportDialog({
        importService,
        state,
        onImportComplete: options.onImportComplete,
      });
      dialog.show();
    },
  }, [
    createUploadIcon(),
  ]);

  return button;
}

function createUploadIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(path);
  return svg;
}

/**
 * Integration helper - adds WIFO import button to an existing toolbar
 * @param {HTMLElement} toolbar - The toolbar element
 * @param {Object} options - Import configuration
 */
export function addWIFOImportToToolbar(toolbar, options) {
  const button = createWIFOImportButton(options);
  const toolbarGroup = toolbar.querySelector('.toolbar-group:last-child');

  if (toolbarGroup) {
    // Insert before the first button in the group
    const firstBtn = toolbarGroup.querySelector('.btn, button');
    if (firstBtn) {
      toolbarGroup.insertBefore(button, firstBtn);
    } else {
      toolbarGroup.appendChild(button);
    }
  } else {
    toolbar.appendChild(button);
  }
}
