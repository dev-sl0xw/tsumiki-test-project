# TASK-0014: Task Definition Construct 実装 - TDD開発タスクノート

**作成日時**: 2026-01-27
**タスクID**: TASK-0014
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション

---

## 1. 技術スタック

### 1.1 開発環境

| 項目 | 技術/ツール |
|------|------------|
| IaC フレームワーク | AWS CDK v2 |
| 言語 | TypeScript (strict mode) |
| テストフレームワーク | Jest |
| リージョン | ap-northeast-1 (Tokyo) |

### 1.2 対象 AWS リソース

| リソース | 用途 | 要件 |
|----------|------|------|
| ECS Fargate Task Definition | タスク定義 | REQ-014 |
| App Container | アプリケーションコンテナ | REQ-015 |
| Sidecar Container | プロキシ/デバッグ用コンテナ | REQ-015, REQ-016, REQ-017 |
| IAM Task Role | タスク実行時の権限 | REQ-018 |
| IAM Execution Role | タスク起動時の権限 | CDK ベストプラクティス |
| CloudWatch Logs | コンテナログ出力 | REQ-035 |

### 1.3 依存ライブラリ

```typescript
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
```

### 1.4 アーキテクチャパターン

- **パターン**: Sidecar Pattern
- **用途**: App Container と Sidecar Container のマルチコンテナ構成
- **利点**:
  - セキュリティ: App Container は Aurora Endpoint を直接知らない
  - 運用性: ECS Exec で Sidecar に接続して DB 操作可能
  - 柔軟性: Sidecar で追加のセキュリティ処理が可能

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 2. 開発ルール

### 2.1 コーディング規約

#### ファイルヘッダー

```typescript
/**
 * [タイトル]
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: [現在のフェーズ]
 *
 * 【機能概要】: ...
 * 【実装方針】: ...
 * 【テスト対応】: TC-XXX-01 〜 TC-XXX-XX の全Xテストケースに対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module [モジュール名]
 */
```

#### 定数定義パターン

```typescript
// ============================================================================
// 【定数定義】: [説明]
// 🔵 信頼性: [根拠]
// ============================================================================

/**
 * 【定数名】: [説明]
 * 🔵 信頼性: [要件番号] より
 */
const DEFAULT_XXX = 'value';
```

#### インターフェース定義パターン

```typescript
/**
 * [Construct名] の Props インターフェース
 *
 * 【設計方針】: [説明]
 * 【再利用性】: [説明]
 * 🔵 信頼性: [根拠]
 *
 * @interface [Interface名]
 */
export interface XxxConstructProps {
  /**
   * [プロパティ説明]
   *
   * 【用途】: [説明]
   * 【デフォルト】: [値]
   * 🔵 信頼性: [根拠]
   *
   * @default [デフォルト値]
   * @type {[型]}
   */
  readonly propName?: PropType;
}
```

### 2.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | ケバブケース | `task-definition-construct.ts` |
| クラス名 | パスカルケース | `TaskDefinitionConstruct` |
| インターフェース名 | パスカルケース | `TaskDefinitionConstructProps` |
| 定数 | スネークケース(大文字) | `DEFAULT_CPU`, `DEFAULT_MEMORY_MIB` |
| 変数・プロパティ | キャメルケース | `taskDefinition`, `appContainer` |
| テストファイル | `*.test.ts` | `task-definition-construct.test.ts` |

### 2.3 テスト要件

#### テストファイル構成

```typescript
/**
 * [Construct名] テスト
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-XXX-01: [テスト概要]
 * - TC-XXX-02: [テスト概要]
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { TaskDefinitionConstruct } from '../../../lib/construct/ecs/task-definition-construct';

describe('TaskDefinitionConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  describe('TC-XXX-01: [テスト概要]', () => {
    // 【テスト目的】: [説明]
    // 【テスト内容】: [説明]
    // 【期待される動作】: [説明]
    // 🔵 信頼性: [要件番号] より

    beforeEach(() => {
      // テスト対象の Construct をインスタンス化
    });

    test('[テスト名]', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ...
      });
    });
  });
});
```

#### テスト実行コマンド

