$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path secure-keystore | Out-Null
Set-Location secure-keystore
openssl genrsa -out localCA.key 4096
openssl req -x509 -new -nodes -key localCA.key -sha256 -days 365 `
  -subj "/CN=ChatGeek Local CA" -out localCA.crt
openssl genrsa -out router.key 4096
openssl req -new -key router.key -subj "/CN=router.local" -out router.csr
"subjectAltName=DNS:router.local,IP:127.0.0.1" | Out-File san_router.ext -Encoding ascii
openssl x509 -req -in router.csr -CA localCA.crt -CAkey localCA.key -CAcreateserial `
  -out router.crt -days 365 -sha256 -extfile san_router.ext
openssl genrsa -out ui.key 4096
openssl req -new -key ui.key -subj "/CN=ui.local" -out ui.csr
"subjectAltName=DNS:ui.local" | Out-File san_ui.ext -Encoding ascii
openssl x509 -req -in ui.csr -CA localCA.crt -CAkey localCA.key -CAcreateserial `
  -out ui.crt -days 365 -sha256 -extfile san_ui.ext
Write-Host "Keystore ready in $(Get-Location)"
