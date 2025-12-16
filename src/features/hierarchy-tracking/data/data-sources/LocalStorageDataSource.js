/**
 * Data Source: LocalStorageDataSource
 * Handles persistence to browser localStorage
 */

import { APP_CONFIG } from '../../../../core/config/index.js';

export class LocalStorageDataSource {
  #prefix;

  constructor() {
    this.#prefix = APP_CONFIG.storage.prefix;
  }

  #getKey(key) {
    return `${this.#prefix}${key}`;
  }

  save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.#getKey(key), serialized);
      return true;
    } catch (error) {
      console.error('LocalStorage save error:', error);
      return false;
    }
  }

  load(key) {
    try {
      const serialized = localStorage.getItem(this.#getKey(key));
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized);
    } catch (error) {
      console.error('LocalStorage load error:', error);
      return null;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.#getKey(key));
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }

  exists(key) {
    return localStorage.getItem(this.#getKey(key)) !== null;
  }

  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.#prefix)) {
        keys.push(key.slice(this.#prefix.length));
      }
    }
    return keys;
  }

  clear() {
    const keys = this.getAllKeys();
    keys.forEach((key) => this.remove(key));
  }

  getStorageSize() {
    let total = 0;
    for (const key of this.getAllKeys()) {
      const item = localStorage.getItem(this.#getKey(key));
      if (item) {
        total += item.length * 2;
      }
    }
    return total;
  }
}
