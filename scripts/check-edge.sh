#!/usr/bin/env bash
# Edge acceptance checks from SPEC-cloudflare-infra.md.
#
#   scripts/check-edge.sh media [key]   # default key: probe/snippet.m4a
#   scripts/check-edge.sh site
#
# Names are resolved through 1.1.1.1 and pinned with --resolve, so a stale
# answer in the laptop's DNS cache can't hide what Cloudflare serves.
set -u

BUCKET=thesamegatsby-media
MEDIA=media.thesamegatsby.com
WWW=www.thesamegatsby.com
APEX=thesamegatsby.com
FAILS=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n      %s\n' "$1" "$2"; FAILS=$((FAILS + 1)); }

# curl with the host pinned to the address 1.1.1.1 gives for it.
pcurl() {
  local host=$1; shift
  local ip
  ip=$(dig +short "$host" @1.1.1.1 | grep -E '^[0-9.]+$' | head -1)
  if [ -z "$ip" ]; then
    echo "no address for $host" >&2
    return 1
  fi
  curl -s -m 20 --resolve "$host:443:$ip" --resolve "$host:80:$ip" "$@"
}

header() { grep -i "^$1:" | head -1 | cut -d' ' -f2- | tr -d '\r'; }

check_media() {
  local key=${1:-probe/snippet.m4a}
  local url="https://$MEDIA/$key"

  # Prime without Origin, so the cached copy is one R2 sent with no CORS.
  pcurl "$MEDIA" -o /dev/null "$url"
  local h
  h=$(pcurl "$MEDIA" -D - -o /dev/null "$url")

  local status cache cc ct
  status=$(printf '%s' "$h" | head -1 | tr -d '\r')
  cache=$(printf '%s' "$h" | header cf-cache-status)
  cc=$(printf '%s' "$h" | header cache-control)
  ct=$(printf '%s' "$h" | header content-type)

  case "$status" in *" 200"*) pass "200 for $key" ;; *) fail "200 for $key" "got: $status" ;; esac
  [ "$cache" = "HIT" ] && pass "second request is a cache HIT" || fail "second request is a cache HIT" "cf-cache-status: ${cache:-none}"
  [ "$cc" = "public, max-age=31536000, immutable" ] && pass "immutable cache-control" || fail "immutable cache-control" "cache-control: ${cc:-none}"
  [ "$ct" = "audio/mp4" ] && pass "content-type audio/mp4" || fail "content-type audio/mp4" "content-type: ${ct:-none}"

  local range
  range=$(pcurl "$MEDIA" -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-16383' "$url")
  [ "$range" = "206" ] && pass "206 for a range request" || fail "206 for a range request" "got: $range"

  # R2 answers with `Vary: Origin`, so a request with Origin can be a MISS
  # even when the no-Origin copy is cached. What matters is that the header
  # is on both: the Transform Rule sets it on every response, cached or not.
  local acao
  acao=$(printf '%s' "$h" | header access-control-allow-origin)
  if [ "$acao" = "*" ] && [ "$cache" = "HIT" ]; then
    pass "access-control-allow-origin: * on a copy cached without Origin"
  else
    fail "access-control-allow-origin: * on a copy cached without Origin" "allow-origin: ${acao:-none}, cf-cache-status: ${cache:-none}"
  fi

  local ch oacao
  ch=$(pcurl "$MEDIA" -D - -o /dev/null -H "Origin: https://$WWW" "$url")
  oacao=$(printf '%s' "$ch" | header access-control-allow-origin)
  [ "$oacao" = "*" ] && pass "access-control-allow-origin: * on a request with Origin" || fail "access-control-allow-origin: * on a request with Origin" "allow-origin: ${oacao:-none}"

  local hsts
  hsts=$(printf '%s' "$h" | header strict-transport-security)
  case "$hsts" in max-age=*) pass "HSTS: $hsts" ;; *) fail "HSTS header" "strict-transport-security: ${hsts:-none}" ;; esac

  local redir
  redir=$(pcurl "$MEDIA" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$MEDIA/$key")
  case "$redir" in 30[178]" https://"*) pass "http:// redirects to https://" ;; *) fail "http:// redirects to https://" "got: $redir" ;; esac

  local dev
  dev=$(npx --no-install wrangler r2 bucket dev-url get "$BUCKET" 2>&1)
  case "$dev" in *"is disabled"*) pass "r2.dev public URL disabled" ;; *) fail "r2.dev public URL disabled" "$(printf '%s' "$dev" | tail -1)" ;; esac
}

check_site() {
  local h status server
  h=$(pcurl "$WWW" -D - -o /dev/null "https://$WWW/")
  status=$(printf '%s' "$h" | head -1 | tr -d '\r')
  server=$(printf '%s' "$h" | header server)
  case "$status" in *" 200"*) pass "www returns 200" ;; *) fail "www returns 200" "got: $status" ;; esac
  [ "$server" = "cloudflare" ] && pass "server: cloudflare" || fail "server: cloudflare" "server: ${server:-none}"

  local apex
  apex=$(pcurl "$APEX" -o /dev/null -w '%{http_code} %{redirect_url}' "https://$APEX/x?y=1")
  [ "$apex" = "308 https://$WWW/x?y=1" ] && pass "apex 308s to www, path and query kept" || fail "apex 308s to www, path and query kept" "got: $apex"

  local redir
  redir=$(pcurl "$WWW" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$WWW/")
  case "$redir" in 30[178]" https://"*) pass "http:// redirects to https://" ;; *) fail "http:// redirects to https://" "got: $redir" ;; esac

  local asset cc
  asset=$(pcurl "$WWW" "https://$WWW/" | grep -o '/_next/static/[^"]*\.js' | head -1)
  if [ -z "$asset" ]; then
    fail "static assets immutable" "no /_next/static/ script found on /"
  else
    cc=$(pcurl "$WWW" -D - -o /dev/null "https://$WWW$asset" | header cache-control)
    [ "$cc" = "public, max-age=31536000, immutable" ] && pass "static assets immutable" || fail "static assets immutable" "cache-control: ${cc:-none}"
  fi
}

case "${1:-}" in
  media) check_media "${2:-}" ;;
  site) check_site ;;
  *) echo "usage: $0 media [key] | site" >&2; exit 2 ;;
esac

if [ "$FAILS" -gt 0 ]; then
  echo "$FAILS check(s) failed"
  exit 1
fi
echo "all checks passed"
