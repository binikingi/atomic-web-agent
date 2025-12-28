// Create a DOM-like structure using basic parsing
export function minimizeSnapshot(htmlContent: string) {
  let result = htmlContent;

  // 1. Remove inline styles but keep data- attributes
  result = result.replace(/\s+style="[^"]*"/g, "");

  // 2. Simplify SVG elements - replace entire SVG with a marker
  result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, "<svg/>");

  // 3. Remove multiple consecutive spaces
  result = result.replace(/\s{2,}/g, " ");

  // 4. Remove newlines between tags
  result = result.replace(/>\s+</g, "><");

  // 5. Remove empty class attributes
  result = result.replace(/\s+class=""/g, "");

  // 6. Remove opacity, transform, and animation-delay attributes
  result = result.replace(/\s+opacity="[^"]*"/g, "");
  result = result.replace(/\s+transform="[^"]*"/g, "");
  result = result.replace(/\s+animation-delay="[^"]*"/g, "");

  // 9. Keep only essential data attributes, remove verbose ones
  result = result.replace(/\s+data-with-fill="[^"]*"/g, "");
  result = result.replace(/\s+data-with-stroke="[^"]*"/g, "");
  result = result.replace(/\s+font-size="[^"]*"/g, "");
  result = result.replace(/\s+viewBox="[^"]*"/g, "");
  result = result.replace(/\s+xmlns="[^"]*"/g, "");
  result = result.replace(/\s+width="[^"]*"/g, "");
  result = result.replace(/\s+height="[^"]*"/g, "");
  result = result.replace(/\s+fill="[^"]*"/g, "");
  result = result.replace(/\s+stroke="[^"]*"/g, "");
  result = result.replace(/\s+stroke-width="[^"]*"/g, "");
  result = result.replace(/\s+stroke-linecap="[^"]*"/g, "");
  result = result.replace(/\s+color="[^"]*"/g, "");

  // 10. Remove background-image URLs (can be large)
  result = result.replace(/background-image:\s*url\([^)]*\);?/g, "");

  // 11. Remove transition and opacity from style tags if any remain
  result = result.replace(/transition:\s*[^;]+;?/g, "");

  // 12. Collapse whitespace in text content
  result = result.replace(/>\s+([^<]+)\s+</g, (_, text: string) => {
    return ">" + text.trim() + "<";
  });

  // 13. Remove empty attributes
  result = result.replace(/\s+[a-z-]+=""\s*/g, " ");

  return result.trim();
}
