const { pathToRegexp } = require("path-to-regexp");
try {
  console.log('Testing /api/(.*)');
  pathToRegexp('/api/(.*)');
  console.log('Success /api/(.*)');
} catch (e) {
  console.error('Failed /api/(.*)', e.message);
}

try {
  console.log('Testing /api/{*splat}');
  pathToRegexp('/api/{*splat}');
  console.log('Success /api/{*splat}');
} catch (e) {
  console.error('Failed /api/{*splat}', e.message);
}

try {
  console.log('Testing /api*');
  pathToRegexp('/api*');
  console.log('Success /api*');
} catch (e) {
  console.error('Failed /api*', e.message);
}
