import "server-only";

/**
 * The one canonical endpoint snippet (issue #27). README, /llms.txt and the
 * SEO pages must carry this exact shape — placeholders only, no drift.
 */
export const CANONICAL_ENDPOINT_SNIPPET = `<form action="https://form-like.com/api/endpoint/YOUR_FORM_ID" method="POST">
  <input type="hidden" name="formlike_key" value="YOUR_ACCESS_KEY">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <button type="submit">Send</button>
</form>`;
