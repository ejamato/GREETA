# EJA WebKit LightDM greeter

This greeter renders the EJA login page in WebKitGTK and bridges authentication,
session selection, and power actions to LightDM's native greeter API. Slick
Greeter remains installed and can be restored by removing the EJA override.

The app and theme are copied to root-owned paths before LightDM is configured.
The WebKit page is restricted to the installed local theme; LightDM remains
responsible for PAM authentication and starting the desktop session.
The WebKit window enters fullscreen after it is mapped and its child expands to
the detected monitor size. Once the login page finishes loading, the greeter
plays Mint's `system-ready.ogg` through PulseAudio/PipeWire; if that server is
not available before login, it falls back to the Mint login WAV through the
active seat's ALSA device.

The installer adds the LightDM account to the system's `render` and `video`
groups when available so WebKitGTK can access GPU devices. Without these
permissions, WebKit can fall back to software rendering even when the desktop
has a working GPU. The greeter requests hardware acceleration and disables the DMA-BUF renderer,
which measured more smoothly in the local WebKit preview. Its optimized
profile animates Pixel Mates as cached DOM sprites and ambience as a small set
of compositor-friendly elements instead of repainting full-screen canvases.
Ambient weather uses smooth, rounded gradients rather than pixel-art edges,
with layered raindrops and weather-specific details. Particle movement is
time-based to avoid speed changes when frame delivery varies, and the count is
capped to preserve smooth rendering. Pixel Mates are limited to two
characters. Direct development-browser
rendering keeps the full canvas renderer and all visual effects.

## Preview and smoke test

From the project directory, while logged into a graphical session:

```sh
/usr/bin/python3 integration/lightdm-webkit-greeter/greeter.py --preview --smoke-test
```

Preview mode uses a fake LightDM bridge. It never authenticates, responds with
a password, starts a session, or invokes power operations.

To visually verify fullscreen sizing without LightDM authentication:

```sh
/usr/bin/python3 integration/lightdm-webkit-greeter/greeter.py --preview --fullscreen
```

To print the preview FPS and canvas sizes after startup:

```sh
/usr/bin/python3 integration/lightdm-webkit-greeter/greeter.py --preview --performance-test
```

## Install

The installer selects EJA for the next LightDM start. It does not restart
LightDM automatically, so the current session is not interrupted:

```sh
pkexec "$PWD/integration/lightdm-webkit-greeter/install.sh"
```

Save work before logging out or rebooting. If EJA does not appear or login
fails, switch to a text console with `Ctrl+Alt+F2`, log in, then run:

```sh
pkexec "$HOME/projects/eja-login/integration/lightdm-webkit-greeter/uninstall.sh"
sudo reboot
```

The rollback removes only the EJA LightDM override and its installed greeter
files; the original Slick Greeter package and configuration remain untouched.
