/**
 * Domain Service: PromotionService
 * Orchestrates campaign and resource management. Write access is enforced by
 * firestore.rules, not here (see ArticleService for the reasoning).
 */

import { Campaign } from '../entities/Campaign.js';
import { PromoResource } from '../entities/PromoResource.js';
import { NotFoundError } from '../../../../core/errors/index.js';
import { Logger } from '../../../../core/utils/logger.js';

/** Local calendar date as YYYY-MM-DD — campaigns run in the office's timezone. */
const todayIso = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export class PromotionService {
  #promotionRepository;

  constructor(promotionRepository) {
    this.#promotionRepository = promotionRepository;
  }

  // ========================================
  // CAMPAIGNS
  // ========================================

  async getAllCampaigns() {
    return this.#promotionRepository.findAllCampaigns();
  }

  /** Splits campaigns by today's date: running now, starting later, over. */
  async getCampaignBoard() {
    const campaigns = await this.getAllCampaigns();
    const today = todayIso();

    return {
      active: campaigns.filter((campaign) => campaign.isActiveOn(today)),
      upcoming: campaigns.filter((campaign) => campaign.isUpcomingOn(today)),
      ended: campaigns.filter((campaign) => campaign.isEndedOn(today)),
      today,
    };
  }

  async getCampaignById(campaignId) {
    const campaign = await this.#promotionRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new NotFoundError('Campaign', campaignId);
    }

    return campaign;
  }

  async createCampaign(campaignData) {
    const campaign = new Campaign(campaignData);
    await this.#promotionRepository.saveCampaign(campaign);
    Logger.log(`✓ Campaign created: ${campaign.title}`);

    return campaign;
  }

  async updateCampaign(campaignId, updates) {
    const campaign = await this.getCampaignById(campaignId);
    const updated = campaign.withUpdates(updates);
    await this.#promotionRepository.saveCampaign(updated);
    Logger.log(`✓ Campaign updated: ${updated.title}`);

    return updated;
  }

  async deleteCampaign(campaignId) {
    await this.getCampaignById(campaignId);
    await this.#promotionRepository.deleteCampaign(campaignId);
    Logger.log(`✓ Campaign deleted: ${campaignId}`);
  }

  // ========================================
  // RESOURCES
  // ========================================

  async getAllResources() {
    return this.#promotionRepository.findAllResources();
  }

  async getResourceById(resourceId) {
    const resource = await this.#promotionRepository.findResourceById(resourceId);

    if (!resource) {
      throw new NotFoundError('PromoResource', resourceId);
    }

    return resource;
  }

  async createResource(resourceData) {
    const resource = new PromoResource(resourceData);
    await this.#promotionRepository.saveResource(resource);
    Logger.log(`✓ Promo resource created: ${resource.title}`);

    return resource;
  }

  async updateResource(resourceId, updates) {
    const resource = await this.getResourceById(resourceId);
    const updated = resource.withUpdates(updates);
    await this.#promotionRepository.saveResource(updated);
    Logger.log(`✓ Promo resource updated: ${updated.title}`);

    return updated;
  }

  async deleteResource(resourceId) {
    await this.getResourceById(resourceId);
    await this.#promotionRepository.deleteResource(resourceId);
    Logger.log(`✓ Promo resource deleted: ${resourceId}`);
  }
}
