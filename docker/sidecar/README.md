# Sidecar Container for ECS Service Connect

Alpine Linux ベースの軽量 Sidecar コンテナイメージです。socat を使用した TCP ポートフォワーディング機能を提供し、ECS Exec によるデバッグもサポートします。

## 関連要件

- **REQ-015**: Sidecar パターンの実装（App Container と Sidecar Container の定義）
- **REQ-016**: 軽量イメージの使用と `sleep infinity` での待機状態維持
- **REQ-017**: socat によるポートフォワーディング中継

## 機能

### 1. Proxy モード（デフォルト）

socat を使用して TCP 接続をターゲットホストにフォワーディングします。Aurora RDS などのデータベースへのセキュアな接続に使用します。

### 2. Sleep モード

ECS Exec（SSM 経由）でのデバッグ用に、コンテナを待機状態で維持します。

## 環境変数

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `MODE` | No | `proxy` | 動作モード: `proxy` または `sleep` |
| `TARGET_HOST` | Yes* | - | フォワード先ホスト名（proxy モード時必須） |
| `TARGET_PORT` | Yes* | - | フォワード先ポート番号（proxy モード時必須） |
| `LISTEN_PORT` | No | `8080` | 待ち受けポート番号 |
| `LOG_LEVEL` | No | `info` | ログレベル: `error`, `warn`, `info`, `debug` |

## ビルド手順

### ローカルビルド

```bash
# docker/sidecar ディレクトリで実行
docker build -t sidecar:latest .

# イメージサイズの確認（50MB以下が目標）
docker images sidecar:latest
```

### ビルドスクリプトの使用

```bash
chmod +x build.sh
./build.sh
```

## 使用例

### Proxy モード（Aurora RDS への接続）

```bash
docker run -d \
  --name sidecar \
  -p 8080:8080 \
  -e MODE=proxy \
  -e TARGET_HOST=aurora-cluster.cluster-xxxx.ap-northeast-1.rds.amazonaws.com \
  -e TARGET_PORT=3306 \
  -e LISTEN_PORT=8080 \
  sidecar:latest
```

### Sleep モード（デバッグ用）

```bash
docker run -d \
  --name sidecar-debug \
  -e MODE=sleep \
  sidecar:latest
```

## ECS Task Definition での使用

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-app-image:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ]
    },
    {
      "name": "sidecar",
      "image": "your-ecr-repo/sidecar:latest",
      "essential": false,
      "environment": [
        { "name": "MODE", "value": "proxy" },
        { "name": "TARGET_HOST", "value": "aurora-cluster.xxxx.ap-northeast-1.rds.amazonaws.com" },
        { "name": "TARGET_PORT", "value": "3306" },
        { "name": "LISTEN_PORT", "value": "8080" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "nc -z localhost 8080 || exit 1"],
        "interval": 30,
        "timeout": 3,
        "retries": 3,
        "startPeriod": 5
      }
    }
  ]
}
```

## ECR へのプッシュ

```bash
# AWS アカウント ID とリージョンを設定
AWS_ACCOUNT_ID=123456789012
AWS_REGION=ap-northeast-1
ECR_REPO=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sidecar

# ECR にログイン
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# イメージをタグ付けしてプッシュ
docker tag sidecar:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest
```

## ヘルスチェック

コンテナには以下のヘルスチェックが設定されています：

- **間隔**: 30秒
- **タイムアウト**: 3秒
- **開始待機**: 5秒
- **リトライ**: 3回
- **コマンド**: `nc -z localhost ${LISTEN_PORT}`

## セキュリティ考慮事項

1. **非 root ユーザー**: コンテナは `sidecar` ユーザー（UID 1000）で実行されます
2. **最小限のパッケージ**: socat と netcat-openbsd のみインストール
3. **イメージサイズ**: 50MB 以下を目標とした軽量設計
4. **シグナルハンドリング**: TERM/INT シグナルを適切に処理

## トラブルシューティング

### コンテナが起動しない場合

```bash
# ログを確認
docker logs sidecar

# 環境変数を確認（proxy モードの場合）
# TARGET_HOST と TARGET_PORT が設定されているか確認
```

### 接続できない場合

```bash
# コンテナ内でターゲットへの接続をテスト
docker exec -it sidecar nc -zv ${TARGET_HOST} ${TARGET_PORT}

# socat のデバッグログを有効化
docker run -e LOG_LEVEL=debug ...
```

### ECS Exec での接続

```bash
# Sleep モードで起動している場合
aws ecs execute-command \
  --cluster your-cluster \
  --task your-task-id \
  --container sidecar \
  --interactive \
  --command "/bin/sh"
```

## バージョン履歴

- **1.0.0**: 初期リリース
  - Alpine 3.19 ベース
  - socat によるポートフォワーディング
  - Sleep モードサポート
  - 非 root ユーザー実行
