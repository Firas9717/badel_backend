/**
 * Middleware to parse JSON strings in multipart/form-data request bodies.
 * Must run BEFORE express-validator middleware so nested fields are accessible.
 */
function parseMultipartJson(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      const val = req.body[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
          try {
            req.body[key] = JSON.parse(val);
          } catch (e) {
            // keep original string if parse fails
          }
        }
      }
    }
  }
  next();
}

module.exports = { parseMultipartJson };