```bash
# テスト実行
npm test

# 特定テスト実行
npm test -- task-definition-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `docs/implements/aws-cdk-serverless-architecture/TASK-0012/note.md`
- `infra/test/construct/ecs/ecs-cluster-construct.test.ts`

---

## 3. 関連実装

### 3.1 ECS Cluster Construct パターン

**ファイル**: `infra/lib/construct/ecs/ecs-cluster-construct.ts`

- デフォルト値を定数として外出し
- Props のオプショナルプロパティにデフォルト値を提供
- JSDoc による詳細なドキュメント
- 信頼性レベルの明記
- containerInsightsV2 API の使用（最新 API）

```typescript
// 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
const containerInsightsEnabled = props.containerInsights ?? DEFAULT_CONTAINER_INSIGHTS_ENABLED;

// 【ECS Cluster 作成】
this.cluster = new ecs.Cluster(this, 'Cluster', {
  vpc: props.vpc,
  clusterName: props.clusterName,
  containerInsightsV2: containerInsightsV2Setting,
});
```

### 3.2 IAM Role Construct パターン

**ファイル**: `infra/lib/construct/security/iam-role-construct.ts`

- Task Role と Execution Role の2つの IAM Role を作成
- 最小権限の原則に基づく設計
- AmazonSSMManagedInstanceCore (ECS Exec 用)
- secretsmanager:GetSecretValue (DB 認証情報取得用)
- AmazonECSTaskExecutionRolePolicy (ECR Pull + CloudWatch Logs 用)

```typescript
// 【ECS Task Role 作成】
const taskRole = new iam.Role(this, 'EcsTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: DESCRIPTION_TASK_ROLE,
});

taskRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
);

taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: secretArns,
  })
);
```

### 3.3 Sidecar Container イメージ

**ファイル**: `docker/sidecar/Dockerfile`, `docker/sidecar/entrypoint.sh`

- Alpine Linux 3.19 ベース（軽量: 9.56MB）
- socat + netcat-openbsd インストール
- 2つの動作モード:
  - `proxy`: socat によるポートフォワーディング
  - `sleep`: ECS Exec デバッグ用の待機モード
- 環境変数:
  - `MODE`: proxy | sleep
  - `TARGET_HOST`: フォワーディング先ホスト
  - `TARGET_PORT`: フォワーディング先ポート
  - `LISTEN_PORT`: リッスンポート (default: 8080)
  - `LOG_LEVEL`: error | warn | info | debug

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache socat netcat-openbsd
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost ${LISTEN_PORT:-8080} || exit 1
```

**参照元**:
- `infra/lib/construct/ecs/ecs-cluster-construct.ts`
- `infra/lib/construct/security/iam-role-construct.ts`
- `docker/sidecar/Dockerfile`
- `docker/sidecar/entrypoint.sh`

---

## 4. 設計文書

### 4.1 アーキテクチャ位置づけ

Task Definition は Application Stack に属し、以下の依存関係を持つ:

```
VPC Stack → Security Stack → Application Stack
                              ↓
                          ECS Cluster → Task Definition → Service
                                        ↑
                                        本 Construct
```

### 4.2 Task Definition 仕様

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| CPU | 512 (0.5 vCPU) | REQ-014, ユーザヒアリング |
| Memory | 1024 MiB (1 GB) | REQ-014, ユーザヒアリング |
| Network Mode | awsvpc | Fargate 必須 |
| Task Role | AmazonSSMManagedInstanceCore + Secrets Manager | REQ-018 |
| Execution Role | AmazonECSTaskExecutionRolePolicy | CDK ベストプラクティス |

### 4.3 Container 構成

#### App Container

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| Essential | true | メインコンテナ |
| Port | 3000 (設定可能) | アプリケーション依存 |
| HealthCheck Path | /health (設定可能) | アプリケーション依存 |
| Logging | awslogs | REQ-035 |

#### Sidecar Container

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| Essential | false | 補助コンテナ |
| Listen Port | 8080 (設定可能) | LISTEN_PORT 環境変数 |
| Target Port | 3306 (Aurora) | TARGET_PORT 環境変数 |
| Mode | proxy または sleep | MODE 環境変数 |
| Logging | awslogs | REQ-035 |

### 4.4 型定義インターフェース

