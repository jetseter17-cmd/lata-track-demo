#!/bin/zsh
# Ставит свежую версию ?v= на css/js во всех HTML — браузер гарантированно берёт новые файлы.
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
for f in *.html; do
  perl -pi -e "s|(href=\"css/main\.css)(\?v=\d+)?\"|\$1?v=$V\"|g; s|(src=\"js/app\.js)(\?v=\d+)?\"|\$1?v=$V\"|g" "$f"
done
echo "version -> $V"
