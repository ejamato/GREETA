# EJA Cinnamon Screensaver integration

This integration replaces only Cinnamon Screensaver's wallpaper surface with
the EJA visual theme and restyles its native unlock and media widgets. The
unlock form is kept compact and presented as a deliberate pixel-style card.
Cinnamon's GTK unlock dialog, PAM authentication, keyboard and pointer grabs,
and MPRIS media controls remain native. Slick Greeter is not modified. The EJA
login page is deliberately not loaded by the screensaver.

There is no supported third-party theme/plugin hook in Cinnamon Screensaver
6.4. The patch in `patches/0001-eja-visual-theme.patch` targets its
`monitorView.py` wallpaper component. It does not use the deprecated
`screensaver-name` or `screensaver-webkit-theme` settings, and it does not set
`custom-screensaver-command` (that setting makes Cinnamon Screensaver exit).

## EJA login preferences

The EJA login page saves ambience and Pixel Mates preferences in browser
`localStorage`, under the current browser profile. These settings are restored
when that same page is opened again. Ambience includes weather, automatic or
manual daypart, wallpaper, theme color, particle density, wind, and caption
visibility. Pixel Mates stores the selected archetype, character types/count,
and ledge visibility; transient commands such as jump are not saved.

Browser storage is scoped to the page's origin and profile. During local
preview, use the same URL origin each time (scheme, hostname, and port must
match). A desktop greeter may use a separate or temporary WebKit profile; in
that case, browser storage may not survive a reboot or be shared with the
preview. Confirm persistence in the actual Slick Greeter profile before
relying on it. The Cinnamon Screensaver theme has its own separate browser
context and does not read EJA login preferences.

## Install the EJA theme files

From the project directory:

```sh
sh integration/cinnamon-screensaver/install-theme.sh
```

The script copies the screensaver-only HTML/CSS/JavaScript, Pixelify Sans font
files and license, and wallpapers to
`$XDG_DATA_HOME/eja-cinnamon-screensaver` (or `~/.local/share/...`). It
uses bundled Pixelify Sans files so the screen has the same font as the EJA
login page without requiring network access. It also installs the font to the
current user's Fontconfig directory for Cinnamon's native GTK widgets. Restart
the screensaver session after installation so GTK and Fontconfig load the font.
It generates a local wallpaper manifest each time it runs, so newly added
image, GIF, or video files are indexed when the script is run again.

The wallpaper name selects its time period:

| Period | Name fragments |
| --- | --- |
| Morning | `dawn`, `morning`, `pagi`, `sunrise` |
| Day | `noon`, `day`, `siang` |
| Afternoon | `dusk`, `afternoon`, `sore`, `sunset` |
| Night | `nite`, `night`, `malam` |

Use those terms in a wallpaper filename to have it selected automatically.
GIFs animate as images; MP4/WebM files are played muted when the WebKit/GStreamer
codec stack supports them.

## Build a reversible Cinnamon Screensaver package

Build a user-local package and matching rollback package from the exact Mint
6.4.1+zara source and binary releases:

```sh
sh integration/cinnamon-screensaver/build-package.sh
```

The script verifies published SHA256 checksums, applies the patch to the
matching source, and packages the patched Python wallpaper view, compact unlock
layout, and EJA native GTK stylesheet into a local derivative of the official
binary package. The unlock dialog remains transparent, while input and media
controls use a light pixel-glass palette rather than black panels. It does not
install or replace any system files. The derivative declares
`gir1.2-webkit2-4.1` as a runtime dependency. Its package version is
`6.4.1+zara+eja1`; package upgrades from Mint may replace it.

After reviewing both generated packages, install EJA with:

```sh
sudo apt install ./integration/cinnamon-screensaver/build/cinnamon-screensaver_6.4.1+zara+eja1_amd64.deb
```

To roll back to the exact original package saved alongside it:

```sh
sudo dpkg --force-downgrade -i ./integration/cinnamon-screensaver/build/cinnamon-screensaver_6.4.1+zara_amd64.deb
```

Then log out and back in to restart the screensaver service. Do not test locking
until the rollback package is available and the EJA theme has been installed.
Keep the patch in the package's patch series for future rebuilds.

When WebKit2GTK is unavailable, the patch logs the issue and keeps Cinnamon's
regular wallpaper. If the EJA theme cannot load, the original wallpaper remains
visible. No authentication or session configuration is changed by the theme
installer or patch.
