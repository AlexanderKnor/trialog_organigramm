/**
 * Atom: playGlyph
 * Filled play triangle. The Icon atom draws stroke-based outlines, a play
 * affordance needs a solid shape, so this one is built by hand. Shared by the
 * grid card and the player poster so both read as the same affordance.
 */

export function createPlayGlyph(size = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '6,4 20,12 6,20');
  polygon.setAttribute('fill', 'currentColor');

  svg.appendChild(polygon);
  return svg;
}
