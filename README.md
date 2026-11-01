<div align="center">
  <img src="assets/brand/greeta-banner.svg" alt="GREETA — Pixel-inspired Linux Login Experience" width="100%">

  <h1>GREETA</h1>
  <p><strong>A pixel-inspired login experience for Linux Mint.</strong></p>

  <p>
    <a href="https://github.com/ejamato/GREETA/releases/latest">Latest release</a>
    ·
    <a href="https://ejamato.github.io/GREETA/demo/">Visual demo</a>
    ·
    <a href="integration/lightdm-webkit-greeter/README.md">LightDM guide</a>
    ·
    <a href="integration/cinnamon-screensaver/README.md">Screensaver guide</a>
  </p>

  <p><code>v1.0.0</code> · <code>Linux Mint</code> · <code>LightDM</code> · <code>Cinnamon</code></p>
</div>

> **▣ VISUAL PREVIEW**
>
> The online demo is for appearance and interaction only. It does not authenticate users or execute suspend, reboot, or shutdown actions.

## ◈ Project

GREETA (EJA Login) is a pixel-inspired Linux login interface with a responsive
layout, bundled Pixelify Sans typography, interactive Pixel Mates, and a
customizable ambient backdrop. The LightDM integration keeps authentication
inside LightDM; the Cinnamon Screensaver integration retains Cinnamon's native
unlock flow.

The interface combines pixel-art characters and controls with smooth,
non-pixel weather effects. Wallpaper, time-of-day, accent color, particle
density, wind, and selected Pixel Mates can be customized.

## ▣ Features

| Area | Included |
| --- | --- |
| Login | LightDM WebKit greeter, read-only selected username, native PAM authentication |
| Look and feel | Responsive pixel-inspired interface, bundled Pixelify Sans, local wallpapers |
| Ambience | Rain, autumn, snow, and mixed weather; daypart and color controls |
| Pixel Mates | Interactive characters, behavior controls, and saved preferences |
| System actions | Suspend, reboot, and shutdown through LightDM |
| Cinnamon | Optional visual screensaver integration with native unlock and media controls |
| Privacy | No remote asset dependency in the login interface; browser preferences are stored locally |

## ▶ Demo

**[Open the visual demo](https://ejamato.github.io/GREETA/demo/)**

The demo is a static GitHub Pages preview. Login, session start, and power
actions are unavailable outside a real LightDM greeter.
GitHub Pages publishes the `main` branch directly; the repository's Pages
source is configured to use the root of that branch.

To run the interface locally:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. This is a visual preview, not a Linux login
screen; authentication and power actions require the LightDM integration.

## ⌘ Requirements

- Linux Mint with Cinnamon and LightDM
- Python 3, GTK 3, LightDM introspection, and WebKitGTK 4.1 for the greeter
- A graphical session for preview and smoke tests
- `pkexec` for the system-level greeter installer

The screensaver integration targets Cinnamon Screensaver 6.4. Its package
builder downloads and verifies the matching upstream source and binary
packages; review the integration guide before building or installing it.

## ◈ Install the LightDM greeter

Preview first while logged in to a graphical desktop:

```sh
/usr/bin/python3 integration/lightdm-webkit-greeter/greeter.py --preview
```

Run the safe login smoke test:

```sh
/usr/bin/python3 integration/lightdm-webkit-greeter/greeter.py --preview --smoke-test
```

Install EJA for the **next LightDM start**:

```sh
pkexec "$PWD/integration/lightdm-webkit-greeter/install.sh"
```

The installer does not restart LightDM. Save your work before logging out or
restarting. If you need to roll back, use a text console and run:

```sh
pkexec "$HOME/path/to/GREETA/integration/lightdm-webkit-greeter/uninstall.sh"
```

The original greeter package remains installed. See the
[LightDM integration guide](integration/lightdm-webkit-greeter/README.md) for
details and recovery steps.

## ◇ Cinnamon Screensaver

The optional screensaver integration changes the visual theme while preserving
Cinnamon's native unlock dialog and authentication. It is separate from the
LightDM greeter and is not installed by the LightDM installer.

Read the [Cinnamon Screensaver guide](integration/cinnamon-screensaver/README.md)
before installing. The guide covers the user-local theme installer, package
build, and rollback procedure.

## ▤ Repository layout

```text
GREETA/
├── assets/
│   ├── brand/       # Pixel-style project banner
│   ├── css/         # Interface and animation styles
│   ├── fonts/       # Pixelify Sans and its OFL license
│   ├── images/      # Bundled wallpapers
│   └── js/          # Login, ambience, and Pixel Mates logic
├── config/          # Theme metadata
├── demo/            # Static, non-authenticating visual preview
├── integration/
│   ├── cinnamon-screensaver/
│   └── lightdm-webkit-greeter/
├── screensaver/     # Cinnamon Screensaver web assets
├── CHANGELOG.md
├── LICENSE
├── VERSION
└── index.html
```

Generated Cinnamon packages and local deployment output are excluded from the
repository.

## ▣ Version and release

The current release is **1.0.0**. The project version is recorded in
[`VERSION`](VERSION) and [`config/theme.json`](config/theme.json).

See the [changelog](CHANGELOG.md) for release notes. Tagged releases use the
`v` prefix, for example `v1.0.0`.

## ⚖ License and assets

Project code and documentation are provided under the [MIT License](LICENSE).
Pixelify Sans is distributed separately under the
[SIL Open Font License 1.1](assets/fonts/OFL.txt).

Wallpaper images are included with permission from their rights holders and
are not relicensed by the MIT license. Check individual asset terms before
reusing those files outside this project.

## ▣ Credits

- Pixelify Sans by the Pixelify Sans Project Authors.
- Linux Mint, LightDM, Cinnamon, GTK, and WebKitGTK provide the desktop and
  authentication components used by the integrations.
