// scripts/test_svg_sanitizer.mjs
import { sanitizeSvg } from '../server/svgSanitizer.js';

const attacks = [
  { name: 'Direct script tag', svg: '<svg><script>alert(1)</script><circle r="10"/></svg>' },
  { name: 'Inline onload handler', svg: '<svg><rect onload="alert(2)" width="10" height="10"/></svg>' },
  { name: 'XHTML ForeignObject script injection', svg: '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(3)</script></body></foreignObject></svg>' },
  { name: 'Javascript protocol anchor', svg: '<svg><a href="javascript:alert(4)"><text>Click</text></a></svg>' },
  { name: 'Valid SVG Shape', svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#836EF9"/></svg>' }
];

console.log('🧪 Testing DOMPurify SVG Sanitizer against XSS attack vectors:\n');
let allPassed = true;

for (const t of attacks) {
  const clean = sanitizeSvg(t.svg);
  const containsScript = clean.toLowerCase().includes('script') || clean.toLowerCase().includes('alert') || clean.toLowerCase().includes('onload');
  const pass = t.name.includes('Valid') ? clean.includes('<circle') : !containsScript;

  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name}:`);
  console.log('   Input:  ', t.svg);
  console.log('   Output: ', clean);
  if (!pass) allPassed = false;
}

if (!allPassed) {
  console.error('\n❌ Some SVG security tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ ALL SVG SANITIZER SECURITY TESTS PASSED!');
  process.exit(0);
}
