#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
output_dir=${1:-"$project_root/integration/cinnamon-screensaver/build"}
version='6.4.1+zara'
binary_name="cinnamon-screensaver_${version}_amd64.deb"
source_base='https://mr.heru.id/linuxmint/pool/backport/c/cinnamon-screensaver'
source_dsc="cinnamon-screensaver_${version}.dsc"
source_tar="cinnamon-screensaver_${version}.tar.xz"

mkdir -p "$output_dir"
output_dir=$(CDPATH= cd -- "$output_dir" && pwd)
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/eja-cinnamon-package.XXXXXX")
trap 'rm -rf -- "$work_dir"' EXIT HUP INT TERM

download_dir="$work_dir/download"
source_dir="$work_dir/source"
package_dir="$work_dir/package"
mkdir -p "$download_dir"

(
  cd "$download_dir"
  apt-get download "cinnamon-screensaver=$version"
)

printf '%s  %s\n' \
  'bc55f7d6f823e8a498955f2b6fee2469e8906ce6f28bdaa63cb7a23a37c73681' \
  "$download_dir/$binary_name" | sha256sum --check

curl -fsSL "$source_base/$source_dsc" -o "$download_dir/$source_dsc"
curl -fsSL "$source_base/$source_tar" -o "$download_dir/$source_tar"
printf '%s  %s\n' \
  'ab0217898e5bb46e2a00c67f1109d704f8cc3f954a0b3807bc43fbe6384a7f33' \
  "$download_dir/$source_dsc" | sha256sum --check
printf '%s  %s\n' \
  '3fac21216251853c4dbbc4774461421ea22bb3607f75c78315a7fdeb2f90a61a' \
  "$download_dir/$source_tar" | sha256sum --check

dpkg-source -x "$download_dir/$source_dsc" "$source_dir"
patch --batch -p1 -d "$source_dir" \
  < "$project_root/integration/cinnamon-screensaver/patches/0001-eja-visual-theme.patch"

dpkg-deb --extract "$download_dir/$binary_name" "$package_dir"
dpkg-deb --control "$download_dir/$binary_name" "$package_dir/DEBIAN"
install -m 0644 "$source_dir/src/monitorView.py" \
  "$package_dir/usr/share/cinnamon-screensaver/monitorView.py"
install -m 0644 "$source_dir/src/unlock.py" \
  "$package_dir/usr/share/cinnamon-screensaver/unlock.py"
install -m 0644 "$source_dir/src/cinnamon-screensaver.css" \
  "$package_dir/usr/share/cinnamon-screensaver/cinnamon-screensaver.css"
cat "$project_root/integration/cinnamon-screensaver/eja-native-theme.css" \
  >> "$package_dir/usr/share/cinnamon-screensaver/cinnamon-screensaver.css"

python3 - "$package_dir/DEBIAN/control" <<'PY'
import pathlib
import sys

control_path = pathlib.Path(sys.argv[1])
lines = control_path.read_text(encoding="utf-8").splitlines()
for index, line in enumerate(lines):
    if line.startswith("Version: "):
        lines[index] = "Version: 6.4.1+zara+eja1"

depends_start = next(
    (index for index, line in enumerate(lines) if line.startswith("Depends: ")),
    None,
)
if depends_start is None:
    raise SystemExit("Could not find the package runtime dependencies.")

depends_end = depends_start + 1
while depends_end < len(lines) and (lines[depends_end].startswith(" ") or lines[depends_end].startswith("\t")):
    depends_end += 1

if not any("gir1.2-webkit2-4.1" in line for line in lines[depends_start:depends_end]):
    lines[depends_end - 1] = lines[depends_end - 1].rstrip() + ","
    lines.insert(depends_end, " gir1.2-webkit2-4.1")

control_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

python3 - "$package_dir" <<'PY'
import hashlib
import pathlib
import sys

package_dir = pathlib.Path(sys.argv[1])
manifest = package_dir / "DEBIAN" / "md5sums"
files = sorted(
    path for path in package_dir.rglob("*")
    if path.is_file() and not path.is_symlink() and "DEBIAN" not in path.relative_to(package_dir).parts
)
manifest.write_text(
    "".join(
        f"{hashlib.md5(path.read_bytes()).hexdigest()}  {path.relative_to(package_dir).as_posix()}\n"
        for path in files
    ),
    encoding="utf-8",
)
PY

dpkg-deb --build --root-owner-group "$package_dir" \
  "$output_dir/cinnamon-screensaver_6.4.1+zara+eja1_amd64.deb"
install -m 0644 "$download_dir/$binary_name" \
  "$output_dir/$binary_name"

printf 'Built EJA screensaver package: %s\n' \
  "$output_dir/cinnamon-screensaver_6.4.1+zara+eja1_amd64.deb"
printf 'Saved the matching unmodified package for rollback: %s\n' \
  "$output_dir/$binary_name"
