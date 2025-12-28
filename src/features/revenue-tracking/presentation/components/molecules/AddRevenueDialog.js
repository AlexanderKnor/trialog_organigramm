/**
 * Molecule: AddRevenueDialog
 * Dialog for adding new revenue entries
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
  #tipProviderSelect;
  #tipProviderProvisionInput;

  // Dynamic catalog data
  #categories;
  #currentCategoryData;
  #allEmployees;

  constructor(props = {}) {
    this.#entry = props.entry || null;
    this.#isEditMode = !!this.#entry;
    this.#revenueService = props.revenueService || null;
    this.#hierarchyService = props.hierarchyService || null;
    this.#isLoading = true; // Start in loading state

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
      tipProvider: null,
      tipProviderProvision: null,
    };

    this.#categories = [];
    this.#currentCategoryData = null;
    this.#allEmployees = [];

    this.#element = this.#render();
    // Note: #initializeForm() will be called after show() to prevent empty modal flash
  }

  async #initializeForm() {
    try {
      // Load categories from catalog
      await this.#loadCategories();

      // Load employees for tip provider dropdown
      await this.#loadEmployeesForTipProvider();

      // Populate form if editing
      if (this.#isEditMode) {
        await this.#populateForm();
      } else {
        // Initialize with first category
        if (this.#categories.length > 0) {
          const firstCategoryType = this.#categories[0].type || this.#categories[0];
          await this.#onCategoryChange(firstCategoryType);
        }
      }

      // Data loaded - transition from skeleton to real form
      this.#isLoading = false;
      this.#transitionToLoadedState();
    } catch (error) {
      Logger.error('Failed to initialize form:', error);
      // Still show form even if some data failed to load
      this.#isLoading = false;
      this.#transitionToLoadedState();
    }
  }

  /**
   * Smooth transition from skeleton to loaded form
   */
  #transitionToLoadedState() {
    const skeletonContainer = this.#element.querySelector('.dialog-skeleton-container');
    const formContainer = this.#element.querySelector('.dialog-form-container');

    Logger.log('Transitioning to loaded state:', {
      skeleton: !!skeletonContainer,
      form: !!formContainer,
    });

    if (!skeletonContainer || !formContainer) {
      Logger.error('Could not find containers - showing form immediately');

      // Fallback: Find and show form container directly
      const allFormContainers = this.#element.querySelectorAll('.dialog-form-container');
      if (allFormContainers.length > 0) {
        allFormContainers[0].style.display = 'block';
        allFormContainers[0].style.opacity = '1';
        Logger.log('Fallback: Showing form container');
      }
      return;
    }

    // Fade out skeleton
    skeletonContainer.style.opacity = '0';
    skeletonContainer.style.transition = 'opacity 0.25s ease';

    setTimeout(() => {
      skeletonContainer.style.display = 'none';
      formContainer.style.display = 'block';
      formContainer.style.opacity = '1';

      // Add instant-load class if edit mode to skip stagger animations
      if (this.#isEditMode) {
        formContainer.classList.add('instant-load');
      }

      // CRITICAL: Trigger animations AFTER display: block
      requestAnimationFrame(() => {
        formContainer.classList.add('animate-in');
        Logger.log('Form container shown and animating');
      });
    }, 250);
  }

  async #populateForm() {
    if (!this.#entry) return;

    // Set customer name
    this.#customerNameInput.setValue(this.#entry.customerName || '');

    // Set address
    const addr = this.#entry.customerAddress || {};
    this.#streetInput.setValue(addr.street || '');
    this.#houseNumberInput.setValue(addr.houseNumber || '');
    this.#postalCodeInput.setValue(addr.postalCode || '');
    this.#cityInput.setValue(addr.city || '');

    // Set category and update dependent selects
    const categoryType = this.#entry.category?.type || REVENUE_CATEGORY_TYPES.BANK;
    this.#categorySelect.value = categoryType;
    await this.#onCategoryChange(categoryType);

    // Set product (after options are updated)
    if (this.#entry.product?.name) {
      this.#productSelect.value = this.#entry.product.name;
    }

    // Set provider
    if (this.#entry.productProvider?.name) {
      const requiresPropertyAddress = this.#currentCategoryData?.requiresPropertyAddress ||
        ProductProvider.requiresFreeTextProvider(categoryType);

      if (requiresPropertyAddress) {
        this.#propertyAddressInput.setValue(this.#entry.propertyAddress || this.#entry.productProvider.name || '');
      } else {
        this.#providerSelect.value = this.#entry.productProvider.name;
      }
    }

    // Set date
    if (this.#entry.entryDate) {
      const dateStr = new Date(this.#entry.entryDate).toISOString().split('T')[0];
      this.#dateInput.setValue(dateStr);
    }

    // Set other fields
    this.#contractNumberInput.setValue(this.#entry.contractNumber || '');
    this.#provisionAmountInput.setValue(this.#entry.provisionAmount?.toString() || '');
    this.#notesInput.setValue(this.#entry.notes || '');

    // Set tip provider if present
    if (this.#entry.tipProviderId) {
      this.#tipProviderSelect.value = this.#entry.tipProviderId;
      this.#tipProviderProvisionInput.setValue(this.#entry.tipProviderProvisionPercentage?.toString() || '');
      this.#tipProviderProvisionInput.setDisabled(false);
    } else {
      this.#tipProviderProvisionInput.setDisabled(true);
    }

    // Set VAT checkbox
    if (this.#entry.hasVAT !== undefined) {
      this.#vatCheckbox.checked = this.#entry.hasVAT;
    }
  }

  #render() {
    const overlay = createElement('div', { className: 'dialog-overlay' });

    const dialogTitle = this.#isEditMode ? 'Umsatz bearbeiten' : 'Neuer Umsatz';

    // Create skeleton and real form content
    const skeletonContent = this.#renderSkeleton();
    const realFormContent = this.#renderRealForm();

    // Scrollable body container (contains skeleton and form)
    const dialogBody = createElement('div', { className: 'dialog-body-scroll' }, [
      skeletonContent,
      realFormContent,
    ]);

    // Dialog structure: Fixed header + Scrollable body
    const dialogContent = createElement('div', { className: 'dialog-content dialog-wide' }, [
      createElement('div', { className: 'dialog-header-fixed' }, [
        createElement('h2', { className: 'dialog-title' }, [dialogTitle]),
      ]),
      dialogBody,
    ]);

    // Add scroll listener for header shadow effect
    dialogBody.addEventListener('scroll', () => {
      const header = dialogContent.querySelector('.dialog-header-fixed');
      if (dialogBody.scrollTop > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });

    overlay.appendChild(dialogContent);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.#handleCancel();
      }
    });

    return overlay;
  }

  /**
   * Render skeleton loading state
   */
  #renderSkeleton() {
    const skeletonForm = createElement('div', { className: 'dialog-form' }, [
      // Customer name skeleton
      createElement('div', { className: 'skeleton-form-col' }, [
        createElement('div', { className: 'skeleton skeleton-text-sm' }),
        createElement('div', { className: 'skeleton skeleton-input' }),
      ]),

      // Address row skeleton
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

      // City row skeleton
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

      // Selection row skeleton
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

      // Contract & amount row skeleton
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

    const skeletonContainer = createElement('div', {
      className: 'dialog-skeleton-container',
      style: 'opacity: 1; transition: opacity 0.3s ease;'
    }, [
      skeletonForm,
      skeletonActions,
    ]);

    return skeletonContainer;
  }

  /**
   * Render real form (hidden initially)
   */
  #renderRealForm() {
    Logger.log('🎨 Rendering real form...');

    // Date field with today's date as default
    const today = new Date().toISOString().split('T')[0];
    this.#dateInput = new Input({
      label: 'Datum',
      type: 'date',
      value: today,
      required: true,
    });

    // Customer Name
    this.#customerNameInput = new Input({
      label: 'Kundenname',
      placeholder: 'Max Mustermann',
      required: true,
    });

    Logger.log('✓ Input fields created:', {
      dateInput: !!this.#dateInput,
      customerNameInput: !!this.#customerNameInput,
    });

    // Address fields
    this.#streetInput = new Input({
      label: 'Strasse',
      placeholder: 'Musterstrasse',
    });

    this.#houseNumberInput = new Input({
      label: 'Hausnr.',
      placeholder: '123',
    });

    this.#postalCodeInput = new Input({
      label: 'PLZ',
      placeholder: '12345',
    });

    this.#cityInput = new Input({
      label: 'Stadt',
      placeholder: 'Musterstadt',
    });

    // Category select (will be populated dynamically)
    this.#categorySelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onCategoryChange(e.target.value),
    }, [createElement('option', {}, ['Kategorien werden geladen...'])]);

    // Product select (will be populated dynamically)
    this.#productSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onProductChange(e.target.value),
    }, [createElement('option', {}, ['Produkte werden geladen...'])]);

    // Provider select (will be populated dynamically)
    this.#providerSelect = createElement('select', {
      className: 'input-field',
    }, [createElement('option', {}, ['Produktgeber werden geladen...'])]);

    // Property address input (for real estate categories)
    this.#propertyAddressInput = new Input({
      label: 'Objektadresse',
      placeholder: 'Adresse des Objekts',
    });

    // Contract number
    this.#contractNumberInput = new Input({
      label: 'Vertragsnummer',
      placeholder: 'ABC-123456',
      required: true,
    });

    // Provision amount
    this.#provisionAmountInput = new Input({
      label: 'Umsatz Netto (EUR)',
      placeholder: '0.00',
      type: 'number',
      required: true,
    });

    // VAT Checkbox
    this.#vatCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'revenue-vat-checkbox',
      className: 'vat-checkbox-input',
      onchange: (e) => this.#onVATChange(e.target.checked),
    });

    // Notes
    this.#notesInput = new Input({
      label: 'Notizen',
      placeholder: 'Optionale Notizen...',
    });

    // Tip Provider (Tippgeber) select - will be populated dynamically
    this.#tipProviderSelect = createElement('select', {
      className: 'input-field',
      onchange: (e) => this.#onTipProviderChange(e.target.value),
    }, [
      createElement('option', { value: '' }, ['Kein Tippgeber']),
      createElement('option', {}, ['Mitarbeiter werden geladen...'])
    ]);

    // Tip Provider Provision input
    this.#tipProviderProvisionInput = new Input({
      label: 'Tippgeber-Provision (%)',
      type: 'number',
      placeholder: '0',
      min: '0',
      max: '100',
      step: '0.1',
    });

    // Disable tip provider provision input initially
    this.#tipProviderProvisionInput.setDisabled(true);

    // Form layout
    const addressRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-3' }, [
        this.#streetInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#houseNumberInput.element,
      ]),
    ]);

    const cityRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#postalCodeInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-2' }, [
        this.#cityInput.element,
      ]),
    ]);

    const categoryWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Kategorie']),
      this.#categorySelect,
    ]);

    const productWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Produkt']),
      this.#productSelect,
    ]);

    const providerWrapper = createElement('div', {
      className: 'input-wrapper provider-wrapper',
    }, [
      createElement('label', { className: 'input-label' }, ['Produktgeber']),
      this.#providerSelect,
    ]);

    const propertyAddressWrapper = createElement('div', {
      className: 'input-wrapper property-address-wrapper hidden',
    }, [
      this.#propertyAddressInput.element,
    ]);

    const selectionRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [categoryWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [productWrapper]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        providerWrapper,
        propertyAddressWrapper,
      ]),
    ]);

    const dateAndContractRow = createElement('div', { className: 'dialog-form-row' }, [
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#dateInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#contractNumberInput.element,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#provisionAmountInput.element,
      ]),
    ]);

    // VAT checkbox row
    const vatCheckboxWrapper = createElement('div', { className: 'vat-checkbox-wrapper' }, [
      createElement('label', { className: 'vat-checkbox-label', htmlFor: 'revenue-vat-checkbox' }, [
        this.#vatCheckbox,
        createElement('span', { className: 'vat-checkbox-text' }, [
          'Umsatzsteuer (19%) - Bruttowert wird berechnet und angezeigt',
        ]),
      ]),
    ]);

    // Tip Provider row (Tippgeber)
    const tipProviderWrapper = createElement('div', { className: 'input-wrapper' }, [
      createElement('label', { className: 'input-label' }, ['Tippgeber (optional)']),
      this.#tipProviderSelect,
    ]);

    const tipProviderRow = createElement('div', { className: 'dialog-form-row tip-provider-row' }, [
      createElement('div', { className: 'dialog-form-col-2' }, [
        tipProviderWrapper,
      ]),
      createElement('div', { className: 'dialog-form-col-1' }, [
        this.#tipProviderProvisionInput.element,
      ]),
    ]);

    // Actions
    const cancelBtn = new Button({
      label: 'Abbrechen',
      variant: 'ghost',
      onClick: () => this.#handleCancel(),
    });

    const saveBtn = new Button({
      label: 'Speichern',
      variant: 'primary',
      onClick: () => this.#handleSave(),
    });

    const actions = createElement('div', { className: 'dialog-actions' }, [
      cancelBtn.element,
      saveBtn.element,
    ]);

    const formContainer = createElement('div', {
      className: 'dialog-form-container',
      style: 'display: none; opacity: 0; transition: opacity 0.4s ease;'
    }, [
      createElement('div', { className: 'dialog-form' }, [
        this.#customerNameInput.element,
        addressRow,
        cityRow,
        selectionRow,
        dateAndContractRow,
        vatCheckboxWrapper,
        tipProviderRow,
        this.#notesInput.element,
      ]),
      actions,
    ]);

    Logger.log('✓ Form container created with', formContainer.children.length, 'children');

    return formContainer;
  }

  async #loadCategories() {
    if (!this.#revenueService) {
      // Fallback to hardcoded categories
      this.#categories = RevenueCategory.allCategories;
      this.#populateCategorySelect();
      return;
    }

    try {
      this.#categories = await this.#revenueService.getAvailableCategories();
      this.#populateCategorySelect();
    } catch (error) {
      Logger.error('Failed to load categories:', error);
      // Fallback to hardcoded
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
      Logger.warn('HierarchyService not available - tip provider dropdown will be empty');
      this.#allEmployees = [];
      this.#populateTipProviderSelect();
      return;
    }

    try {
      // Load all trees (should be only one: the main organization tree)
      const allTrees = await this.#hierarchyService.getAllTrees();

      if (allTrees.length === 0) {
        Logger.warn('No trees found - tip provider dropdown will be empty');
        this.#allEmployees = [];
        this.#populateTipProviderSelect();
        return;
      }

      const tree = allTrees[0]; // Get first tree
      const allNodes = tree.getAllNodes();

      // Filter out root node and current employee
      let employees = allNodes
        .filter(node =>
          !node.isRoot &&
          node.id !== this.#props.employeeId
        );

      // Add hardcoded Geschäftsführer (not in tree)
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

      // Sort alphabetically
      this.#allEmployees = employees.sort((a, b) => a.name.localeCompare(b.name));

      this.#populateTipProviderSelect();
    } catch (error) {
      Logger.error('Failed to load employees for tip provider:', error);
      this.#allEmployees = [];
      this.#populateTipProviderSelect();
    }
  }

  #populateTipProviderSelect() {
    this.#tipProviderSelect.innerHTML = '';

    // Add "No tip provider" option
    const noneOption = createElement('option', { value: '' }, ['Kein Tippgeber']);
    this.#tipProviderSelect.appendChild(noneOption);

    // Add all employees
    this.#allEmployees.forEach((employee) => {
      const option = createElement('option', { value: employee.id }, [employee.name]);
      this.#tipProviderSelect.appendChild(option);
    });
  }

  #onTipProviderChange(tipProviderId) {
    this.#formData.tipProvider = tipProviderId || null;

    // Enable/disable provision input based on selection
    if (tipProviderId) {
      this.#tipProviderProvisionInput.setDisabled(false);
    } else {
      this.#tipProviderProvisionInput.setValue('');
      this.#tipProviderProvisionInput.setDisabled(true);
    }
  }

  async #getOwnerProvision(categoryType) {
    if (!this.#hierarchyService) {
      return 100; // Fallback if no hierarchy service
    }

    try {
      // Get the tree and owner node
      const allTrees = await this.#hierarchyService.getAllTrees();
      if (allTrees.length === 0) {
        return 100;
      }

      const tree = allTrees[0];
      const owner = tree.getNode(this.#props.employeeId);

      if (!owner) {
        return 100;
      }

      // Get provision based on category type
      const provisionType = this.#currentCategoryData?.provisionType?.type ||
        this.#currentCategoryData?.provisionType ||
        this.#inferProvisionType(categoryType);

      switch (provisionType) {
        case 'bank':
          return owner.bankProvision || 0;
        case 'insurance':
          return owner.insuranceProvision || 0;
        case 'realEstate':
          return owner.realEstateProvision || 0;
        default:
          return 0;
      }
    } catch (error) {
      Logger.error('Failed to get owner provision:', error);
      return 100; // Fallback
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

    // Load category data to check requiresPropertyAddress
    if (this.#revenueService) {
      try {
        this.#currentCategoryData = await this.#revenueService.getCategoryByType(categoryType);
      } catch (error) {
        Logger.warn('Failed to load category data:', error);
        this.#currentCategoryData = null;
      }
    }

    await this.#updateProductOptions(categoryType);
    // Providers are loaded automatically in #updateProductOptions() for first product

    // Toggle property address field visibility
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

    // Set default VAT checkbox based on category (only in create mode)
    if (!this.#isEditMode) {
      const shouldHaveVAT = this.#shouldCategoryHaveVATByDefault(categoryType);
      this.#vatCheckbox.checked = shouldHaveVAT;
    }
  }

  #shouldCategoryHaveVATByDefault(categoryType) {
    // Real estate categories typically have VAT
    const vatCategories = ['realEstate', 'propertyManagement'];
    return vatCategories.includes(categoryType);
  }

  #onVATChange(isChecked) {
    // Visual feedback could be added here if needed
    // For now, just store the state (will be read in #handleSave)
    Logger.log('VAT checkbox changed:', isChecked);
  }

  async #updateProductOptions(categoryType) {
    let products = [];

    // Try to load from catalog via RevenueService
    if (this.#revenueService) {
      try {
        products = await this.#revenueService.getProductsForCategory(categoryType);
      } catch (error) {
        Logger.warn('Failed to load products from catalog, using fallback:', error);
        products = Product.getProductsForCategory(categoryType);
      }
    } else {
      // Fallback to hardcoded
      products = Product.getProductsForCategory(categoryType);
    }

    this.#productSelect.innerHTML = '';

    products.forEach((product) => {
      const name = product.name || product;
      const productId = product.id || name;
      const option = createElement('option', { value: productId }, [name]);
      option.dataset.productName = name;
      option.dataset.productId = productId;
      this.#productSelect.appendChild(option);
    });

    if (products.length > 0) {
      this.#formData.product = products[0];
      // Update providers for first product
      if (products[0].id) {
        await this.#updateProviderOptionsForProduct(products[0].id);
      } else {
        await this.#updateProviderOptions(categoryType);
      }
    }
  }

  async #onProductChange(productValue) {
    // Find selected option
    const selectedOption = Array.from(this.#productSelect.options).find(opt => opt.value === productValue);
    const productId = selectedOption?.dataset.productId;
    const productName = selectedOption?.dataset.productName || productValue;

    this.#formData.product = { id: productId, name: productName };

    // Update providers for this specific product
    if (productId && productId !== productName) {
      await this.#updateProviderOptionsForProduct(productId);
    } else {
      await this.#updateProviderOptions(this.#formData.category);
    }
  }

  async #updateProviderOptionsForProduct(productId) {
    let providers = [];

    // Load providers for specific product
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

    // Try to load from catalog via RevenueService
    if (this.#revenueService) {
      try {
        providers = await this.#revenueService.getProvidersForCategory(categoryType);
      } catch (error) {
        Logger.warn('Failed to load providers from catalog, using fallback:', error);
        providers = ProductProvider.getProvidersForCategory(categoryType);
      }
    } else {
      // Fallback to hardcoded
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
    const provisionAmount = parseFloat(this.#provisionAmountInput.value) || 0;

    // Validation
    if (!customerName) {
      this.#customerNameInput.setError('Kundenname ist erforderlich');
      return;
    }

    if (!contractNumber) {
      this.#contractNumberInput.setError('Vertragsnummer ist erforderlich');
      return;
    }

    if (provisionAmount <= 0) {
      this.#provisionAmountInput.setError('Umsatz muss groesser als 0 sein');
      return;
    }

    const categoryType = this.#categorySelect.value;

    // Extract product ID and name from selected option
    const productValue = this.#productSelect.value;
    const selectedProductOption = this.#productSelect.querySelector('option:checked');
    const productId = selectedProductOption?.dataset.productId || productValue;
    const productName = selectedProductOption?.dataset.productName || productValue;

    const providerName = this.#providerSelect.value;
    const propertyAddress = this.#propertyAddressInput.value.trim();
    const entryDate = this.#dateInput.value || new Date().toISOString().split('T')[0];

    // Get tip provider data
    const tipProviderId = this.#tipProviderSelect.value || null;
    const tipProviderProvision = tipProviderId
      ? parseFloat(this.#tipProviderProvisionInput.value) || 0
      : null;

    // Validation: Tip provider provision must be set if tip provider is selected
    if (tipProviderId && (tipProviderProvision === null || tipProviderProvision <= 0)) {
      this.#tipProviderProvisionInput.setError('Tippgeber-Provision ist erforderlich');
      return;
    }

    // Validation: Tip provider provision cannot exceed 100%
    if (tipProviderProvision > 100) {
      this.#tipProviderProvisionInput.setError('Tippgeber-Provision darf nicht über 100% sein');
      return;
    }

    // Validation: Tip provider provision cannot exceed owner's provision
    if (tipProviderId && tipProviderProvision > 0) {
      const ownerProvision = await this.#getOwnerProvision(categoryType);
      if (tipProviderProvision > ownerProvision) {
        this.#tipProviderProvisionInput.setError(
          `Tippgeber-Provision darf nicht höher als Ihre Provision (${ownerProvision}%) sein`
        );
        return;
      }
    }

    // Find tip provider name
    const tipProviderName = tipProviderId
      ? this.#allEmployees.find(e => e.id === tipProviderId)?.name || null
      : null;

    // Get provisionType from category data (determines which HierarchyNode provision field to use)
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
      provisionType: provisionType,
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
      // VAT (Umsatzsteuer)
      hasVAT: this.#vatCheckbox.checked,
      vatRate: 19, // Fixed German VAT rate
      // Tip Provider (Tippgeber)
      tipProviderId,
      tipProviderName,
      tipProviderProvisionPercentage: tipProviderProvision,
    };

    // Include entry ID if editing
    if (this.#isEditMode && this.#entry) {
      data.id = this.#entry.id;
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
    // Append to DOM first (shows skeleton)
    document.body.appendChild(this.#element);

    // Then load data and transition to real form
    await this.#initializeForm();

    // Focus first field after data is loaded
    setTimeout(() => {
      if (this.#customerNameInput && this.#customerNameInput.focus) {
        this.#customerNameInput.focus();
      }
    }, 400); // Wait for fade-in animation
  }

  remove() {
    this.#element.remove();
  }
}
