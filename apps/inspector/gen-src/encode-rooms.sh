#!/bin/zsh
# Encode the click-nav room fly-in clips into public/palace/. These PLAY
# linearly (not scrubbed), so a normal GOP + faststart is enough. Muted, no
# audio track. Room stills remain the posters/fallbacks.
cd "$(dirname "$0")"
enc() {  # <src> <dest-name>
  local src="$1"; local name="$2"
  [ -f "$src" ] || { echo "skip ${name}: missing ${src}"; return; }
  ffmpeg -y -i "$src" -an -vf "unsharp=5:5:0.6:5:5:0.0" \
    -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p \
    -movflags +faststart "../public/palace/${name}.mp4" >/dev/null 2>&1
  echo "${name}.mp4 $(du -h ../public/palace/${name}.mp4 | cut -f1)"
}

# the entrance: gates open and fly into the atrium, ending on the atrium still
enc arr_enter.mp4 gates
# main rooms — arrivals that END on each room's own still (clean hand-off)
enc arr_atrium.mp4 atrium
enc arr_observatory.mp4 observatory
enc arr_scriptorium.mp4 scriptorium
# the Vault is the rotunda now (leg_2 flew into the old gallery), so use its arrival
enc arr_rotunda.mp4 vault
# namespace library variants
enc arr_lib_glacial.mp4 lib_glacial
enc arr_lib_amethyst.mp4 lib_amethyst
enc arr_lib_amber.mp4 lib_amber
enc arr_lib_emerald.mp4 lib_emerald
enc arr_lib_rose.mp4 lib_rose
enc arr_lib_sapphire.mp4 lib_sapphire
echo ENCODE_ROOMS_DONE
