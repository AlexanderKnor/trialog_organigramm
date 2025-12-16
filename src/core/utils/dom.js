/**
 * DOM Utility Functions
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'ellipse', 'g', 'defs', 'use', 'text', 'tspan', 'clipPath', 'mask',
  'linearGradient', 'radialGradient', 'stop', 'filter', 'feGaussianBlur',
]);

/**
 * Convert camelCase to kebab-case for SVG attributes
 */
const toKebabCase = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();

export const createElement = (tag, attributes = {}, children = []) => {
  const isSvg = SVG_TAGS.has(tag);
  const element = isSvg
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (key === 'className') {
      if (isSvg) {
        element.setAttribute('class', value);
      } else {
        element.className = value;
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (isSvg) {
      // Convert camelCase to kebab-case for SVG attributes
      const attrName = toKebabCase(key);
      element.setAttribute(attrName, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
};

export const clearElement = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

export const getElement = (selector) => document.querySelector(selector);

export const getAllElements = (selector) => document.querySelectorAll(selector);
