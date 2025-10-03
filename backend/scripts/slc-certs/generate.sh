#!/usr/bin/env bash
set -euo pipefail
mkdir -p secure-keystore
cd secure-keystore
openssl genrsa -out localCA.key 4096
openssl req -x509 -new -nodes -key localCA.key -sha256 -days 365 -subj "/CN=ChatGeek Local CA" -out localCA.crt
openssl genrsa -out router.key 4096
openssl req -new -key router.key -subj "/CN=router.local" -out router.csr
printf "subjectAltName=DNS:router.local,IP:127.0.0.1" > san_router.ext
openssl x509 -req -in router.csr -CA localCA.crt -CAkey localCA.key -CAcreateserial -out router.crt -days 365 -sha256 -extfile san_router.ext
openssl genrsa -out ui.key 4096
openssl req -new -key ui.key -subj "/CN=ui.local" -out ui.csr
printf "subjectAltName=DNS:ui.local" > san_ui.ext
openssl x509 -req -in ui.csr -CA localCA.crt -CAkey localCA.key -CAcreateserial -out ui.crt -days 365 -sha256 -extfile san_ui.ext
echo "Keystore ready in $(pwd)"
