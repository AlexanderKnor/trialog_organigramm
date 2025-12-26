/**
 * Repository: FirebaseCatalogRepository
 * Implements ICatalogRepository using Firestore
 */

import { ICatalogRepository } from '../../domain/repositories/ICatalogRepository.js';
import { CategoryDefinition } from '../../domain/entities/CategoryDefinition.js';
import { ProductDefinition } from '../../domain/entities/ProductDefinition.js';
import { ProviderDefinition } from '../../domain/entities/ProviderDefinition.js';

export class FirebaseCatalogRepository extends ICatalogRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async findAllCategories(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('category', includeInactive);
    return data.map((item) => CategoryDefinition.fromJSON(item));
  }

  async findCategoryByType(categoryType) {
    const docId = `category_${categoryType}`;
    const data = await this.#dataSource.findById(docId);
    return data ? CategoryDefinition.fromJSON(data) : null;
  }

  async saveCategory(category) {
    const data = category.toJSON();
    await this.#dataSource.save(data);
    return category;
  }

  async deleteCategory(categoryType) {
    const docId = `category_${categoryType}`;
    await this.#dataSource.delete(docId);
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async findAllProducts(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('product', includeInactive);
    return data.map((item) => ProductDefinition.fromJSON(item));
  }

  async findProductsByCategory(categoryType, includeInactive = false) {
    const data = await this.#dataSource.findByEntityTypeAndCategory(
      'product',
      categoryType,
      includeInactive
    );
    return data.map((item) => ProductDefinition.fromJSON(item));
  }

  async findProductById(productId) {
    const data = await this.#dataSource.findById(productId);
    return data ? ProductDefinition.fromJSON(data) : null;
  }

  async findProductByNameInCategory(categoryType, name, excludeId = null) {
    const products = await this.findProductsByCategory(categoryType, true);

    // Find product with matching name (case-insensitive)
    const found = products.find(p =>
      p.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      (excludeId === null || p.id !== excludeId)
    );

    return found || null;
  }

  async saveProduct(product) {
    const data = product.toJSON();
    await this.#dataSource.save(data);
    return product;
  }

  async deleteProduct(productId) {
    await this.#dataSource.delete(productId);
  }

  // ========================================
  // PROVIDER OPERATIONS
  // ========================================

  async findAllProviders(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType('provider', includeInactive);
    return data.map((item) => ProviderDefinition.fromJSON(item));
  }

  async findProvidersByProduct(productId, includeInactive = false) {
    const data = await this.#dataSource.findByEntityTypeAndProduct(
      'provider',
      productId,
      includeInactive
    );
    return data.map((item) => ProviderDefinition.fromJSON(item));
  }

  async findProvidersByCategoryViaProducts(categoryType, includeInactive = false) {
    // 1. Get all products in category
    const products = await this.findProductsByCategory(categoryType, includeInactive);

    // 2. Get providers for each product
    const providerArrays = await Promise.all(
      products.map(product => this.findProvidersByProduct(product.id, includeInactive))
    );

    // 3. Flatten and deduplicate by name
    const allProviders = providerArrays.flat();
    const uniqueProviders = new Map();
    for (const provider of allProviders) {
      if (!uniqueProviders.has(provider.name)) {
        uniqueProviders.set(provider.name, provider);
      }
    }

    return Array.from(uniqueProviders.values());
  }

  async findProviderById(providerId) {
    const data = await this.#dataSource.findById(providerId);
    return data ? ProviderDefinition.fromJSON(data) : null;
  }

  async findProviderByNameInProduct(productId, name, excludeId = null) {
    const providers = await this.findProvidersByProduct(productId, true);

    // Find provider with matching name (case-insensitive)
    const found = providers.find(p =>
      p.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      (excludeId === null || p.id !== excludeId)
    );

    return found || null;
  }

  async saveProvider(provider) {
    const data = provider.toJSON();
    await this.#dataSource.save(data);
    return provider;
  }

  async deleteProvider(providerId) {
    await this.#dataSource.delete(providerId);
  }

  // ========================================
  // BATCH OPERATIONS (for migration)
  // ========================================

  async batchSaveEntities(entities) {
    const dataArray = entities.map((entity) => entity.toJSON());
    await this.#dataSource.batchSave(dataArray);
  }

  // ========================================
  // REAL-TIME SUBSCRIPTION
  // ========================================

  subscribeToCatalog(callback) {
    return this.#dataSource.subscribe((snapshot) => {
      // Parse all entities and group by type
      const categories = [];
      const products = [];
      const providers = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.entityType === 'category') {
          categories.push(CategoryDefinition.fromJSON(data));
        } else if (data.entityType === 'product') {
          products.push(ProductDefinition.fromJSON(data));
        } else if (data.entityType === 'provider') {
          providers.push(ProviderDefinition.fromJSON(data));
        }
      });

      callback({ categories, products, providers });
    });
  }
}
