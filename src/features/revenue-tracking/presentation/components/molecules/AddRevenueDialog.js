/**
 * Molecule: AddRevenueDialog
 * Dialog for adding new revenue entries
 * Supports multiple tip providers (Tippgeber) per entry.
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Input } from '../../../../hierarchy-tracking/presentation/components/atoms/Input.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import {
  RevenueCategory,
  REVENUE_CATEGORY_TYPES,
} from '../../../domain/value-objects/RevenueCategory.js';
import { Product } from '../../../domain/value-objects/Product.js';
import { ProductProvider } from '../../../domain/value-objects/ProductProvider.js';
import { Logger } from './../../../../../core/utils/logger.js';

export class AddRevenueDialog {
  #element;
  #props;
  #formData;
  #entry; // Existing entry for edit mode
  #isEditMode;
  #revenueService;
  #hierarchyService;
  #isLoading; // Loading state for smooth transitions
  #companyMode; // Company mode: allows selecting target employee

  // Form inputs
  #dateInput;
  #customerNameInput;
  #streetInput;
  #houseNumberInput;
  #postalCodeInput;
  #cityInput;
  #categorySelect;
  #productSelect;
  #providerSelect;
  #propertyAddressInput;
  #contractNumberInput;
  #provisionAmountInput;
  #vatCheckbox;
  #notesInput;
  #trackingModeRadios; // Track revenue vs provision
  #employeeSelect; // Employee selector for company mode

  // Multi-tip-provider state
  #tipProviderRows = []; // Array of { id, selectEl, provisionInput, removeBtn }
  #tipProviderContainer; // DOM container for tip provider rows
  #addTipProviderBtn; // Button to add new row

  // Dynamic catalog data
  #categories;
  #currentCategoryData;
  #allEmployees;
  #currentProducts; // Full product objects with isVatExempt

  constructor(props = {}) {
    this.#entry = props.entry || null;
    this.#isEditMode = !!this.#entry;
    this.#revenueService = props.revenueService || null;
    this.#hierarchyService = props.hierarchyService || null;
    this.#isLoading = true; // Start in loading state
    this.#companyMode = props.companyMode || false;

    this.#props = {
      onSave: props.onSave || null,
      onCancel: props.onCancel || null,
      employeeId: props.employeeId || null, // Current employee ID (to exclude from tip provider)
      className: props.className || '',
    };

    this.#formData = {
      category: this.#entry?.category?.type || REVENUE_CATEGORY_TYPES.BANK,
      product: null,
      provider: null,
      trackingMode: 'revenue', // 'revenue' or 'provision'
    };

    this.#categories = [];
    this.#currentCategoryData = null;
    this.#allEmployees = [];
    this.#currentProducts = [];

    this.#element = this.#render();
  }

  async #initializeForm() {
    try {
      await this.#loadCategories();
      await this.#loadEmployeesForTipProvider();

      if (this.#isEditMode) {
        await this.#populateForm();
      } else {
        if (this.#categories.length > 0) {
          const firstCategoryType = this.#categories[0].type || this.#categories[0];
          await this.#onCategoryChange(firstCategoryType);
        }
      }

      this.#isLoading = false;
      this.#transitionToLoadedState();
    } catch (error) {
      Logger.error('Failed to initialize form:', error);
      this.#isLoading = false;
      this.#transitionToLoadedState();
    }
  }

  #transitionToLoadedState() {
    const skeletonContainer = this.#element.querySelector('.dialog-skeleton-container');
    const formContainer = this.#element.querySelector('.dialog-form-container');

    if (!skeletonContainer || !formContainer) {
      const allFormContainers = this.#element.querySelectorAll('.dialog-form-container');
      if (allFormContainers.length > 0) {
        allFormContainers[0].style.display = 'block';
        allFormContainers[0].style.opacity = '1';
      }
      return;
    }

    skeletonContainer.style.opacity = '0';
    skeletonContainer.style.transition = 'opacity 0.25s ease';

    setTimeout(() => {
      skeletonContainer.style.display = 'none';
      formContainer.style.display = 'block';
      formContainer.style.opacity = '1';

      if (this.#isEditMode) {
        formContainer.classList.add('instant-load');
      }

      requestAnimationFrame(() => {
        formContainer.classList.add('animate-in');
      });
    }, 250);
  }

  async #populateForm() {
    if (!this.#entry) return;

    this.#customerNameInput.setValue(this.#entry.customerName || '');

    const addr = this.#entry.customerAddress || {};
    this.#streetInput.setValue(addr.street || '');
    this.#houseNumberInput.setValue(addr.houseNumber || '');
    this.#postalCodeInput.setValue(addr.postalCode || '');
    this.#cityInput.setValue(addr.city || '');

    const categoryType = this.#entry.category?.type || REVENUE_CATEGORY_TYPES.BANK;
    this.#categorySelect.value = categoryType;
    await this.#onCategoryChange(categoryType);

    if (this.#entry.product?.name) {
      this.#productSelect.value = this.#entry.product.name;
    }

    if (this.#entry.productProvider?.name) {
      const requiresPropertyAddress = this.#currentCategoryData?.requiresPropertyAddress ||
        ProductProvider.requiresFreeTextProvider(categoryType);

      if (requiresPropertyAddress) {
        this.#propertyAddressInput.setValue(this.#entry.propertyAddress || this.#entry.productProvider.name || '');
      } else {
        this.#providerSelect.value = this.#entry.productProvider.name;
      }
    }

    if (this.#entry.entryDate) {
      const dateStr = new Date(this.#entry.entryDate).toISOString().split('T')[0];
      this.#dateInput.setValue(dateStr);
    }

    this.#contractNumberInput.setValue(this.#entry.contractNumber || '');
    this.#provisionAmountInput.setValue(this.#entry.provisionAmount?.toString() || '');
    this.#notesInput.setValue(this.#entry.notes || '');

    // Populate tip providers (multi-provider)
    const tipProviders = this.#entry.tipProviders || [];
    if (tipProviders.length > 0) {
      for (const tp of tipProviders) {
        this.#addTipProviderRow(tp.id, tp.provisionPercentage);
      }
    } else if (this.#entry.tipProviderId) {
      // Legacy fallback: single tip provider
      this.#addTipProviderRow(
        this.#entry.tipProviderId,
        this.#entry.tipProviderProvisionPercentage || 0,
      );
    }

    if (this.#entry.hasVAT !== undefined) {
      this.#vatCheckbox.checked = this.#entry.hasVAT;
    }
  }

  #render() {
    const overlay = createElement('div', { className: 'dialog-overlay' });

    const dialogTitle = this.#isEditMode ? 'Umsatz bearbeiten' : 'Neuer Umsatz';

    const skeletonContent = this.#renderSkeleton();
    const realFormContent = this.#renderRealForm();

    const dialogBody = createElement('div', { className: 'dialog-body-scroll' }, [
      skeletonContent,
      realFormContent,
    ]);

    const dialogContent = createElement('div', { className: 'dialog-content dialog-wide' }, [
      createElement('div', { className: 'dialog-header-fixed' }, [
        createElement('h2', { className: 'dialog-title' }, [dialogTitle]),
      ]),
      dialogBody,
    ]);

    dialogBody.addEventListener('scroll', () => {
      const header = dialogContent.querySelector('.dialog-header-fixed');
      if (dialogBody.scrollTop > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });

    overlay.appendChild(dialogContent);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.#handleCancel();
      }
    });

    return overlay;
  }

  #renderSkeleton() {
    const skeletonForm = createElement('div', { className: 'dialog-form' }, [
      createElement('div', { className: 'skeleton-form-col' }, [
        createElement('div', { className: 'skeleton skeleton-text-sm' }),
        createElement('div', { className: 'skeleton skeleton-input' }),
      ]),
      createElement('div', { className: 'skeleton-form-row' }, [
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
      ]),
      createElement('div', { className: 'skeleton-form-row' }, [
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
      ]),
      createElement('div', { className: 'skeleton-form-row' }, [
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-select' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-select' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-select' }),
        ]),
      ]),
      createElement('div', { className: 'skeleton-form-row' }, [
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
        createElement('div', { className: 'skeleton-form-col' }, [
          createElement('div', { className: 'skeleton skeleton-text-sm' }),
          createElement('div', { className: 'skeleton skeleton-input' }),
        ]),
      ]),
    ]);

    const skeletonActions = createElement('div', { className: 'dialog-actions' }, [
      createElement('div', { className: 'skeleton skeleton-button' }),
      createElement('div', { className: 'skeleton skeleton-button' }),
    ]);

    return createElement('div', {
      className: 'dialog-skeleton-container',
      style: 'opacity: 1; transition: opacity 0.3s ease;',
    }, [skeletonForm, skeletonActions]);
  }

  #renderRealForm() {
    const today = new Date().toISOString().split('T')[0];
    this.#dateInput = new Input({ label: 'Datum', type: 'date', value: today, required: true });
    this.#customerNameInput = new Input({ label: 'Kundenname', placeholder: 'Max Mustermann', required: true });
    this.#streetInput = new Input({ label: 'Strasse', placeholder: 'Musterstrasse' });
    this.#houseNumberInput = new Input({ label: 'Hausnr.', placeholder: '123' });
    this.#postalCodeInput = new Input({ label: 'PLZ', placeholder: '12345' });
    this.#cityInput = new Input({ label: 'Stadt', placeholder: 'Musterstadt' });

    this.#categorySelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onCategoryChange(e.target.value),
    }, [createElement('option', {}, ['Kategorien werden geladen...'])]);

    this.#productSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onProductChange(e.target.value),
    }, [createElement('option', {}, ['Produkte werden geladen...'])]);

    this.#providerSelect = createElement('select', {
      className: 'input-field',
    }, [createElement('option', {}, ['Produktgeber werden geladen...'])]);

    this.#propertyAddressInput = new Input({ label: 'Objektadresse', placeholder: 'Adresse des Objekts' });
    this.#contractNumberInput = new Input({ label: 'Vertragsnummer', placeholder: 'ABC-123456', required: true });
    this.#trackingModeRadios = this.#createTrackingModeToggle();
    this.#provisionAmountInput = new Input({ label: 'Umsatz Netto (EUR)', placeholder: '0.00', type: 'number', required: true });

    this.#vatCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'revenue-vat-checkbox',
      className: 'vat-checkbox-input',
      onchange: (e) => this.#onVATChange(e.target.checked),
    });

    this.#notesInput = new Input({ label: 'Notizen', placeholder: 'Optionale Notizen...' });

    this.#employeeSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onEmployeeChange(e.target.value),
    }, [createElement('option', { value: '' }, ['Mitarbeiter auswählen...'])]);

    // Multi-tip-provider: container and add button
    this.#tipProviderContainer = createElement('div', { className: 'tip-provider-rows' });
    this.#addTipProviderBtn = createElement('button', {
      type: 'button',
      className: 'btn-add-tip-provider',
      onclick: () => this.#addTipProviderRow(),
    }, ['+ Tippgeber hinzufügen']);

    // Form layout
    const addressRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-3' }, [this.#streetInput.element]),
      createElement('div', { className: 'dialog-form-col-1' }, [this.#houseNumberInput.element]),
    ]);

    const cityRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [this.#postalCodeInput.element]),
      createElement('div', { className: 'dialog-form-col-2' }, [this.#cityInput.element]),
    ]);

    const categoryWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Kategorie']),
      this.#categorySelect,
    ]);

    const productWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Produkt']),
      this.#productSelect,
    ]);

    const providerWrapper = createElement('div', { className: 'input-wrapper provider-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Produktgeber']),
      this.#providerSelect,
    ]);

    const propertyAddressWrapper = createElement('div', { className: 'input-wrapper property-address-wrapper hidden' }, [
      this.#propertyAddressInput.element,
    ]);

    const selectionRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [categoryWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [productWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [providerWrapper, propertyAddressWrapper]),
    ]);

    const trackingModeWrapper = createElement('div', {
      className: 'tracking-mode-wrapper',
    }, [
      createElement('label', { className: 'input-label' }, ['Was möchten Sie erfassen?']),
      this.#trackingModeRadios,
    ]);

    const dateAndContractRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [this.#dateInput.element]),
      createElement('div', { className: 'dialog-form-col-1' }, [this.#contractNumberInput.element]),
      createElement('div', { className: 'dialog-form-col-1' }, [this.#provisionAmountInput.element]),
    ]);

    const vatCheckboxWrapper = createElement('div', { className: 'vat-checkbox-wrapper' }, [
      createElement('label', { className: 'vat-checkbox-label', htmlFor: 'revenue-vat-checkbox' }, [
        this.#vatCheckbox,
        createElement('span', { className: 'vat-checkbox-text' }, [
          'Umsatzsteuer (19%) - Bruttowert wird berechnet und angezeigt',
        ]),
      ]),
    ]);

    const employeeSelectorWrapper = createElement('div', {
      className: `input-wrapper employee-selector-wrapper ${this.#companyMode ? '' : 'hidden'}`,
    }, [
      createElement('label', { className: 'input-label' }, ['Mitarbeiter']),
      this.#employeeSelect,
    ]);

    // Tip provider section with visual grouping similar to employee selector
    const tipProviderSection = createElement('div', { className: 'tip-provider-section' }, [
      createElement('div', { className: 'tip-provider-section-header' }, [
        createElement('label', { className: 'input-label' }, ['Tippgeber']),
        createElement('span', { className: 'tip-provider-section-hint' }, ['optional']),
      ]),
      this.#tipProviderContainer,
      this.#addTipProviderBtn,
    ]);

    // Actions
    const cancelBtn = new Button({ label: 'Abbrechen', variant: 'ghost', onClick: () => this.#handleCancel() });
    const saveBtn = new Button({ label: 'Speichern', variant: 'primary', onClick: () => this.#handleSave() });
    const actions = createElement('div', { className: 'dialog-actions' }, [cancelBtn.element, saveBtn.element]);

    const formContainer = createElement('div', {
      className: 'dialog-form-container',
      style: 'display: none; opacity: 0; transition: opacity 0.4s ease;',
    }, [
      createElement('div', { className: 'dialog-form' }, [
        employeeSelectorWrapper,
        this.#customerNameInput.element,
        addressRow,
        cityRow,
        selectionRow,
        trackingModeWrapper,
        dateAndContractRow,
        vatCheckboxWrapper,
        tipProviderSection,
        this.#notesInput.element,
      ]),
      actions,
    ]);

    return formContainer;
  }

  // === Multi-Tip-Provider Row Management ===

  /**
   * Add a new tip provider row to the UI
   */
  #addTipProviderRow(selectedId = '', provisionPct = '') {
    // Create select element with standard input-field styling
    const selectEl = createElement('select', { className: 'input-field' });
    this.#populateTipProviderRowSelect(selectEl, selectedId);

    selectEl.addEventListener('change', () => {
      this.#refreshTipProviderSelects();
    });

    // Provision input - create raw input to avoid Input component's wrapper/label overhead
    const provisionInputEl = createElement('input', {
      type: 'number',
      className: 'input-field',
      placeholder: 'Provision %',
      min: '0',
      max: '100',
      step: '0.1',
    });
    if (provisionPct !== '' && provisionPct !== null && provisionPct !== undefined) {
      provisionInputEl.value = provisionPct.toString();
    }

    // Lightweight provisionInput facade for .value / .setError() compatibility
    const provisionInput = {
      get value() { return provisionInputEl.value; },
      setValue(v) { provisionInputEl.value = v; },
      setError(msg) {
        provisionInputEl.classList.add('input-error');
        // Remove existing error message if present
        const existing = provisionInputEl.parentElement?.querySelector('.input-error-message');
        if (existing) existing.remove();
        if (msg) {
          const errorEl = createElement('span', { className: 'input-error-message' }, [msg]);
          provisionInputEl.parentElement?.appendChild(errorEl);
        }
      },
      element: provisionInputEl,
    };

    // Remove error state on input
    provisionInputEl.addEventListener('input', () => {
      provisionInputEl.classList.remove('input-error');
      const errMsg = provisionInputEl.parentElement?.querySelector('.input-error-message');
      if (errMsg) errMsg.remove();
    });

    // Remove button
    const removeBtn = createElement('button', {
      type: 'button',
      className: 'btn-remove-tip-provider',
      title: 'Tippgeber entfernen',
      onclick: () => this.#removeTipProviderRow(rowData),
    }, ['×']);

    // Row uses dialog-form-row layout with proper column proportions
    const rowEl = createElement('div', { className: 'dialog-form-row tip-provider-row' }, [
      createElement('div', { className: 'dialog-form-col-2' }, [
        createElement('div', { className: 'input-wrapper tp-row-field' }, [selectEl]),
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        createElement('div', { className: 'input-wrapper tp-row-field' }, [provisionInputEl]),
      ]),
      createElement('div', { className: 'tp-row-action' }, [removeBtn]),
    ]);

    const rowData = { rowEl, selectEl, provisionInput, removeBtn };
    this.#tipProviderRows.push(rowData);
    this.#tipProviderContainer.appendChild(rowEl);

    this.#refreshTipProviderSelects();
    this.#updateAddButtonVisibility();
  }

  /**
   * Remove a tip provider row
   */
  #removeTipProviderRow(rowData) {
    const index = this.#tipProviderRows.indexOf(rowData);
    if (index !== -1) {
      this.#tipProviderRows.splice(index, 1);
      rowData.rowEl.remove();
      this.#refreshTipProviderSelects();
      this.#updateAddButtonVisibility();
    }
  }

  /**
   * Populate a single tip provider select, excluding already-selected IDs
   */
  #populateTipProviderRowSelect(selectEl, selectedId = '') {
    const currentValue = selectedId || selectEl.value || '';
    selectEl.innerHTML = '';

    // "Select" placeholder
    const placeholderOpt = createElement('option', { value: '' }, ['Tippgeber wählen...']);
    selectEl.appendChild(placeholderOpt);

    // Get IDs already selected in other rows
    const usedIds = new Set();
    for (const row of this.#tipProviderRows) {
      if (row.selectEl !== selectEl && row.selectEl.value) {
        usedIds.add(row.selectEl.value);
      }
    }

    // Exclude the current employee
    const excludeId = this.#props.employeeId;

    this.#allEmployees
      .filter((emp) => emp.id !== excludeId && !usedIds.has(emp.id))
      .forEach((employee) => {
        const option = createElement('option', { value: employee.id }, [employee.name]);
        selectEl.appendChild(option);
      });

    // Restore selection if the value is still available
    if (currentValue) {
      selectEl.value = currentValue;
    }
  }

  /**
   * Refresh all tip provider selects to reflect current selections
   */
  #refreshTipProviderSelects() {
    for (const row of this.#tipProviderRows) {
      this.#populateTipProviderRowSelect(row.selectEl);
    }
  }

  /**
   * Hide the "add" button when all employees are used
   */
  #updateAddButtonVisibility() {
    const excludeId = this.#props.employeeId;
    const availableCount = this.#allEmployees.filter((emp) => emp.id !== excludeId).length;
    const usedCount = this.#tipProviderRows.length;

    if (usedCount >= availableCount) {
      this.#addTipProviderBtn.classList.add('hidden');
    } else {
      this.#addTipProviderBtn.classList.remove('hidden');
    }
  }

  /**
   * Collect tip providers data from all rows
   */
  #collectTipProviders() {
    const tipProviders = [];
    for (const row of this.#tipProviderRows) {
      const id = row.selectEl.value;
      if (!id) continue;
      const provisionPercentage = parseFloat(row.provisionInput.value) || 0;
      const name = this.#allEmployees.find((e) => e.id === id)?.name || id;
      tipProviders.push({ id, name, provisionPercentage });
    }
    return tipProviders;
  }

  // === Category / Product / Provider Loading ===

  async #loadCategories() {
    if (!this.#revenueService) {
      this.#categories = RevenueCategory.allCategories;
      this.#populateCategorySelect();
      return;
    }

    try {
      this.#categories = await this.#revenueService.getAvailableCategories();
      this.#populateCategorySelect();
    } catch (error) {
      Logger.error('Failed to load categories:', error);
      this.#categories = RevenueCategory.allCategories;
      this.#populateCategorySelect();
    }
  }

  #populateCategorySelect() {
    this.#categorySelect.innerHTML = '';
    this.#categories.forEach((category) => {
      const displayName = category.displayName || category.toString();
      const type = category.type || category;
      const option = createElement('option', { value: type }, [displayName]);
      this.#categorySelect.appendChild(option);
    });
  }

  async #loadEmployeesForTipProvider() {
    if (!this.#hierarchyService) {
      this.#allEmployees = [];
      return;
    }

    try {
      const allTrees = await this.#hierarchyService.getAllTrees();
      if (allTrees.length === 0) {
        this.#allEmployees = [];
        return;
      }

      const tree = allTrees[0];
      const allNodes = tree.getAllNodes();

      let employees = allNodes.filter((node) => !node.isRoot && node.id !== this.#props.employeeId);

      const geschaeftsfuehrerIds = ['marcel-liebetrau', 'daniel-lippa'];
      const geschaeftsfuehrerData = {
        'marcel-liebetrau': { id: 'marcel-liebetrau', name: 'Marcel Liebetrau' },
        'daniel-lippa': { id: 'daniel-lippa', name: 'Daniel Lippa' },
      };

      for (const gfId of geschaeftsfuehrerIds) {
        if (gfId !== this.#props.employeeId) {
          employees.push(geschaeftsfuehrerData[gfId]);
        }
      }

      this.#allEmployees = employees.sort((a, b) => a.name.localeCompare(b.name));

      this.#populateEmployeeSelect();
    } catch (error) {
      Logger.error('Failed to load employees for tip provider:', error);
      this.#allEmployees = [];
    }
  }

  #onEmployeeChange(employeeId) {
    this.#props.employeeId = employeeId || null;
    this.#employeeSelect.style.borderColor = '';
    // Refresh tip provider selects (exclude newly selected employee)
    this.#refreshTipProviderSelects();
    this.#updateAddButtonVisibility();
  }

  #populateEmployeeSelect() {
    if (!this.#employeeSelect || !this.#companyMode) return;

    this.#employeeSelect.innerHTML = '';
    const defaultOption = createElement('option', { value: '' }, ['Mitarbeiter auswählen...']);
    this.#employeeSelect.appendChild(defaultOption);

    this.#allEmployees.forEach((employee) => {
      const option = createElement('option', { value: employee.id }, [employee.name]);
      this.#employeeSelect.appendChild(option);
    });
  }

  async #getOwnerProvision(categoryType) {
    if (!this.#hierarchyService) return 100;

    try {
      const allTrees = await this.#hierarchyService.getAllTrees();
      if (allTrees.length === 0) return 100;

      const tree = allTrees[0];
      const employeeId = this.#props.employeeId;

      const provisionType = this.#currentCategoryData?.provisionType?.type ||
        this.#currentCategoryData?.provisionType ||
        this.#inferProvisionType(categoryType);

      // Geschaeftsfuehrer are not in the tree but have fixed 90% provisions
      const geschaeftsfuehrerProvisions = {
        'marcel-liebetrau': { bank: 90, insurance: 90, realEstate: 90 },
        'daniel-lippa': { bank: 90, insurance: 90, realEstate: 90 },
      };

      const gfData = geschaeftsfuehrerProvisions[employeeId];
      if (gfData) {
        return gfData[provisionType] || 90;
      }

      const owner = tree.getNode(employeeId);
      if (!owner) return 100;

      // Root node (company) always has 100% provision
      if (owner.isRoot) return 100;

      switch (provisionType) {
        case 'bank': return owner.bankProvision || 0;
        case 'insurance': return owner.insuranceProvision || 0;
        case 'realEstate': return owner.realEstateProvision || 0;
        default: return 0;
      }
    } catch (error) {
      Logger.error('Failed to get owner provision:', error);
      return 100;
    }
  }

  #inferProvisionType(categoryType) {
    const CATEGORY_TO_PROVISION = {
      bank: 'bank',
      insurance: 'insurance',
      realEstate: 'realEstate',
      propertyManagement: 'realEstate',
      energyContracts: 'bank',
    };
    return CATEGORY_TO_PROVISION[categoryType] || 'bank';
  }

  async #onCategoryChange(categoryType) {
    this.#formData.category = categoryType;

    if (this.#revenueService) {
      try {
        this.#currentCategoryData = await this.#revenueService.getCategoryByType(categoryType);
      } catch (error) {
        Logger.warn('Failed to load category data:', error);
        this.#currentCategoryData = null;
      }
    }

    await this.#updateProductOptions(categoryType);

    const providerWrapper = this.#element.querySelector('.provider-wrapper');
    const propertyAddressWrapper = this.#element.querySelector('.property-address-wrapper');

    const requiresPropertyAddress = this.#currentCategoryData?.requiresPropertyAddress ||
      ProductProvider.requiresFreeTextProvider(categoryType);

    if (requiresPropertyAddress) {
      providerWrapper.classList.add('hidden');
      propertyAddressWrapper.classList.remove('hidden');
    } else {
      providerWrapper.classList.remove('hidden');
      propertyAddressWrapper.classList.add('hidden');
    }

    if (!this.#isEditMode) {
      const shouldHaveVAT = this.#shouldCategoryHaveVATByDefault(categoryType);
      this.#vatCheckbox.checked = shouldHaveVAT;
    }
  }

  #shouldCategoryHaveVATByDefault(categoryType) {
    const vatCategories = ['realEstate', 'propertyManagement'];
    return vatCategories.includes(categoryType);
  }

  #onVATChange(isChecked) {
    Logger.log('VAT checkbox changed:', isChecked);
  }

  #createTrackingModeToggle() {
    const revenueRadio = createElement('input', {
      type: 'radio', name: 'tracking-mode', id: 'tracking-mode-revenue', value: 'revenue', checked: true,
    });
    const provisionRadio = createElement('input', {
      type: 'radio', name: 'tracking-mode', id: 'tracking-mode-provision', value: 'provision',
    });

    revenueRadio.addEventListener('change', () => this.#onTrackingModeChange('revenue'));
    provisionRadio.addEventListener('change', () => this.#onTrackingModeChange('provision'));

    return createElement('div', { className: 'tracking-mode-toggle' }, [
      createElement('label', { className: 'tracking-mode-option tracking-mode-option-active', htmlFor: 'tracking-mode-revenue' }, [
        revenueRadio,
        createElement('span', { className: 'tracking-mode-label' }, ['Umsatz erfassen']),
      ]),
      createElement('label', { className: 'tracking-mode-option', htmlFor: 'tracking-mode-provision' }, [
        provisionRadio,
        createElement('span', { className: 'tracking-mode-label' }, ['Provision erfassen']),
      ]),
    ]);
  }

  #onTrackingModeChange(mode) {
    this.#formData.trackingMode = mode;

    const options = this.#trackingModeRadios.querySelectorAll('.tracking-mode-option');
    options.forEach((opt) => {
      const radio = opt.querySelector('input[type="radio"]');
      opt.classList.toggle('tracking-mode-option-active', radio.value === mode);
    });

    const labelElement = this.#provisionAmountInput.element.querySelector('.input-label');
    if (labelElement) {
      if (mode === 'provision') {
        const provisionLabel = this.#companyMode
          ? 'Mitarbeiter-Provision (EUR)'
          : 'Eigene Provision (EUR)';
        const placeholderText = this.#companyMode ? 'Provision' : 'Ihre Provision';
        labelElement.textContent = provisionLabel;
        this.#provisionAmountInput.element.querySelector('input').placeholder = placeholderText;
      } else {
        labelElement.textContent = 'Umsatz Netto (EUR)';
        this.#provisionAmountInput.element.querySelector('input').placeholder = '0.00';
      }
    }
  }

  #updateVATCheckboxState(product) {
    const isVatExempt = product?.isVatExempt || false;
    const vatWrapper = this.#element.querySelector('.vat-checkbox-wrapper');

    if (isVatExempt) {
      this.#vatCheckbox.checked = false;
      vatWrapper?.classList.add('hidden');
    } else {
      vatWrapper?.classList.remove('hidden');
      if (!this.#isEditMode) {
        const categoryType = this.#categorySelect.value;
        const shouldHaveVAT = this.#shouldCategoryHaveVATByDefault(categoryType);
        this.#vatCheckbox.checked = shouldHaveVAT;
      }
    }
  }

  async #updateProductOptions(categoryType) {
    let products = [];

    if (this.#revenueService) {
      try {
        products = await this.#revenueService.getProductsForCategory(categoryType);
      } catch (error) {
        Logger.warn('Failed to load products from catalog, using fallback:', error);
        products = Product.getProductsForCategory(categoryType);
      }
    } else {
      products = Product.getProductsForCategory(categoryType);
    }

    this.#currentProducts = products;
    this.#productSelect.innerHTML = '';

    products.forEach((product) => {
      const name = product.name || product;
      const productId = product.id || name;
      const isVatExempt = product.isVatExempt || false;
      const option = createElement('option', { value: productId }, [name]);
      option.dataset.productName = name;
      option.dataset.productId = productId;
      option.dataset.isVatExempt = isVatExempt.toString();
      this.#productSelect.appendChild(option);
    });

    if (products.length > 0) {
      this.#formData.product = products[0];
      this.#updateVATCheckboxState(products[0]);
      if (products[0].id) {
        await this.#updateProviderOptionsForProduct(products[0].id);
      } else {
        await this.#updateProviderOptions(categoryType);
      }
    }
  }

  async #onProductChange(productValue) {
    const selectedOption = Array.from(this.#productSelect.options).find((opt) => opt.value === productValue);
    const productId = selectedOption?.dataset.productId;
    const productName = selectedOption?.dataset.productName || productValue;

    this.#formData.product = { id: productId, name: productName };

    const fullProduct = this.#currentProducts.find((p) => (p.id || p.name) === productId);
    this.#updateVATCheckboxState(fullProduct);

    if (productId && productId !== productName) {
      await this.#updateProviderOptionsForProduct(productId);
    } else {
      await this.#updateProviderOptions(this.#formData.category);
    }
  }

  async #updateProviderOptionsForProduct(productId) {
    let providers = [];

    if (this.#revenueService && this.#revenueService.getProvidersForProduct) {
      try {
        providers = await this.#revenueService.getProvidersForProduct(productId);
      } catch (error) {
        Logger.error('Failed to load providers for product:', error);
        await this.#updateProviderOptions(this.#formData.category);
        return;
      }
    } else {
      await this.#updateProviderOptions(this.#formData.category);
      return;
    }

    this.#providerSelect.innerHTML = '';
    providers.forEach((provider) => {
      const name = provider.name || provider;
      const option = createElement('option', { value: name }, [name]);
      this.#providerSelect.appendChild(option);
    });

    if (providers.length > 0) {
      this.#formData.provider = providers[0];
    }
  }

  async #updateProviderOptions(categoryType) {
    let providers = [];

    if (this.#revenueService) {
      try {
        providers = await this.#revenueService.getProvidersForCategory(categoryType);
      } catch (error) {
        Logger.warn('Failed to load providers from catalog, using fallback:', error);
        providers = ProductProvider.getProvidersForCategory(categoryType);
      }
    } else {
      providers = ProductProvider.getProvidersForCategory(categoryType);
    }

    this.#providerSelect.innerHTML = '';
    providers.forEach((provider) => {
      const name = provider.name || provider;
      const option = createElement('option', { value: name }, [name]);
      this.#providerSelect.appendChild(option);
    });

    if (providers.length > 0) {
      this.#formData.provider = providers[0];
    }
  }

  async #handleSave() {
    const customerName = this.#customerNameInput.value.trim();
    const contractNumber = this.#contractNumberInput.value.trim();
    const enteredAmount = parseFloat(this.#provisionAmountInput.value) || 0;
    const trackingMode = this.#formData.trackingMode;

    if (!customerName) {
      this.#customerNameInput.setError('Kundenname ist erforderlich');
      return;
    }

    if (!contractNumber) {
      this.#contractNumberInput.setError('Vertragsnummer ist erforderlich');
      return;
    }

    if (enteredAmount <= 0) {
      const errorMsg = trackingMode === 'provision'
        ? 'Provision muss grösser als 0 sein'
        : 'Umsatz muss grösser als 0 sein';
      this.#provisionAmountInput.setError(errorMsg);
      return;
    }

    // Validate employee selection in company mode
    if (this.#companyMode) {
      const selectedEmployeeId = this.#employeeSelect?.value;
      if (!selectedEmployeeId) {
        this.#employeeSelect.style.borderColor = 'var(--color-error, #e53935)';
        return;
      }
    }

    const categoryType = this.#categorySelect.value;

    // Collect tip providers from all rows
    const tipProviders = this.#collectTipProviders();
    const totalTipProviderPct = tipProviders.reduce((sum, tp) => sum + tp.provisionPercentage, 0);

    // Validate each tip provider row has a provision > 0
    for (let i = 0; i < this.#tipProviderRows.length; i++) {
      const row = this.#tipProviderRows[i];
      const id = row.selectEl.value;
      if (!id) continue; // Empty row ignored
      const pct = parseFloat(row.provisionInput.value) || 0;
      if (pct <= 0) {
        row.provisionInput.setError('Provision ist erforderlich');
        return;
      }
    }

    // Validate total tip provider provision
    if (totalTipProviderPct > 100) {
      if (this.#tipProviderRows.length > 0) {
        const lastRow = this.#tipProviderRows[this.#tipProviderRows.length - 1];
        lastRow.provisionInput.setError('Gesamte Tippgeber-Provision darf nicht über 100% sein');
      }
      return;
    }

    // Validate against owner's provision
    if (tipProviders.length > 0) {
      const ownerProvision = await this.#getOwnerProvision(categoryType);
      if (totalTipProviderPct > ownerProvision) {
        const lastRow = this.#tipProviderRows[this.#tipProviderRows.length - 1];
        const provisionLabel = this.#companyMode
          ? `die Mitarbeiter-Provision`
          : 'Ihre Provision';
        lastRow.provisionInput.setError(
          `Gesamte Tippgeber-Provision (${totalTipProviderPct}%) darf nicht höher als ${provisionLabel} (${ownerProvision}%) sein`,
        );
        return;
      }
    }

    // Calculate revenue amount (back-calculate if tracking provision)
    let provisionAmount = enteredAmount;

    if (trackingMode === 'provision') {
      const ownerBaseProvision = await this.#getOwnerProvision(categoryType);

      if (ownerBaseProvision <= 0) {
        const noProvisionMsg = this.#companyMode
          ? 'Der Mitarbeiter hat keine Provision für diese Kategorie. Bitte wählen Sie eine andere Kategorie.'
          : 'Sie haben keine Provision für diese Kategorie. Bitte wählen Sie eine andere Kategorie.';
        this.#provisionAmountInput.setError(noProvisionMsg);
        return;
      }

      const ownerEffectiveProvision = ownerBaseProvision - totalTipProviderPct;

      if (ownerEffectiveProvision <= 0) {
        const effectiveLabel = this.#companyMode
          ? 'Die effektive Mitarbeiter-Provision'
          : 'Ihre effektive Provision';
        this.#provisionAmountInput.setError(
          `${effectiveLabel} (${ownerBaseProvision}% - ${totalTipProviderPct}% Tippgeber) ist 0% oder negativ. ` +
          'Bitte reduzieren Sie die Tippgeber-Provision.',
        );
        return;
      }

      provisionAmount = enteredAmount / (ownerEffectiveProvision / 100);
    }

    const productValue = this.#productSelect.value;
    const selectedProductOption = this.#productSelect.querySelector('option:checked');
    const productId = selectedProductOption?.dataset.productId || productValue;
    const productName = selectedProductOption?.dataset.productName || productValue;
    const providerName = this.#providerSelect.value;
    const propertyAddress = this.#propertyAddressInput.value.trim();
    const entryDate = this.#dateInput.value || new Date().toISOString().split('T')[0];

    const provisionType = this.#currentCategoryData?.provisionType?.type ||
      this.#currentCategoryData?.provisionType ||
      null;

    const data = {
      customerName,
      entryDate: new Date(entryDate).toISOString(),
      customerAddress: {
        street: this.#streetInput.value.trim(),
        houseNumber: this.#houseNumberInput.value.trim(),
        postalCode: this.#postalCodeInput.value.trim(),
        city: this.#cityInput.value.trim(),
      },
      category: categoryType,
      provisionType,
      product: {
        id: productId,
        name: productName,
        category: categoryType,
      },
      productProvider: {
        name: ProductProvider.requiresFreeTextProvider(categoryType)
          ? propertyAddress || 'N/A'
          : providerName,
        category: categoryType,
      },
      propertyAddress: ProductProvider.requiresFreeTextProvider(categoryType)
        ? propertyAddress
        : null,
      contractNumber,
      provisionAmount,
      notes: this.#notesInput.value.trim(),
      hasVAT: this.#vatCheckbox.checked,
      vatRate: 19,
      // Multi-tip-provider
      tipProviders,
    };

    if (this.#isEditMode && this.#entry) {
      data.id = this.#entry.id;
    }

    // Include selected employee ID for company mode
    if (this.#companyMode) {
      data.employeeId = this.#employeeSelect?.value || this.#props.employeeId;
    }

    this.#props.onSave?.(data);
  }

  #handleCancel() {
    this.#props.onCancel?.();
    this.remove();
  }

  get element() {
    return this.#element;
  }

  async show() {
    document.body.appendChild(this.#element);
    await this.#initializeForm();

    setTimeout(() => {
      if (this.#customerNameInput && this.#customerNameInput.focus) {
        this.#customerNameInput.focus();
      }
    }, 400);
  }

  remove() {
    this.#element.remove();
  }
}
