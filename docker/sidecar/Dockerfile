# Sidecar Container for ECS Service Connect / ECS Exec
# Alpine Linux based lightweight container with socat for port forwarding
#
# Requirements: REQ-015, REQ-016, REQ-017
# - Sidecar pattern implementation for secure DB connection
# - Lightweight Alpine image with socat for port forwarding
# - Support for ECS Exec debugging via SSM

FROM alpine:3.19

LABEL maintainer="DevOps Team"
LABEL description="Sidecar container for ECS Service Connect with socat proxy"
LABEL version="1.0.0"

# Install socat and netcat-openbsd (for health check)
# Using --no-cache to reduce image size
RUN apk add --no-cache \
    socat \
    netcat-openbsd \
    && rm -rf /var/cache/apk/*

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default port for proxy listening
EXPOSE 8080

# Health check configuration
# Checks if the proxy port is listening
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost ${LISTEN_PORT:-8080} || exit 1

# Run as non-root user for security
RUN adduser -D -u 1000 sidecar
USER sidecar

ENTRYPOINT ["/entrypoint.sh"]
