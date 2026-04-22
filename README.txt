Vibe Room frontend refactor
===========================

What I changed:
- Split the original giant index.html into:
  - index.html
  - styles/main.css
  - js/config.js
  - js/app.js

How to use:
1. Replace your current frontend files with these.
2. Keep your existing models folder in place.
3. If you already have extra assets, keep them too.
4. Serve the folder with a static server.

Notes:
- This is a structural refactor of the frontend only.
- Your backend/server repo does not need changes for this split.
- app.js still contains a lot of logic, but now the page structure, styles, and config are separated.
- The next clean step after this would be splitting app.js into scene.js, player.js, network.js, ui.js, and games/*.js.
