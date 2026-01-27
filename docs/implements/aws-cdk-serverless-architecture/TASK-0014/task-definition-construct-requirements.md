# Task Definition Construct 要件定義書

**タスクID**: TASK-0014
**機能名**: Task Definition Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション
**作成日**: 2026-01-27

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能概要 🔵

**信頼性**: 🔵 *REQ-014〜018、architecture.md より*

ECS Fargate 用の Task Definition Construct を実装します。App Container と Sidecar Container のマルチコンテナ構成で、適切なリソース設定（0.5vCPU/1GB メモリ）と IAM Task Role を付与します。

### 1.2 解決する問題 🔵

**信頼性**: 🔵 *要件定義書・設計文書より*

- **セキュリティ**: App Container は Aurora Endpoint を直接知らず、Sidecar を経由することでセキュアな接続を実現
- **運用性**: ECS Exec で Sidecar に接続して DB 操作が可能
- **柔軟性**: マルチコンテナ構成により、追加のセキュリティ処理やデバッグが可能

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

- **インフラエンジニア**: CDK を使用してインフラを構築・管理する
- **アプリケーション開発者**: ECS Service 上でアプリケーションを実行する
- **運用エンジニア**: ECS Exec を使用してコンテナにアクセスし運用操作を行う

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.md より*

```
VPC Stack → Security Stack → Application Stack
                              ↓
                          ECS Cluster → Task Definition → Service
                                        ↑
                                        本 Construct
```

Task Definition は Application Stack に属し、ECS Cluster の上に構築され、ECS Service から参照されます。

**参照したEARS要件**: REQ-014, REQ-015, REQ-016, REQ-017, REQ-018
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - コンピューティング層セクション

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（Props） 🔵

**信頼性**: 🔵 *interfaces.ts、note.md より*

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|-----|------|------------|------|
| `appRepository` | `ecr.IRepository` | ✅ | - | App Container イメージの ECR リポジトリ |
| `sidecarRepository` | `ecr.IRepository` | ✅ | - | Sidecar Container イメージの ECR リポジトリ |
| `logGroup` | `logs.ILogGroup` | ✅ | - | CloudWatch Logs Log Group |
| `auroraEndpoint` | `string` | ✅ | - | Aurora Cluster Endpoint（Sidecar の TARGET_HOST） |
| `auroraPort` | `number` | ❌ | `3306` | Aurora Port（Sidecar の TARGET_PORT） |
| `taskRole` | `iam.IRole` | ❌ | 自動作成 | Task Role |
| `executionRole` | `iam.IRole` | ❌ | 自動作成 | Execution Role |
| `cpu` | `256 \| 512 \| 1024 \| 2048 \| 4096` | ❌ | `512` | CPU（vCPU 単位） |
| `memoryMiB` | `number` | ❌ | `1024` | Memory（MiB 単位） |
| `appContainerPort` | `number` | ❌ | `3000` | App Container のポート |
| `appEnvironment` | `Record<string, string>` | ❌ | `{}` | App Container の環境変数 |
| `sidecarMode` | `'proxy' \| 'sleep'` | ❌ | `'proxy'` | Sidecar の動作モード |

### 2.2 出力プロパティ 🔵

**信頼性**: 🔵 *note.md、既存実装パターンより*

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `taskDefinition` | `ecs.FargateTaskDefinition` | 作成された Task Definition |
| `appContainer` | `ecs.ContainerDefinition` | App Container Definition |
| `sidecarContainer` | `ecs.ContainerDefinition` | Sidecar Container Definition |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *dataflow.md、architecture.md より*

```
入力:
  - ECR Repositories (appRepository, sidecarRepository)
  - CloudWatch Logs (logGroup)
  - Aurora 接続情報 (auroraEndpoint, auroraPort)
  - 設定オプション (cpu, memoryMiB, etc.)
    ↓
TaskDefinitionConstruct
    ↓
出力:
  - FargateTaskDefinition (taskDefinition)
  - App ContainerDefinition (appContainer)
  - Sidecar ContainerDefinition (sidecarContainer)
```

### 2.4 データフロー 🔵

**信頼性**: 🔵 *dataflow.md より*

```
[ECR Repository] ──→ [Task Definition] ──→ [ECS Service]
                          │
                          ├─ App Container (essential: true)
                          │    └─ Port: 3000
                          │    └─ Logging: awslogs
                          │
                          └─ Sidecar Container (essential: false)
                               └─ TARGET_HOST: Aurora Endpoint
                               └─ TARGET_PORT: 3306
                               └─ MODE: proxy/sleep
                               └─ Logging: awslogs
```

**参照したEARS要件**: REQ-014, REQ-015, REQ-016, REQ-017
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - TaskDefinitionConfig, ContainerConfig

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 Fargate CPU/Memory 組み合わせ制約 🔵

**信頼性**: 🔵 *AWS ドキュメント、note.md より*

Fargate では CPU と Memory の組み合わせに制約があります。本 Construct では以下を使用：