```typescript
// docs/design/aws-cdk-serverless-architecture/interfaces.ts より

/**
 * タスク定義設定 🔵
 * @description ECS タスク定義の設定 (REQ-014〜018)
 */
export interface TaskDefinitionConfig {
  /** CPU (512 = 0.5 vCPU) */
  readonly cpu: 256 | 512 | 1024 | 2048 | 4096;

  /** Memory (1024 = 1 GB) */
  readonly memoryMiB: number;

  /** アプリケーションコンテナ設定 */
  readonly appContainer: ContainerConfig;

  /** Sidecar コンテナ設定 */
  readonly sidecarContainer: SidecarContainerConfig;
}

/**
 * コンテナ設定 🟡
 */
export interface ContainerConfig {
  readonly name: string;
  readonly image: string;
  readonly containerPort: number;
  readonly healthCheckPath: string;
  readonly environment?: Record<string, string>;
}

/**
 * Sidecar コンテナ設定 🔵
 */
export interface SidecarContainerConfig {
  readonly name: string;
  readonly image: string;
  readonly localPort: number;
  readonly remotePort: number;
}
```

### 4.5 Props インターフェース設計

```typescript
export interface TaskDefinitionConstructProps {
  /**
   * App Container イメージの ECR リポジトリ (必須)
   */
  readonly appRepository: ecr.IRepository;

  /**
   * Sidecar Container イメージの ECR リポジトリ (必須)
   */
  readonly sidecarRepository: ecr.IRepository;

  /**
   * CloudWatch Logs Log Group (必須)
   */
  readonly logGroup: logs.ILogGroup;

  /**
   * Aurora Cluster Endpoint (Sidecar の TARGET_HOST)
   */
  readonly auroraEndpoint: string;

  /**
   * Aurora Port (Sidecar の TARGET_PORT)
   * @default 3306
   */
  readonly auroraPort?: number;

  /**
   * Task Role (オプション)
   * @default 自動作成
   */
  readonly taskRole?: iam.IRole;

  /**
   * Execution Role (オプション)
   * @default 自動作成
   */
  readonly executionRole?: iam.IRole;

  /**
   * CPU (vCPU 単位)
   * @default 512 (0.5 vCPU)
   */
  readonly cpu?: 256 | 512 | 1024 | 2048 | 4096;

  /**
   * Memory (MiB 単位)
   * @default 1024 (1 GB)
   */
  readonly memoryMiB?: number;

  /**
   * App Container のポート
   * @default 3000
   */
  readonly appContainerPort?: number;

  /**
   * App Container の環境変数
   */
  readonly appEnvironment?: Record<string, string>;

  /**
   * Sidecar の動作モード
   * @default 'proxy'
   */
  readonly sidecarMode?: 'proxy' | 'sleep';
}
```

### 4.6 出力プロパティ設計

```typescript
export class TaskDefinitionConstruct extends Construct {
  /**
   * Task Definition
   */
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * App Container Definition
   */
  public readonly appContainer: ecs.ContainerDefinition;

  /**
   * Sidecar Container Definition
   */
  public readonly sidecarContainer: ecs.ContainerDefinition;
}
```

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0014.md`

---

## 5. 注意事項

### 5.1 技術的制約

#### Fargate CPU/Memory 組み合わせ制約

| CPU (vCPU) | Memory (GB) |
|------------|-------------|
| 256 (.25) | 0.5, 1, 2 |
| 512 (.5) | 1, 2, 3, 4 |
| 1024 (1) | 2, 3, 4, 5, 6, 7, 8 |
| 2048 (2) | 4〜16 (1GB 単位) |
| 4096 (4) | 8〜30 (1GB 単位) |

本タスクでは **512 CPU / 1024 MiB (0.5 vCPU / 1 GB)** を使用。

#### Container 依存関係

- App Container: `essential: true` (メインコンテナ、停止時タスク終了)
- Sidecar Container: `essential: false` (補助コンテナ、停止してもタスク継続)
- Sidecar は App Container の起動を待機する設定を推奨

```typescript
sidecarContainer.addContainerDependencies({
  container: appContainer,
  condition: ecs.ContainerDependencyCondition.START,
});
```

### 5.2 セキュリティ要件

#### IAM ポリシー最小権限

- **Task Role**:
  - `AmazonSSMManagedInstanceCore` - ECS Exec 用
  - `secretsmanager:GetSecretValue` - DB 認証情報取得用（特定 ARN 推奨）
- **Execution Role**:
  - `AmazonECSTaskExecutionRolePolicy` - ECR Pull + CloudWatch Logs

#### Secrets Manager 統合

```typescript
// Task Definition で Secrets Manager から環境変数を取得
secrets: {
  DB_PASSWORD: ecs.Secret.fromSecretsManager(secret, 'password'),
}
```

### 5.3 パフォーマンス要件

#### リソース割り当て

- CPU: 512 (0.5 vCPU) - 開発環境向け、本番では 1024 以上推奨
- Memory: 1024 MiB (1 GB) - 開発環境向け、本番では 2048 以上推奨

#### ログ設定

- CloudWatch Logs への出力
- ログ保持期間: Dev 3日、Prod 30日 (REQ-036, REQ-037)
- Stream Prefix: `app-`, `sidecar-` で識別

### 5.4 依存タスク

| タスクID | タスク名 | 関係 |
|----------|----------|------|
| TASK-0012 | ECS Cluster Construct 実装 | 前提（Cluster が必要） |
| TASK-0013 | Sidecar Container イメージ作成 | 前提（イメージが必要）✅ 完了 |
| TASK-0015 | ECS Service Construct 実装 | 後続（Task Definition を参照） |

### 5.5 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- Stack 間の依存関係は CDK が自動解決
- Fargate Task Definition は `ecs.FargateTaskDefinition` を使用

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-014〜018, REQ-035〜037)
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/security/iam-role-construct.ts`

