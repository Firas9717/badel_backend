try {
  const req = { body: undefined };
  const { password } = req.body;
} catch (e) {
  console.log('Error message with req.body:', e.message);
}

try {
  const req = { body: undefined };
  const { password } = req.body || {};
  console.log('Success with || {}');
} catch (e) {
  console.log('Error message with || {}:', e.message);
}
