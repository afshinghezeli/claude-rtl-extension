# Releasing

Releases are automated by [`.github/workflows/release.yml`](../.github/workflows/release.yml).
`package.json` is the single source of truth for the version.

## Steps

1. Make sure `main` is green.
2. Move the **Unreleased** entries in `CHANGELOG.md` under a new version heading
   and update the compare links at the bottom.
3. Bump the version and create the tag:

   ```bash
   npm version minor -m "chore(release): v%s"   # or patch / major
   git push --follow-tags
   ```

4. The release workflow runs the checks, builds `claude-rtl-<version>.zip`,
   verifies that the tag matches `package.json`, and publishes a GitHub
   Release with the ZIP attached and generated release notes.

## Chrome Web Store

1. Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time fee).
2. Upload the ZIP from the GitHub Release.
3. Store listing:
   - Screenshots: 1280×800 or 640×400.
   - Privacy policy URL: `https://github.com/afshinghezeli/claude-rtl-extension/blob/main/PRIVACY.md`.
   - Single purpose: "Adds right-to-left text direction and font customization to claude.ai."
   - Permission justification for `storage`: "Saves the user's display preferences."
   - Data usage: declare that no user data is collected.
4. Submit for review.

The same ZIP can be submitted to [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge).