---

## 6. テストケース概要

### 6.1 基本テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-01 | Task Definition リソース作成確認 | AWS::ECS::TaskDefinition が 1 つ作成される |
| TC-TASKDEF-02 | CPU 設定確認 | Cpu が 512 に設定される |
| TC-TASKDEF-03 | Memory 設定確認 | Memory が 1024 に設定される |
| TC-TASKDEF-04 | Network Mode 確認 | NetworkMode が awsvpc に設定される |

### 6.2 Container テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-05 | App Container 作成確認 | ContainerDefinitions に app コンテナが含まれる |
| TC-TASKDEF-06 | Sidecar Container 作成確認 | ContainerDefinitions に sidecar コンテナが含まれる |
| TC-TASKDEF-07 | App Container Essential 確認 | app コンテナの Essential が true |
| TC-TASKDEF-08 | Sidecar Container Essential 確認 | sidecar コンテナの Essential が false |
| TC-TASKDEF-09 | Port Mapping 確認 | app コンテナに正しいポートマッピング |
| TC-TASKDEF-10 | Logging 設定確認 | awslogs ドライバーが設定される |

### 6.3 IAM Role テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-11 | Task Role 参照確認 | TaskRoleArn が設定される |
| TC-TASKDEF-12 | Execution Role 参照確認 | ExecutionRoleArn が設定される |

### 6.4 Sidecar 環境変数テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-TASKDEF-13 | TARGET_HOST 環境変数確認 | Aurora Endpoint が設定される |
| TC-TASKDEF-14 | TARGET_PORT 環境変数確認 | Aurora Port が設定される |
| TC-TASKDEF-15 | MODE 環境変数確認 | proxy または sleep が設定される |

### 6.5 スナップショットテスト

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

## 8. TDD 実行手順

### 8.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0014` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース洗い出し
3. `/tsumiki:tdd-red` - 失敗するテスト実装

### 8.2 Green フェーズ

4. `/tsumiki:tdd-green` - テストを通す最小実装

### 8.3 Refactor フェーズ

5. `/tsumiki:tdd-refactor` - コード品質改善

### 8.4 完了確認

6. `/tsumiki:tdd-verify-complete` - 品質確認・テスト網羅性確認

---

## 9. 参考リソース

### 9.1 プロジェクト内ドキュメント

- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計
- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー設計
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0014.md` - タスク詳細

### 9.2 既存実装参照

- `infra/lib/construct/ecs/ecs-cluster-construct.ts` - ECS Cluster 実装パターン
- `infra/lib/construct/security/iam-role-construct.ts` - IAM Role 実装パターン
- `docker/sidecar/Dockerfile` - Sidecar Container イメージ
- `docker/sidecar/entrypoint.sh` - Sidecar エントリポイント

### 9.3 AWS ドキュメント

- [AWS CDK ECS Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)
- [Amazon ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Fargate Task CPU and Memory](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html)

---

**信頼性レベルサマリー**:
- 🔵 青信号: 要件定義書・設計文書より確認済み
- 🟡 黄信号: 妥当な推測による設計
- 🔴 赤信号: 推測による設計（なし）

**品質評価**: 高品質 - 対象要件が明確で、既存実装パターンが確立されている