| CPU (vCPU) | 有効な Memory (GB) |
|------------|-------------------|
| 256 (.25) | 0.5, 1, 2 |
| **512 (.5)** | **1**, 2, 3, 4 |
| 1024 (1) | 2〜8 |
| 2048 (2) | 4〜16 |
| 4096 (4) | 8〜30 |

**デフォルト設定**: 512 CPU / 1024 MiB (0.5 vCPU / 1 GB)

### 3.2 Container 設定制約 🔵

**信頼性**: 🔵 *REQ-015, REQ-016 より*

| 設定項目 | App Container | Sidecar Container |
|----------|---------------|-------------------|
| Essential | `true` | `false` |
| 停止時の動作 | タスク終了 | タスク継続 |
| Network Mode | awsvpc | awsvpc |

### 3.3 IAM ポリシー制約 🔵

**信頼性**: 🔵 *REQ-018、iam-role-construct.ts より*

**Task Role**:
- `AmazonSSMManagedInstanceCore` - ECS Exec 用
- `secretsmanager:GetSecretValue` - DB 認証情報取得用（特定 ARN 推奨）

**Execution Role**:
- `AmazonECSTaskExecutionRolePolicy` - ECR Pull + CloudWatch Logs

### 3.4 パフォーマンス要件 🔵

**信頼性**: 🔵 *NFR-001〜004 より*

- **リソース割り当て**: 0.5 vCPU / 1 GB（開発環境向け）
- **スケーラビリティ**: Service の Desired Count 2 以上で高可用性確保

### 3.5 セキュリティ要件 🔵

**信頼性**: 🔵 *NFR-101〜105、REQ-018 より*

- **最小権限の原則**: Task Role には必要最小限の権限のみ付与
- **Secrets Manager 統合**: DB 認証情報は Secrets Manager 経由で取得
- **VPC Endpoint 経由**: AWS サービスへのアクセスは VPC Endpoint 経由

### 3.6 ログ設定制約 🔵

**信頼性**: 🔵 *REQ-035〜037 より*

- **ログドライバー**: awslogs
- **ログ保持期間**: Dev 3日、Prod 30日
- **Stream Prefix**: `app-`, `sidecar-` で識別

**参照したEARS要件**: NFR-001〜004, NFR-101〜105, REQ-014, REQ-018, REQ-035〜037
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - 技術的制約セクション

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *REQ-014〜018 より*

```typescript
// 基本的な使用例
const taskDefinition = new TaskDefinitionConstruct(this, 'TaskDef', {
  appRepository: appEcrRepository,
  sidecarRepository: sidecarEcrRepository,
  logGroup: cloudWatchLogGroup,
  auroraEndpoint: auroraCluster.clusterEndpoint.hostname,
  auroraPort: 3306,
});
```

### 4.2 カスタム設定の使用例 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

```typescript
// カスタム設定を指定する場合
const taskDefinition = new TaskDefinitionConstruct(this, 'TaskDef', {
  appRepository: appEcrRepository,
  sidecarRepository: sidecarEcrRepository,
  logGroup: cloudWatchLogGroup,
  auroraEndpoint: auroraCluster.clusterEndpoint.hostname,
  cpu: 1024,           // 1 vCPU
  memoryMiB: 2048,     // 2 GB
  appContainerPort: 8080,
  sidecarMode: 'sleep', // デバッグ用待機モード
  appEnvironment: {
    NODE_ENV: 'production',
  },
});
```

### 4.3 既存 IAM Role を使用する例 🟡

**信頼性**: 🟡 *iam-role-construct.ts から妥当な推測*

```typescript
// 既存の IAM Role を使用する場合
const iamRoles = new IamRoleConstruct(this, 'IamRoles', {
  secretArns: [secret.secretArn],
});

const taskDefinition = new TaskDefinitionConstruct(this, 'TaskDef', {
  appRepository: appEcrRepository,
  sidecarRepository: sidecarEcrRepository,
  logGroup: cloudWatchLogGroup,
  auroraEndpoint: auroraCluster.clusterEndpoint.hostname,
  taskRole: iamRoles.taskRole,
  executionRole: iamRoles.executionRole,
});
```

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *CDK 動作特性から妥当な推測*

| エラー状況 | 期待される動作 |
|-----------|---------------|
| 無効な CPU/Memory 組み合わせ | CDK Synth 時にエラー |
| ECR リポジトリが存在しない | デプロイ時にエラー |
| Log Group が存在しない | デプロイ時にエラー |
| IAM Role 権限不足 | ECS タスク起動時にエラー |

**参照したEARS要件**: REQ-014, EDGE-002
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **US-003**: 開発者として、ECS Fargate でコンテナアプリケーションを実行したい
- **US-004**: 運用者として、ECS Exec でコンテナにアクセスしたい
- **US-005**: セキュリティ担当として、Sidecar パターンでセキュアな DB 接続を実現したい

### 5.2 参照した機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 要件内容 |
|--------|----------|
| REQ-014 | Task Definition で 0.5 vCPU / 1GB Memory を設定 |
| REQ-015 | Sidecar パターンを実装し、App Container と Sidecar Container を定義 |
| REQ-016 | Sidecar Container に Alpine 等の軽量イメージを使用し、sleep infinity で待機状態を維持 |
| REQ-017 | Sidecar Container に socat 等のツールをインストールしてポートフォワーディング |
| REQ-018 | Task Role に AmazonSSMManagedInstanceCore 権限を付与 |

