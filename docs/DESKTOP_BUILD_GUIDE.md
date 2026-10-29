# RestaurantsOS Desktop & Multi-Platform Build Guide

RestaurantsOS is engineered as a hybrid web and native desktop application:
1. **Web Application**: Hosted on Vercel / Cloud for customer mobile QR code ordering, digital menus, and live waiter tracking.
2. **Desktop Application (Windows & macOS)**: Packaged via Electron for cashiers, restaurant managers, bill settlement, and kitchen displays with direct thermal receipt printing.

---

## ⚡ Automated CI/CD GitHub Builds (On Every Commit)

Every time you push commits or pull requests to `main` or `development`, the GitHub Actions workflow [`.github/workflows/build-and-release.yml`](../.github/workflows/build-and-release.yml) automatically triggers:

1. **Unit Tests & Web Verification**: Runs Vitest test suite and validates Vite web build.
2. **Windows Runner (`windows-latest`)**:
   - Generates Windows NSIS Setup (`RestaurantsOS Setup 2.5.0.exe`)
   - Generates Windows Portable (`RestaurantsOS 2.5.0.exe`)
   - Uploads to GitHub Actions Artifacts (`RestaurantsOS-Windows-Installers`)
3. **macOS Runner (`macos-latest`)**:
   - Generates macOS Apple Silicon & Intel DMG (`.dmg`)
   - Generates macOS ZIP packages (`.zip`)
   - Uploads to GitHub Actions Artifacts (`RestaurantsOS-macOS-Installers`)

### How to Download Built Binaries from GitHub:
1. Open your repository on GitHub.
2. Click on the **Actions** tab.
3. Select the latest workflow run.
4. Scroll down to the **Artifacts** section at the bottom.
5. Click **RestaurantsOS-Windows-Installers** or **RestaurantsOS-macOS-Installers** to download the ready-to-use binaries!

---

## 🏷️ Publishing an Official GitHub Release

When you are ready to publish a new public release with download links:

### Option A: Via Git Tag (Recommended)
```bash
git tag v2.5.0
git push origin v2.5.0
```
GitHub Actions will automatically compile the Windows `.exe` and macOS `.dmg` and publish a new GitHub Release with all installer files attached.

### Option B: Via GitHub Web Interface
1. Go to **Actions** → **Build & Package (Web, Windows & macOS)**.
2. Click **Run workflow**.
3. Check the box **"Publish as GitHub Release?"** and click **Run**.

---

## 💻 Local Desktop Development & Build Commands

If you wish to test or package the desktop binaries on your local computer:

### 1. Run Desktop App in Development Mode (Hot Reload)
```bash
npm run electron:dev
```
Starts the Vite server and launches the native Electron application window.

### 2. Build Native Packages Locally
```bash
# Build Windows binaries (.exe installer & portable exe)
npm run electron:dist:win

# Build macOS binaries (.dmg installer & zip)
npm run electron:dist:mac

# Build both Windows and macOS binaries
npm run electron:dist
```
All outputs are created in the `release/` directory.

---

## 🖨️ Native Thermal Printing (Windows & Mac)

In the desktop application, thermal receipt and KOT printing works **silently and directly** to your POS printers (USB, Network, or Bluetooth) without browser dialog popups:
- Handled through [`electron/main.cjs`](../electron/main.cjs) and [`src/services/electronService.ts`](../src/services/electronService.ts).
- Web browsers continue to use standard Web Printing / Bluetooth ESC/POS as before.

