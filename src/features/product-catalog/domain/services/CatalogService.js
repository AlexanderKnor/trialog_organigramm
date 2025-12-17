/**
 * Domain Service: CatalogService
 * Orchestrates catalog management operations
 */

import { CategoryDefinition } from '../entities/CategoryDefinition.js';
import { ProductDefinition } from '../entities/ProductDefinition.js';
import { ProviderDefinition } from '../entities/ProviderDefinition.js';
import { ValidationError, NotFoundError } from '../../../../core/errors/index.js';

export class CatalogService {
  #catalogRepository;
  #revenueService;

  constructor(catalogRepository, revenueService = null) {
    this.#catalogRepository = catalogRepository;
    this.#revenueService = revenueService;
  }

  /**
   * Set RevenueService dependency (for resolving circular dependency)
   */
  setRevenueService(revenueService) {
    this.#revenueService = revenueService;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async createCategory(categoryData) {
    // Validate unique type
    const existing = await this.#catalogRepository.findCategoryByType(categoryData.type);
    if (existing) {
      throw new ValidationError(`Category with type '${categoryData.type}' already exists`, 'type');
    }

    const category = CategoryDefinition.create(
      categoryData.type,
      categoryData.displayName,
      categoryData.provisionType
    );

    if (categoryData.requiresPropertyAddress !== undefined) {
      category.updateRequiresPropertyAddress(categoryData.requiresPropertyAddress);
    }

    if (categoryData.order !== undefined) {
      category.updateOrder(categoryData.order);
    }

    await this.#catalogRepository.saveCategory(category);
    console.log(`✓ Category created: ${category.displayName} (${category.type})`);

    return category;
  }

  async updateCategory(categoryType, updates) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    if (updates.displayName !== undefined) {
      category.updateDisplayName(updates.displayName);
    }

    if (updates.provisionType !== undefined) {
      category.updateProvisionType(updates.provisionType);
    }

    if (updates.requiresPropertyAddress !== undefined) {
      category.updateRequiresPropertyAddress(updates.requiresPropertyAddress);
    }

    if (updates.order !== undefined) {
      category.updateOrder(updates.order);
    }

    await this.#catalogRepository.saveCategory(category);
    console.log(`✓ Category updated: ${category.displayName}`);

