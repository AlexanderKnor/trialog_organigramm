/**
 * Repository Implementation: LocalTrackingRepository
 * Implements ITrackingRepository using LocalStorage
 */

import { ITrackingRepository } from '../../domain/repositories/ITrackingRepository.js';
import { TrackingEvent } from '../../domain/entities/TrackingEvent.js';
import { APP_CONFIG } from '../../../../core/config/index.js';

const EVENTS_KEY = 'tracking_events';

export class LocalTrackingRepository extends ITrackingRepository {
  #dataSource;
  #maxEvents;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
    this.#maxEvents = APP_CONFIG.tracking.maxHistoryItems;
  }

  #getEvents() {
    const eventsJson = this.#dataSource.load(EVENTS_KEY) || [];
    return eventsJson.map((json) => TrackingEvent.fromJSON(json));
  }

  #saveEvents(events) {
    const limitedEvents = events.slice(-this.#maxEvents);
    const eventsJson = limitedEvents.map((e) => e.toJSON());
    this.#dataSource.save(EVENTS_KEY, eventsJson);
  }

  async save(event) {
    if (!(event instanceof TrackingEvent)) {
      throw new Error('Invalid event object');
    }

    const events = this.#getEvents();
    events.push(event);
    this.#saveEvents(events);

    return event;
  }

  async findByTreeId(treeId) {
    const events = this.#getEvents();
    return events.filter((e) => e.treeId === treeId);
  }

  async findByNodeId(nodeId) {
    const events = this.#getEvents();
    return events.filter((e) => e.nodeId === nodeId);
  }

  async findByType(eventType) {
    const events = this.#getEvents();
    return events.filter((e) => e.type === eventType);
  }

  async findByDateRange(startDate, endDate) {
    const events = this.#getEvents();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime >= start && eventTime <= end;
    });
  }

  async findRecent(limit = 10) {
    const events = this.#getEvents();
    return events.slice(-limit).reverse();
  }

  async deleteByTreeId(treeId) {
    const events = this.#getEvents();
    const filteredEvents = events.filter((e) => e.treeId !== treeId);
    this.#saveEvents(filteredEvents);
  }

  async clear() {
    this.#dataSource.remove(EVENTS_KEY);
  }
}