### 5.3 参照した非機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 要件内容 |
|--------|----------|
| NFR-001 | Multi-AZ 構成により高可用性を維持 |
| NFR-004 | ECS Service の Desired Count 2 以上で可用性を確保 |
| NFR-301 | Container Insights を有効化してモニタリング可能 |
| NFR-302 | ECS Exec を有効化して運用操作を可能 |
| NFR-303 | Sidecar パターンを使用してセキュアな DB 接続を可能 |

### 5.4 参照したEdgeケース 🟡

**信頼性**: 🟡 *requirements.md から妥当な推測*

| 要件ID | 要件内容 |
|--------|----------|
| EDGE-002 | ECS タスクが失敗した場合、自動的に新しいタスクを起動 |
| EDGE-102 | ECS タスクのメモリ使用量が上限に達した場合の動作を定義 |

### 5.5 参照した設計文書 🔵

**信頼性**: 🔵 *設計文書より*

| 文書 | 該当セクション |
|------|---------------|
| **アーキテクチャ** | `docs/design/aws-cdk-serverless-architecture/architecture.md` - コンピューティング層 |
| **データフロー** | `docs/design/aws-cdk-serverless-architecture/dataflow.md` - ECS データフロー |
| **型定義** | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - TaskDefinitionConfig, ContainerConfig |

### 5.6 参照した既存実装 🔵

**信頼性**: 🔵 *既存 Construct より*

| ファイル | 参照内容 |
|----------|----------|
| `infra/lib/construct/ecs/ecs-cluster-construct.ts` | デフォルト値外出し、JSDoc パターン |
| `infra/lib/construct/security/iam-role-construct.ts` | Task Role / Execution Role 作成パターン |
| `docker/sidecar/Dockerfile` | Sidecar Container イメージ仕様 |
| `docker/sidecar/entrypoint.sh` | Sidecar 環境変数、動作モード |

---

## 6. テスト要件概要

### 6.1 基本テストケース 🔵

**信頼性**: 🔵 *REQ-014 より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-01 | Task Definition リソース作成確認 | AWS::ECS::TaskDefinition が 1 つ作成される |
| TC-TASKDEF-02 | CPU 設定確認 | Cpu が 512 に設定される |
| TC-TASKDEF-03 | Memory 設定確認 | Memory が 1024 に設定される |
| TC-TASKDEF-04 | Network Mode 確認 | NetworkMode が awsvpc に設定される |

### 6.2 Container テストケース 🔵

**信頼性**: 🔵 *REQ-015, REQ-016 より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-05 | App Container 作成確認 | ContainerDefinitions に app コンテナが含まれる |
| TC-TASKDEF-06 | Sidecar Container 作成確認 | ContainerDefinitions に sidecar コンテナが含まれる |
| TC-TASKDEF-07 | App Container Essential 確認 | app コンテナの Essential が true |
| TC-TASKDEF-08 | Sidecar Container Essential 確認 | sidecar コンテナの Essential が false |
| TC-TASKDEF-09 | Port Mapping 確認 | app コンテナに正しいポートマッピング |
| TC-TASKDEF-10 | Logging 設定確認 | awslogs ドライバーが設定される |

### 6.3 IAM Role テストケース 🔵

**信頼性**: 🔵 *REQ-017, REQ-018 より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-11 | Task Role 参照確認 | TaskRoleArn が設定される |
| TC-TASKDEF-12 | Execution Role 参照確認 | ExecutionRoleArn が設定される |

### 6.4 Sidecar 環境変数テストケース 🔵

**信頼性**: 🔵 *REQ-017、docker/sidecar/entrypoint.sh より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-13 | TARGET_HOST 環境変数確認 | Aurora Endpoint が設定される |
| TC-TASKDEF-14 | TARGET_PORT 環境変数確認 | Aurora Port が設定される |
| TC-TASKDEF-15 | MODE 環境変数確認 | proxy または sleep が設定される |

### 6.5 スナップショットテスト 🔵

**信頼性**: 🔵 *設計文書より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-16 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

---

## 7. 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/ecs/task-definition-construct.ts` | Construct 実装 |
| `infra/test/construct/ecs/task-definition-construct.test.ts` | テストファイル |

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 38 | 90% | EARS要件定義書・設計文書を参考にした確実な要件 |
| 🟡 黄信号 | 4 | 10% | EARS要件定義書・設計文書から妥当な推測による要件 |
| 🔴 赤信号 | 0 | 0% | 推測による要件（なし） |

**品質評価**: ✅ 高品質 - 要件の大部分が要件定義書・設計文書により確認済み

---

## 9. 次のステップ

要件定義フェーズ完了後、以下のコマンドでテストケースの洗い出しを行います：

```
/tsumiki:tdd-testcases aws-cdk-serverless-architecture TASK-0014
```
