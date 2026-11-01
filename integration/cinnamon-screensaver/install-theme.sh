#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
data_home=${XDG_DATA_HOME:-"$HOME/.local/share"}
target="$data_home/eja-cinnamon-screensaver"

font_dir="$data_home/fonts/eja"

install -d "$target/assets/css" "$target/assets/js" "$target/assets/fonts" "$target/assets/images" "$font_dir"
install -m 0644 "$project_root/screensaver/index.html" "$target/index.html"
install -m 0644 "$project_root/screensaver/screensaver.css" "$target/assets/css/screensaver.css"
install -m 0644 "$project_root/screensaver/screensaver.js" "$target/assets/js/screensaver.js"
install -m 0644 "$project_root"/assets/fonts/* "$target/assets/fonts/"
install -m 0644 "$project_root"/assets/fonts/*.ttf "$font_dir/"
if command -v fc-cache >/dev/null 2>&1; then
  fc-cache -f "$font_dir"
fi
cp -a "$project_root/assets/images/." "$target/assets/images/"

python3 - "$target/assets/images" "$target/assets/js/wallpaper-manifest.js" <<'PY'
import json
import pathlib
import sys

image_dir = pathlib.Path(sys.argv[1])
manifest_path = pathlib.Path(sys.argv[2])
extensions = {".avif", ".gif", ".jpeg", ".jpg", ".mp4", ".png", ".webm", ".webp"}
files = sorted(
    path.name for path in image_dir.iterdir()
    if path.is_file() and path.suffix.lower() in extensions
)
manifest_path.write_text(
    "window.EJA_WALLPAPER_FILES = " + json.dumps(files, ensure_ascii=True) + ";\n",
    encoding="utf-8",
)
print(f"Installed EJA screensaver theme and indexed {len(files)} wallpaper(s) at {manifest_path.parent.parent.parent}")
PY
