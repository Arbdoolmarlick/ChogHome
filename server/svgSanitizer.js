// server/svgSanitizer.js
// Production-grade SVG Sanitizer using DOMPurify (replaces fragile regex parsing)
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize an SVG string to guarantee safety against XSS, script injection, and malicious payloads.
 * Strips all dangerous tags (<script>, <iframe>, <object>, <embed>, <foreignObject>),
 * inline event handlers (onload, onerror, onclick), and javascript: protocol URIs.
 *
 * @param {string} rawSvg The untrusted SVG markup
 * @returns {string} The safe sanitized SVG markup
 */
export function sanitizeSvg(rawSvg) {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  const clean = DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: [
      'svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line',
      'polygon', 'polyline', 'text', 'tspan', 'defs', 'clipPath',
      'linearGradient', 'radialGradient', 'stop', 'use', 'mask'
    ],
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'form', 'input',
      'link', 'meta', 'foreignObject', 'style'
    ],
    FORBID_ATTR: [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
      'action', 'formaction'
    ],
  });

  return clean;
}
