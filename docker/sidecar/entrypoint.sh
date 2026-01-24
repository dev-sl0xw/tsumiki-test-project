#!/bin/sh
# Sidecar Container Entrypoint Script
#
# This script provides flexible operation modes for the sidecar container:
# 1. Port forwarding mode (default): Forward TCP connections using socat
# 2. Sleep mode: Keep container running for ECS Exec debugging
#
# Requirements: REQ-016, REQ-017
# - Uses socat for TCP port forwarding
# - Supports sleep infinity mode for ECS Exec debugging
#
# Environment Variables:
#   MODE          - Operation mode: "proxy" (default) or "sleep"
#   TARGET_HOST   - Target hostname to forward connections to (required in proxy mode)
#   TARGET_PORT   - Target port to forward connections to (required in proxy mode)
#   LISTEN_PORT   - Port to listen on (default: 8080)
#   LOG_LEVEL     - Logging level for socat: "error", "warn", "info", "debug" (default: info)

set -e

# Default values
MODE="${MODE:-proxy}"
LISTEN_PORT="${LISTEN_PORT:-8080}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Convert log level to socat option
get_socat_log_opts() {
  case "${LOG_LEVEL}" in
    error)
      echo ""
      ;;
    warn)
      echo "-d"
      ;;
    info)
      echo "-d -d"
      ;;
    debug)
      echo "-d -d -d"
      ;;
    *)
      echo "-d -d"
      ;;
  esac
}

# Log message with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Validate required environment variables for proxy mode
validate_proxy_config() {
  if [ -z "${TARGET_HOST}" ]; then
    log "ERROR: TARGET_HOST environment variable is required in proxy mode"
    exit 1
  fi

  if [ -z "${TARGET_PORT}" ]; then
    log "ERROR: TARGET_PORT environment variable is required in proxy mode"
    exit 1
  fi
}

# Main execution
main() {
  log "Sidecar container starting..."
  log "Mode: ${MODE}"

  case "${MODE}" in
    proxy)
      validate_proxy_config

      SOCAT_LOG_OPTS=$(get_socat_log_opts)

      log "Starting socat proxy..."
      log "  Listen port: ${LISTEN_PORT}"
      log "  Target: ${TARGET_HOST}:${TARGET_PORT}"
      log "  Log level: ${LOG_LEVEL}"

      # Execute socat with fork to handle multiple connections
      # reuseaddr allows quick restart of the service
      # shellcheck disable=SC2086
      exec socat ${SOCAT_LOG_OPTS} \
        TCP-LISTEN:${LISTEN_PORT},fork,reuseaddr \
        TCP:${TARGET_HOST}:${TARGET_PORT}
      ;;

    sleep)
      log "Running in sleep mode for ECS Exec debugging..."
      log "Use 'aws ecs execute-command' to connect to this container"

      # Keep container running indefinitely
      # This allows ECS Exec to connect for debugging purposes
      exec sleep infinity
      ;;

    *)
      log "ERROR: Unknown mode '${MODE}'. Valid modes are: proxy, sleep"
      exit 1
      ;;
  esac
}

# Handle signals gracefully
trap 'log "Received shutdown signal, exiting..."; exit 0' TERM INT

main
