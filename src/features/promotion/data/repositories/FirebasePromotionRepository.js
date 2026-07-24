/**
 * Repository: FirebasePromotionRepository
 * Maps between promotion entities and their Firestore representation.
 */

import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository.js';
import { Campaign } from '../../domain/entities/Campaign.js';
import { PromoResource } from '../../domain/entities/PromoResource.js';

export class FirebasePromotionRepository extends IPromotionRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findAllCampaigns() {
    const data = await this.#dataSource.findAll(this.#dataSource.campaignsCollection);

    return data
      .map((item) => Campaign.fromJSON(item))
      .sort(
        (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, 'de')
      );
  }

  async findCampaignById(campaignId) {
    const data = await this.#dataSource.findById(
      this.#dataSource.campaignsCollection,
      campaignId
    );
    return data ? Campaign.fromJSON(data) : null;
  }

  async saveCampaign(campaign) {
    await this.#dataSource.save(this.#dataSource.campaignsCollection, campaign.toJSON());
    return campaign;
  }

  async deleteCampaign(campaignId) {
    await this.#dataSource.delete(this.#dataSource.campaignsCollection, campaignId);
  }

  async findAllResources() {
    const data = await this.#dataSource.findAll(this.#dataSource.resourcesCollection);

    return data
      .map((item) => PromoResource.fromJSON(item))
      .sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }

  async findResourceById(resourceId) {
    const data = await this.#dataSource.findById(
      this.#dataSource.resourcesCollection,
      resourceId
    );
    return data ? PromoResource.fromJSON(data) : null;
  }

  async saveResource(resource) {
    await this.#dataSource.save(this.#dataSource.resourcesCollection, resource.toJSON());
    return resource;
  }

  async deleteResource(resourceId) {
    await this.#dataSource.delete(this.#dataSource.resourcesCollection, resourceId);
  }
}
