# TASK-0015: ECS Service Construct 実装 - TDD開発タスクノート

**作成日時**: 2026-01-28
**タスクID**: TASK-0015
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
| ECS Fargate Service | Fargate サービス作成 | REQ-019, REQ-020, REQ-021 |
| ECS Exec | コンテナへのインタラクティブアクセス | REQ-019 |
| Service Connect | サービス間通信 | REQ-021 |
| Desired Count | タスク数設定（2以上） | REQ-020, NFR-004 |

### 1.3 依存ライブラリ

```typescript
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
```

### 1.4 アーキテクチャパターン

- **パターン**: Frontend/Backend 分離アーキテクチャ + Service Connect
- **用途**: Frontend と Backend を別々の ECS Service として構成
- **利点**:
  - 独立したスケーリング: Frontend と Backend を個別にスケール可能
  - 独立したデプロイ: サービスごとに独立してデプロイ可能
  - 運用性: ECS Exec で各サービスに接続して操作可能
  - サービス間通信: Service Connect による内部通信の最適化

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
| ファイル名 | ケバブケース | `ecs-service-construct.ts` |
| クラス名 | パスカルケース | `EcsServiceConstruct` |
| インターフェース名 | パスカルケース | `EcsServiceConstructProps` |
| 定数 | スネークケース(大文字) | `DEFAULT_DESIRED_COUNT`, `DEFAULT_MIN_HEALTHY_PERCENT` |
| 変数・プロパティ | キャメルケース | `ecsService`, `desiredCount` |
| テストファイル | `*.test.ts` | `ecs-service-construct.test.ts` |

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
import { EcsServiceConstruct } from '../../../lib/construct/ecs/ecs-service-construct';