    return category;
  }

  async deleteCategory(categoryType) {
    // Check if used in products
    const products = await this.#catalogRepository.findProductsByCategory(categoryType, true);
    if (products.length > 0) {
      throw new ValidationError(
        `Cannot delete category '${categoryType}': ${products.length} product(s) still reference this category`,
        'categoryType'
      );
    }

    // Check if used in providers
    const providers = await this.#catalogRepository.findProvidersByCategory(categoryType, true);
    if (providers.length > 0) {
      throw new ValidationError(
        `Cannot delete category '${categoryType}': ${providers.length} provider(s) still reference this category`,
        'categoryType'
      );
    }

    // Check if used in revenue entries (if revenueService available)
    if (this.#revenueService) {
      const usageInfo = await this.#checkCategoryInUse(categoryType);
      if (usageInfo.inUse) {
        throw new ValidationError(
          `Cannot delete category '${categoryType}': ${usageInfo.revenueCount} revenue entry/entries still reference this category`,
          'categoryType'
        );
      }
    }

    await this.#catalogRepository.deleteCategory(categoryType);
    console.log(`✓ Category deleted: ${categoryType}`);
  }

  async deactivateCategory(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    category.deactivate();
    await this.#catalogRepository.saveCategory(category);
    console.log(`✓ Category deactivated: ${category.displayName}`);

    return category;
  }

  async activateCategory(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    category.activate();
    await this.#catalogRepository.saveCategory(category);
    console.log(`✓ Category activated: ${category.displayName}`);

    return category;
  }

  async getAllCategories(includeInactive = false) {
    return await this.#catalogRepository.findAllCategories(includeInactive);
  }

  async getCategoryByType(categoryType) {
    const category = await this.#catalogRepository.findCategoryByType(categoryType);
    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }
    return category;
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async createProduct(categoryType, productData) {
    // Validate category exists
    const category = await this.#catalogRepository.findCategoryByType(categoryType);
    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    const product = ProductDefinition.create(categoryType, productData.name);

    if (productData.order !== undefined) {
      product.updateOrder(productData.order);
    }

    await this.#catalogRepository.saveProduct(product);
    console.log(`✓ Product created: ${product.name} in category ${categoryType}`);

    return product;
  }

  async updateProduct(productId, updates) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    if (updates.name !== undefined) {
      product.updateName(updates.name);
    }

    if (updates.order !== undefined) {
      product.updateOrder(updates.order);
    }

    await this.#catalogRepository.saveProduct(product);
    console.log(`✓ Product updated: ${product.name}`);

    return product;
  }

  async deleteProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    // Check if used in revenue entries (if revenueService available)
    if (this.#revenueService) {
      const usageInfo = await this.#checkProductInUse(product.name, product.categoryType);
      if (usageInfo.inUse) {
        throw new ValidationError(
          `Cannot delete product '${product.name}': ${usageInfo.revenueCount} revenue entry/entries still reference this product`,
          'productId'
        );
      }
    }

    await this.#catalogRepository.deleteProduct(productId);
    console.log(`✓ Product deleted: ${product.name}`);
  }

  async deactivateProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    product.deactivate();
    await this.#catalogRepository.saveProduct(product);
    console.log(`✓ Product deactivated: ${product.name}`);

    return product;
  }

  async activateProduct(productId) {
    const product = await this.#catalogRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('ProductDefinition', productId);
    }

    product.activate();
    await this.#catalogRepository.saveProduct(product);
    console.log(`✓ Product activated: ${product.name}`);

    return product;
  }

  async getProductsByCategory(categoryType, includeInactive = false) {
    return await this.#catalogRepository.findProductsByCategory(categoryType, includeInactive);
  }

  async getAllProducts(includeInactive = false) {
    return await this.#catalogRepository.findAllProducts(includeInactive);
  }

  // ========================================
  // PROVIDER OPERATIONS
  // ========================================

  async createProvider(categoryType, providerData) {
    // Validate category exists
    const category = await this.#catalogRepository.findCategoryByType(categoryType);
    if (!category) {
      throw new NotFoundError('CategoryDefinition', categoryType);
    }

    const provider = ProviderDefinition.create(categoryType, providerData.name);

    if (providerData.order !== undefined) {
      provider.updateOrder(providerData.order);
    }

    await this.#catalogRepository.saveProvider(provider);
    console.log(`✓ Provider created: ${provider.name} in category ${categoryType}`);

    return provider;
  }

  async updateProvider(providerId, updates) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    if (updates.name !== undefined) {
      provider.updateName(updates.name);
    }

    if (updates.order !== undefined) {
      provider.updateOrder(updates.order);
    }

    await this.#catalogRepository.saveProvider(provider);
    console.log(`✓ Provider updated: ${provider.name}`);

    return provider;
  }

  async deleteProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    // Check if used in revenue entries (if revenueService available)
    if (this.#revenueService) {
      const usageInfo = await this.#checkProviderInUse(provider.name, provider.categoryType);
      if (usageInfo.inUse) {
        throw new ValidationError(
          `Cannot delete provider '${provider.name}': ${usageInfo.revenueCount} revenue entry/entries still reference this provider`,
          'providerId'
        );
      }
    }

    await this.#catalogRepository.deleteProvider(providerId);
    console.log(`✓ Provider deleted: ${provider.name}`);
  }

  async deactivateProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    provider.deactivate();
    await this.#catalogRepository.saveProvider(provider);
    console.log(`✓ Provider deactivated: ${provider.name}`);

    return provider;
  }

  async activateProvider(providerId) {
    const provider = await this.#catalogRepository.findProviderById(providerId);

    if (!provider) {
      throw new NotFoundError('ProviderDefinition', providerId);
    }

    provider.activate();
    await this.#catalogRepository.saveProvider(provider);
    console.log(`✓ Provider activated: ${provider.name}`);

    return provider;
  }

  async getProvidersByCategory(categoryType, includeInactive = false) {
    return await this.#catalogRepository.findProvidersByCategory(categoryType, includeInactive);
  }

  async getAllProviders(includeInactive = false) {
    return await this.#catalogRepository.findAllProviders(includeInactive);
  }

  // ========================================
  // VALIDATION HELPERS
  // ========================================

  async #checkCategoryInUse(categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search all revenue entries for this category
      const allEntries = await this.#revenueService.searchEntries({ category: categoryType });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      console.warn('Failed to check category usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  async #checkProductInUse(productName, categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search revenue entries with this product name and category
      const allEntries = await this.#revenueService.searchEntries({
        category: categoryType,
        product: productName,
      });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      console.warn('Failed to check product usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  async #checkProviderInUse(providerName, categoryType) {
    if (!this.#revenueService) {
      return { inUse: false, revenueCount: 0 };
    }

    try {
      // Search revenue entries with this provider name and category
      const allEntries = await this.#revenueService.searchEntries({
        category: categoryType,
        provider: providerName,
      });
      return {
        inUse: allEntries.length > 0,
        revenueCount: allEntries.length,
      };
    } catch (error) {
      console.warn('Failed to check provider usage:', error);
      return { inUse: false, revenueCount: 0 };
    }
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  subscribeToCatalogUpdates(callback) {
    return this.#catalogRepository.subscribeToCatalog(callback);
  }
}
