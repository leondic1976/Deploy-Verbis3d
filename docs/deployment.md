# Deployment

GitHub Pages deploys the generated site from `site-dist/`.

1. In repository settings, choose **GitHub Actions** as the Pages source.
2. Ensure workflow permissions allow Pages and OIDC.
3. Push to `main` or dispatch the `pages.yml` workflow.
4. The workflow installs dependencies, builds the library and API docs, builds the static site,
   validates local links, uploads a Pages artifact, and deploys it.
5. After deployment, the workflow runs the Chromium E2E suite against the emitted Pages URL.

Expected URL: `https://leondic1976.github.io/Deploy-Verbis3d/`.

Private-repository Pages availability depends on the GitHub plan and repository settings. A
workflow success is not treated as proof of availability; the final deployment check must request
the live URL and verify CSS, JavaScript, canvas and navigation.
