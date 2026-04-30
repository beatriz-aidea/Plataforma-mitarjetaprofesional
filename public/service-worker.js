self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('cloudfunctions.net')) return;
});