describe('EcsServiceConstruct', () => {
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
      template.hasResourceProperties('AWS::ECS::Service', {
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
npm test -- ecs-service-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `docs/implements/aws-cdk-serverless-architecture/TASK-0012/note.md`
- `docs/implements/aws-cdk-serverless-architecture/TASK-0014/note.md`
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

### 3.2 Task Definition Construct パターン

**ファイル**: `infra/lib/construct/ecs/task-definition-construct.ts`

- App Container + Sidecar Container のマルチコンテナ構成
- Task Role と Execution Role の IAM 設定
- CloudWatch Logs への awslogs ドライバー設定
- 環境変数による Sidecar 設定（TARGET_HOST, TARGET_PORT, MODE）

```typescript
// 【Task Definition 作成】
this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
  cpu: cpu,
  memoryLimitMiB: memoryMiB,
  taskRole: taskRole,
  executionRole: props.executionRole,
});

// 【App Container 作成】
this.appContainer = this.taskDefinition.addContainer(APP_CONTAINER_NAME, {
  image: ecs.ContainerImage.fromEcrRepository(props.appRepository),
  essential: true,
  logging: appLogDriver,
  environment: appEnvironment,
  portMappings: [{ containerPort: appContainerPort }],
});

// 【Sidecar Container 作成】
this.sidecarContainer = this.taskDefinition.addContainer(SIDECAR_CONTAINER_NAME, {
  image: ecs.ContainerImage.fromEcrRepository(props.sidecarRepository),
  essential: false,
  logging: sidecarLogDriver,
  environment: {
    TARGET_HOST: props.auroraEndpoint,
    TARGET_PORT: auroraPort.toString(),
    MODE: sidecarMode,
  },
});
```

### 3.3 IAM Role Construct パターン

**ファイル**: `infra/lib/construct/security/iam-role-construct.ts`

- Task Role と Execution Role の2つの IAM Role を作成
- 最小権限の原則に基づく設計
- AmazonSSMManagedInstanceCore (ECS Exec 用)

**参照元**:
- `infra/lib/construct/ecs/ecs-cluster-construct.ts`
- `infra/lib/construct/ecs/task-definition-construct.ts`
- `infra/lib/construct/security/iam-role-construct.ts`

---

## 4. 設計文書

### 4.1 アーキテクチャ位置づけ

ECS Service は Application Stack に属し、以下の依存関係を持つ:

```
VPC Stack → Security Stack → Application Stack
                              ↓
                          ECS Cluster → Task Definition → Service
                                                          ↑
                                                          本 Construct
```

### 4.2 ECS Service 仕様

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| 起動タイプ | Fargate | REQ-012 より |
| Desired Count | 2 以上 | REQ-020, NFR-004 |
| enableExecuteCommand | true | REQ-019 |
| デプロイメント | Rolling Update | 設計文書 |
| Minimum Healthy Percent | 50% | 設計文書 |
| Maximum Percent | 200% | 設計文書 |

### 4.3 型定義インターフェース

```typescript
// docs/design/aws-cdk-serverless-architecture/interfaces.ts より

/**
 * ECS Service 設定 🔵
 * @description ECS Service の設定 (REQ-019〜021)
 */
export interface EcsServiceConfig {
  /** Desired Count (2 以上) */
  readonly desiredCount: number;

  /** ECS Exec 有効化 */
  readonly enableExecuteCommand: boolean;

  /** デプロイメント設定 */
  readonly deployment: DeploymentConfig;
}

/**
 * デプロイメント設定 🟡
 * @description ECS デプロイメントの設定
 */
export interface DeploymentConfig {
  /** 最小ヘルシーパーセント */
  readonly minimumHealthyPercent: number;

  /** 最大パーセント */
  readonly maximumPercent: number;
}
```

### 4.4 Props インターフェース設計

```typescript
export interface EcsServiceConstructProps {
  /**
   * ECS Cluster (必須)
   * 【用途】: Service を作成するクラスター
   */
  readonly cluster: ecs.ICluster;

  /**
   * Task Definition (必須)
   * 【用途】: Service が使用するタスク定義
   */
  readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * Security Group (必須)
   * 【用途】: タスクのネットワーク設定
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * VPC Subnets (必須)
   * 【用途】: タスクを実行するサブネット
   */
  readonly subnets: ec2.SubnetSelection;

  /**
   * Service 名 (オプション)
   * @default 自動生成
   */
  readonly serviceName?: string;

  /**
   * Desired Count (オプション)
   * @default 2 🔵 REQ-020
   */
  readonly desiredCount?: number;

  /**
   * ECS Exec 有効化 (オプション)
   * @default true 🔵 REQ-019
   */
  readonly enableExecuteCommand?: boolean;

  /**
   * Minimum Healthy Percent (オプション)
   * @default 50
   */
  readonly minimumHealthyPercent?: number;

  /**
   * Maximum Percent (オプション)
   * @default 200
   */
  readonly maximumPercent?: number;

  /**
   * Target Group (オプション)
   * 【用途】: ALB との連携
   */
  readonly targetGroup?: elb.IApplicationTargetGroup;

  /**
   * Service Connect 設定 (オプション)
   * 【用途】: サービス間通信
   */
  readonly serviceConnectConfiguration?: ecs.ServiceConnectProps;
}
```

### 4.5 出力プロパティ設計

```typescript
export class EcsServiceConstruct extends Construct {
  /**
   * ECS Service
   */
  public readonly service: ecs.FargateService;
}
```

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. 注意事項

### 5.1 技術的制約

#### ECS Exec の前提条件

ECS Exec を有効化するには以下が必要:
- Task Role に `AmazonSSMManagedInstanceCore` ポリシーが必要
- VPC Endpoint (ssm, ssmmessages, ec2messages) が必要
- Service の `enableExecuteCommand: true` 設定

```typescript
// ECS Exec 用の Task Role ポリシー
taskRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
);
```

#### Desired Count の制約

- 高可用性確保のため、Desired Count は 2 以上を設定（REQ-020）
- デフォルト値を 2 として実装

```typescript
const DEFAULT_DESIRED_COUNT = 2;
```

### 5.2 セキュリティ要件

#### Security Group 設定

- Service の Security Group は最小権限の原則に基づく
- Inbound: ALB Security Group からのトラフィックのみ許可
- Outbound: VPC Endpoint、Aurora Security Group への通信を許可

#### ECS Exec のセキュリティ

- ECS Exec は運用目的でのみ使用
- IAM ポリシーで適切なアクセス制御を実施
- 本番環境では監査ログの有効化を推奨

### 5.3 パフォーマンス要件

#### Rolling Update 設定

- `minimumHealthyPercent: 50` - デプロイ中も最低 50% のタスクを維持
- `maximumPercent: 200` - デプロイ中に最大 2 倍のタスクを許可

#### サービス自動復旧

- Fargate Service は異常タスクを自動的に置き換え
- Desired Count を維持するための自動スケーリング

### 5.4 依存タスク

| タスクID | タスク名 | 関係 |
|----------|----------|------|
| TASK-0012 | ECS Cluster Construct 実装 | 前提（Cluster が必要）✅ 完了 |
| TASK-0014 | Task Definition Construct 実装 | 前提（Task Definition が必要）✅ 完了 |
| TASK-0010 | VPC Construct 実装 | 前提（Subnets が必要）✅ 完了 |
| TASK-0009 | Security Group Construct 実装 | 前提（Security Group が必要）✅ 完了 |

### 5.5 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- Stack 間の依存関係は CDK が自動解決
- Fargate Service は `ecs.FargateService` を使用

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-019〜021)
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/ecs/task-definition-construct.ts`

---

## 6. テストケース概要

### 6.1 基本テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-01 | ECS Service リソース作成確認 | AWS::ECS::Service が 1 つ作成される |
| TC-SERVICE-02 | Launch Type 確認 | LaunchType が FARGATE に設定される |
| TC-SERVICE-03 | Desired Count 確認 | DesiredCount が 2 以上に設定される |
| TC-SERVICE-04 | ECS Exec 有効化確認 | EnableExecuteCommand が true に設定される |

### 6.2 デプロイメント設定テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-05 | Minimum Healthy Percent 確認 | DeploymentConfiguration.MinimumHealthyPercent が設定される |
| TC-SERVICE-06 | Maximum Percent 確認 | DeploymentConfiguration.MaximumPercent が設定される |

### 6.3 ネットワーク設定テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-07 | Network Configuration 確認 | NetworkConfiguration が設定される |
| TC-SERVICE-08 | Security Group 確認 | SecurityGroups が設定される |
| TC-SERVICE-09 | Subnets 確認 | Subnets が設定される |
| TC-SERVICE-10 | Public IP 無効確認 | AssignPublicIp が DISABLED |

### 6.4 ALB 連携テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-11 | Target Group 連携確認 | LoadBalancers が設定される |
| TC-SERVICE-12 | Container Name 確認 | 正しい Container Name が設定される |
| TC-SERVICE-13 | Container Port 確認 | 正しい Container Port が設定される |

### 6.5 デフォルト値テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-14 | Desired Count デフォルト値確認 | 未指定時に 2 が設定される |
| TC-SERVICE-15 | ECS Exec デフォルト値確認 | 未指定時に true が設定される |
| TC-SERVICE-16 | Min Healthy デフォルト値確認 | 未指定時に 50 が設定される |
| TC-SERVICE-17 | Max Percent デフォルト値確認 | 未指定時に 200 が設定される |

### 6.6 公開プロパティテストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-18 | service プロパティ確認 | service プロパティが定義されている |

### 6.7 スナップショットテスト

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-19 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

---

## 7. 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/ecs/ecs-service-construct.ts` | Construct 実装 |
| `infra/test/construct/ecs/ecs-service-construct.test.ts` | テストファイル |

---

## 8. TDD 実行手順

### 8.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0015` - 詳細要件定義
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

### 9.2 既存実装参照

- `infra/lib/construct/ecs/ecs-cluster-construct.ts` - ECS Cluster 実装パターン
- `infra/lib/construct/ecs/task-definition-construct.ts` - Task Definition 実装パターン
- `infra/lib/construct/security/iam-role-construct.ts` - IAM Role 実装パターン
- `infra/test/construct/ecs/ecs-cluster-construct.test.ts` - テストパターン
- `infra/test/construct/ecs/task-definition-construct.test.ts` - テストパターン

### 9.3 AWS ドキュメント

- [AWS CDK ECS Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)
- [Amazon ECS Services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html)
- [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- [Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)

---

**信頼性レベルサマリー**:
- 🔵 青信号: 要件定義書・設計文書より確認済み
- 🟡 黄信号: 妥当な推測による設計
- 🔴 赤信号: 推測による設計（なし）

**品質評価**: 高品質 - 対象要件が明確で、既存実装パターン（ECS Cluster, Task Definition）が確立されている
