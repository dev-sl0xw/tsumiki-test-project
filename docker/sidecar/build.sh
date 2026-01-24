#!/bin/bash
# Sidecar Container Build Script
#
# This script builds the sidecar container image locally
# and optionally pushes it to Amazon ECR.
#
# Usage:
#   ./build.sh              # Build only
#   ./build.sh --push       # Build and push to ECR
#   ./build.sh --push --tag v1.0.0  # Build and push with specific tag

set -e

# Configuration
IMAGE_NAME="sidecar"
DEFAULT_TAG="latest"
MAX_SIZE_MB=50

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
PUSH_TO_ECR=false
TAG="${DEFAULT_TAG}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH_TO_ECR=true
      shift
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--push] [--tag <tag>]"
      echo ""
      echo "Options:"
      echo "  --push       Push image to Amazon ECR after building"
      echo "  --tag <tag>  Specify image tag (default: latest)"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Sidecar Container Build Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Build the image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t "${IMAGE_NAME}:${TAG}" "${SCRIPT_DIR}"

# Check image size
echo ""
echo -e "${YELLOW}Checking image size...${NC}"
SIZE_BYTES=$(docker image inspect "${IMAGE_NAME}:${TAG}" --format='{{.Size}}')
SIZE_MB=$((SIZE_BYTES / 1024 / 1024))

echo "Image size: ${SIZE_MB}MB (target: <${MAX_SIZE_MB}MB)"

if [ "${SIZE_MB}" -gt "${MAX_SIZE_MB}" ]; then
  echo -e "${RED}WARNING: Image size exceeds target of ${MAX_SIZE_MB}MB${NC}"
else
  echo -e "${GREEN}Image size is within target${NC}"
fi

# Test the image
echo ""
echo -e "${YELLOW}Testing image...${NC}"

# Test 1: Check entrypoint exists
echo "  - Checking entrypoint script..."
docker run --rm "${IMAGE_NAME}:${TAG}" sh -c "test -x /entrypoint.sh && echo 'OK'" || {
  echo -e "${RED}ERROR: Entrypoint script not found or not executable${NC}"
  exit 1
}

# Test 2: Check socat is installed
echo "  - Checking socat installation..."
docker run --rm "${IMAGE_NAME}:${TAG}" sh -c "which socat && echo 'OK'" || {
  echo -e "${RED}ERROR: socat not found${NC}"
  exit 1
}

# Test 3: Check netcat is installed
echo "  - Checking netcat installation..."
docker run --rm "${IMAGE_NAME}:${TAG}" sh -c "which nc && echo 'OK'" || {
  echo -e "${RED}ERROR: netcat not found${NC}"
  exit 1
}

echo -e "${GREEN}All tests passed${NC}"

# Push to ECR if requested
if [ "${PUSH_TO_ECR}" = true ]; then
  echo ""
  echo -e "${YELLOW}Pushing to Amazon ECR...${NC}"

  # Check if AWS CLI is configured
  if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}ERROR: AWS CLI is not configured or credentials are invalid${NC}"
    exit 1
  fi

  # Get AWS account ID and region
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  AWS_REGION=$(aws configure get region || echo "ap-northeast-1")
  ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

  echo "  ECR Repository: ${ECR_REPO}"
  echo "  Tag: ${TAG}"

  # Login to ECR
  echo "  - Logging in to ECR..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  # Create repository if it doesn't exist
  echo "  - Ensuring ECR repository exists..."
  aws ecr describe-repositories --repository-names "${IMAGE_NAME}" --region "${AWS_REGION}" &>/dev/null || \
    aws ecr create-repository --repository-name "${IMAGE_NAME}" --region "${AWS_REGION}" \
      --image-scanning-configuration scanOnPush=true

  # Tag and push
  echo "  - Tagging image..."
  docker tag "${IMAGE_NAME}:${TAG}" "${ECR_REPO}:${TAG}"

  echo "  - Pushing image..."
  docker push "${ECR_REPO}:${TAG}"

  echo -e "${GREEN}Successfully pushed to ${ECR_REPO}:${TAG}${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Image: ${IMAGE_NAME}:${TAG}"
echo "Size: ${SIZE_MB}MB"
if [ "${PUSH_TO_ECR}" = true ]; then
  echo "ECR: ${ECR_REPO}:${TAG}"
fi
