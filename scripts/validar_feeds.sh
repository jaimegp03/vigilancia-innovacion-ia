#!/usr/bin/env bash
# Uso: validar_feeds.sh fichero   (líneas "nombre|url")
# Salida: HTTP | nº items | fecha del primer y mayor sello | nombre | url
while IFS='|' read -r nombre url; do
  [ -z "$nombre" ] && continue
  tmp=$(mktemp)
  code=$(curl -sL -m 20 -A "Mozilla/5.0 (vigilancia-ia)" -o "$tmp" -w "%{http_code}" "$url")
  items=$(grep -o -E "<item[ >]|<entry[ >]" "$tmp" | wc -l)
  fecha=$(grep -o -E "<(pubDate|published|updated|dc:date)>[^<]+" "$tmp" | sed 's/<[^>]*>//' | head -1)
  echo "$code | items=$items | $fecha | $nombre | $url"
  rm -f "$tmp"
done < "$1"
