# Deployment checks

Before uploading this project to the server:

1. Run the production build locally and require it to succeed.
2. Verify every asset referenced by `index.html` exists in the build output.
3. Verify all generated JavaScript/CSS chunks exist; never patch minified build files by hand.
4. Verify the Hydro API and avatar URLs use the server-side same-origin proxy paths.
5. After deployment, verify the homepage, every asset's HTTP status and MIME type, API JSON response, avatar image response, logo, animations, and cache headers.
6. Missing `/assets/*` files must return `404`, never the SPA `index.html` fallback.
7. Deploy through a temporary directory, validate it, then atomically replace `/root/oj` while keeping a timestamped backup.

