# TASK-0021: CloudWatch Logs 設定 - TDD開発タスクノート

**作成日時**: 2026-02-01
**タスクID**: TASK-0021
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 4 - 配信・運用

---

## 1. 技術スタック

### 1.1 開発環境

| 項目 | 技術/ツール |
|------|------------|
| IaC フレームワーク | AWS CDK v2 (2.213.0) |
| 言語 | TypeScript (strict mode) |
| テストフレームワーク | Jest (29.7.0) |
| リージョン | ap-northeast-1 (Tokyo) |

### 1.2 対象 AWS リソース

| リソース | 用途 | 要件 |
|----------|------|------|
| CloudWatch Log Group | ECS/RDS/VPC Flow Logs の収集 | REQ-035 |
| CloudWatch Log Group (Retention) | 環境別ログ保持期間設定 | REQ-036, REQ-037, REQ-102 |
| KMS Key | Log Group 暗号化 | セキュリティベストプラクティス |
| Kinesis Data Firehose | S3 へのログエクスポート | REQ-038, REQ-101 |
| S3 Bucket | ログアーカイブ・Glacier 移行 | REQ-038, REQ-101 |
| S3 Lifecycle Rule | Glacier への自動移行 | REQ-101 |

### 1.3 依存ライブラリ

```typescript
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
```

### 1.4 アーキテクチャパターン

- **パターン**: 環境別ログ管理 + S3 Glacier 長期保存
- **用途**: ECS、RDS、VPC Flow Logs の収集・保持・アーカイブ
- **利点**:
  - コスト最適化: Dev 環境は短期保持（3日）でコスト削減
  - コンプライアンス: Prod 環境は長期保持（30日）+ Glacier アーカイブ
  - セキュリティ: KMS 暗号化によるログデータ保護
  - 運用性: 環境パラメータによる動的設定

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

---

## 2. 開発ルール

### 2.1 コーディング規約

#### ファイルヘッダー

```typescript
/**
 * [タイトル]
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: [現在のフェーズ]
 *
 * 【機能概要】: ...
 * 【実装方針】: ...
 * 【テスト対応】: TC-LOGS-01 〜 TC-LOGS-XX の全Xテストケースに対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module monitoring/log-group-construct
 */
```

#### 定数定義パターン

```typescript
// ============================================================================
// 【定数定義】: CloudWatch Logs 構成のデフォルト値
// 🔵 信頼性: REQ-035〜038, REQ-101, REQ-102 より
// ============================================================================

/**
 * 【Dev 環境ログ保持期間】: Dev 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-036, REQ-102 より (3日)
 */
const DEV_LOG_RETENTION_DAYS = logs.RetentionDays.THREE_DAYS;

/**
 * 【Prod 環境ログ保持期間】: Prod 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-037 より (30日)
 */
const PROD_LOG_RETENTION_DAYS = logs.RetentionDays.ONE_MONTH;
```

#### インターフェース定義パターン

```typescript
/**
 * LogGroupConstruct の Props インターフェース
 *
 * 【設計方針】: 環境名は必須、その他はオプショナルでデフォルト値を提供
 * 【再利用性】: Dev/Prod 環境で柔軟に設定可能
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface LogGroupConstructProps
 */
export interface LogGroupConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: Log Group 名のプレフィックス、保持期間の決定
   * 【制約】: 'dev' | 'prod'
   * 🔵 信頼性: REQ-042 より
   *
   * @type {'dev' | 'prod'}
   */
  readonly envName: 'dev' | 'prod';
}
```

### 2.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | ケバブケース | `log-group-construct.ts`, `log-export-construct.ts` |
| クラス名 | パスカルケース | `LogGroupConstruct`, `LogExportConstruct` |
| インターフェース名 | パスカルケース | `LogGroupConstructProps` |
| 定数 | スネークケース(大文字) | `DEV_LOG_RETENTION_DAYS`, `PROD_LOG_RETENTION_DAYS` |
| 変数・プロパティ | キャメルケース | `ecsLogGroup`, `rdsLogGroup`, `vpcFlowLogGroup` |
| テストファイル | `*.test.ts` | `log-group-construct.test.ts` |
| Log Group 名 | `/{type}/{env-name}/{service}` | `/ecs/dev/frontend`, `/rds/prod/aurora` |

### 2.3 テスト要件

#### テストファイル構成

```typescript
/**
 * LogGroupConstruct テスト
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-LOGS-01: ECS Log Group 作成確認
 * - TC-LOGS-02: RDS Log Group 作成確認
 * - TC-LOGS-03: VPC Flow Log Group 作成確認
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LogGroupConstruct } from '../../../lib/construct/monitoring/log-group-construct';

describe('LogGroupConstruct', () => {
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

  describe('TC-LOGS-01: ECS Log Group 作成確認', () => {
    // 【テスト目的】: ECS 用 Log Group が作成されること
    // 【テスト内容】: Log Group の存在確認
    // 【期待される動作】: AWS::Logs::LogGroup が作成される
    // 🔵 信頼性: REQ-035 より

    beforeEach(() => {
      new LogGroupConstruct(stack, 'LogGroup', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('ECS 用 Log Group が作成される', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp('/ecs/.*/frontend'),
      });
    });
  });
});
```

#### テスト実行コマンド

```bash
# テスト実行
cd infra && npm test

# 特定テスト実行
npm test -- log-group-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `infra/test/construct/ecs/ecs-cluster-construct.test.ts`
- `infra/test/construct/vpc/vpc-construct.test.ts`

---

## 3. 関連実装

### 3.1 VPC Construct パターン

**ファイル**: `infra/lib/construct/vpc/vpc-construct.ts`

- VPC Flow Logs 用の Log Group 作成に VPC 参照が必要
- プロパティとして vpc を公開

```typescript
// VPC への参照
public readonly vpc: ec2.IVpc;
```

### 3.2 ECS Cluster Construct パターン

**ファイル**: `infra/lib/construct/ecs/ecs-cluster-construct.ts`

- Container Insights 有効化済み（REQ-013）
- ECS タスクのログ出力先として Log Group を使用

```typescript
// Container Insights 設定 (ENHANCED モード)
containerInsightsV2: ecs.ContainerInsights.ENHANCED,
```

### 3.3 Aurora Construct パターン

**ファイル**: `infra/lib/construct/database/aurora-construct.ts`

- RDS ログの出力先として Log Group を使用
- Aurora MySQL のログタイプ: error, general, slowquery, audit

### 3.4 型定義パターン

**ファイル**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

```typescript
/**
 * ログ設定 🔵
 * @description CloudWatch Logs の設定 (REQ-035〜038, REQ-101〜102)
 */
export interface LogsConfig {
  /** ログ保持期間（日数） */
  readonly retentionDays: number;

  /** S3 Glacier へのエクスポート (Prod のみ) */
  readonly exportToGlacier: boolean;

  /** Glacier への移行日数 (Prod: 30 日後) */
  readonly glacierTransitionDays?: number;
}

/**
 * Dev 環境ログ設定 🔵
 */
export const DEV_LOGS_CONFIG: LogsConfig = {
  retentionDays: 3,
  exportToGlacier: false,
};

/**
 * Prod 環境ログ設定 🔵
 */
export const PROD_LOGS_CONFIG: LogsConfig = {
  retentionDays: 30,
  exportToGlacier: true,
  glacierTransitionDays: 30,
};
```

**参照元**:
- `infra/lib/construct/vpc/vpc-construct.ts`
- `infra/lib/construct/ecs/ecs-cluster-construct.ts`
- `infra/lib/construct/database/aurora-construct.ts`

---

## 4. 設計文書

### 4.1 アーキテクチャ位置づけ

CloudWatch Logs は Ops Stack に属し、以下の依存関係を持つ:

```
VPC Stack → Security Stack → Database Stack → Application Stack
                                                    ↓
                                              Distribution Stack
                                                    ↓
                                                Ops Stack
                                                    ↓
                                           CloudWatch Logs
                                           (本 Construct)
                                                    ↓
                                           S3 Glacier Export
                                           (Prod 環境のみ)
```

### 4.2 Log Groups 仕様

| Log Group | Log Group 名 | 用途 | 根拠 |
|-----------|--------------|------|------|
| ECS Frontend | `/ecs/{env-name}/frontend` | Frontend ECS Service ログ | REQ-035 |
| ECS Backend | `/ecs/{env-name}/backend` | Backend ECS Service ログ | REQ-035 |
| RDS Aurora | `/rds/{env-name}/aurora` | Aurora MySQL ログ | REQ-035 |
| VPC Flow Logs | `/vpc/{env-name}/flow-logs` | VPC Flow Logs | REQ-035 |

### 4.3 環境別 Retention 設定

| 環境 | 保持期間 | Glacier Export | 根拠 |
|------|----------|----------------|------|
| Dev | 3 日 | 無効 | REQ-036, REQ-102 |
| Prod | 30 日 | 有効 (30日後移行) | REQ-037, REQ-038, REQ-101 |

### 4.4 Props インターフェース設計

```typescript
export interface LogGroupConstructProps {
  /**
   * 環境名 (必須)
   * 【用途】: Log Group 名のプレフィックス、保持期間の決定
   */
  readonly envName: 'dev' | 'prod';

  /**
   * ログ保持期間 (オプション)
   * @default Dev: THREE_DAYS, Prod: ONE_MONTH
   */
  readonly retentionDays?: logs.RetentionDays;

  /**
   * KMS 暗号化有効化 (オプション)
   * @default true
   */
  readonly enableEncryption?: boolean;

  /**
   * KMS キー (オプション)
   * @default 新規作成
   */
  readonly encryptionKey?: kms.IKey;
}

export interface LogExportConstructProps {
  /**
   * 環境名 (必須)
   */
  readonly envName: 'dev' | 'prod';

  /**
   * エクスポート対象 Log Groups (必須)
   */
  readonly logGroups: logs.ILogGroup[];

  /**
   * Glacier 移行日数 (オプション)
   * @default 30
   */
  readonly glacierTransitionDays?: number;

  /**
   * エクスポート有効化 (オプション)
   * @default Prod: true, Dev: false
   */
  readonly enableExport?: boolean;
}
```

### 4.5 出力プロパティ設計

```typescript
export class LogGroupConstruct extends Construct {
  /**
   * ECS Frontend Log Group
   */
  public readonly ecsFrontendLogGroup: logs.ILogGroup;

  /**
   * ECS Backend Log Group
   */
  public readonly ecsBackendLogGroup: logs.ILogGroup;

  /**
   * RDS Aurora Log Group
   */
  public readonly rdsLogGroup: logs.ILogGroup;

  /**
   * VPC Flow Log Group
   */
  public readonly vpcFlowLogGroup: logs.ILogGroup;

  /**
   * KMS 暗号化キー
   */
  public readonly encryptionKey?: kms.IKey;
}

export class LogExportConstruct extends Construct {
  /**
   * S3 アーカイブバケット
   */
  public readonly archiveBucket?: s3.IBucket;

  /**
   * Kinesis Data Firehose Delivery Stream
   */
  public readonly deliveryStream?: firehose.CfnDeliveryStream;
}
```

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0021.md`

---

## 5. テスト要件

### 5.1 Log Groups 作成テスト

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-01 | ECS Frontend Log Group 作成確認 | `/ecs/{env}/frontend` Log Group が作成される | REQ-035 |
| TC-LOGS-02 | ECS Backend Log Group 作成確認 | `/ecs/{env}/backend` Log Group が作成される | REQ-035 |
| TC-LOGS-03 | RDS Aurora Log Group 作成確認 | `/rds/{env}/aurora` Log Group が作成される | REQ-035 |
| TC-LOGS-04 | VPC Flow Log Group 作成確認 | `/vpc/{env}/flow-logs` Log Group が作成される | REQ-035 |

### 5.2 Retention 設定テスト

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-05 | Dev 環境保持期間確認 | RetentionInDays が 3 に設定される | REQ-036, REQ-102 |
| TC-LOGS-06 | Prod 環境保持期間確認 | RetentionInDays が 30 に設定される | REQ-037 |
| TC-LOGS-07 | 環境パラメータ動的設定確認 | envName による保持期間自動設定 | REQ-036, REQ-037 |
| TC-LOGS-08 | カスタム保持期間設定確認 | retentionDays オーバーライド | 設計仕様 |

### 5.3 暗号化テスト

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-09 | KMS キー作成確認 | AWS::KMS::Key が作成される | セキュリティベストプラクティス |
| TC-LOGS-10 | Log Group 暗号化設定確認 | KmsKeyId が設定される | セキュリティベストプラクティス |
| TC-LOGS-11 | カスタムKMSキー使用確認 | 外部提供 KMS キーの使用 | 設計仕様 |
| TC-LOGS-12 | 暗号化無効時の動作確認 | KmsKeyId が設定されない | 設計仕様 |

### 5.4 S3 Glacier Export テスト (Prod 環境)

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-13 | S3 アーカイブバケット作成確認 | AWS::S3::Bucket が作成される | REQ-038 |
| TC-LOGS-14 | Lifecycle Rule 設定確認 | GlacierDeepArchive 移行ルール | REQ-101 |
| TC-LOGS-15 | Firehose 作成確認 | AWS::KinesisFirehose::DeliveryStream が作成される | REQ-038 |
| TC-LOGS-16 | Subscription Filter 確認 | Log Group → Firehose 連携 | REQ-038 |
| TC-LOGS-17 | Dev 環境エクスポート無効確認 | Dev 環境では S3 Export が作成されない | REQ-102 |

### 5.5 公開プロパティテスト

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-18 | ecsFrontendLogGroup プロパティ確認 | プロパティが定義・アクセス可能 | 設計仕様 |
| TC-LOGS-19 | ecsBackendLogGroup プロパティ確認 | プロパティが定義・アクセス可能 | 設計仕様 |
| TC-LOGS-20 | rdsLogGroup プロパティ確認 | プロパティが定義・アクセス可能 | 設計仕様 |
| TC-LOGS-21 | vpcFlowLogGroup プロパティ確認 | プロパティが定義・アクセス可能 | 設計仕様 |
| TC-LOGS-22 | encryptionKey プロパティ確認 | プロパティが定義・アクセス可能 | 設計仕様 |

### 5.6 スナップショットテスト

| テストID | テスト概要 | 検証項目 | 根拠 |
|----------|-----------|----------|------|
| TC-LOGS-23 | Dev 環境テンプレート確認 | 期待通りのテンプレートが生成される | CDK ベストプラクティス |
| TC-LOGS-24 | Prod 環境テンプレート確認 | 期待通りのテンプレートが生成される | CDK ベストプラクティス |

---

## 6. 注意事項

### 6.1 技術的制約

#### Log Group 命名規則

- Log Group 名は一意である必要がある
- 環境名を含めることで Dev/Prod の分離を実現
- 命名パターン: `/{type}/{env-name}/{service}`

```typescript
// Log Group 命名例
const logGroupName = `/ecs/${props.envName}/frontend`;
```

#### KMS 暗号化の制約

- KMS キーには Log Group からのアクセスを許可するポリシーが必要
- 同一リージョン内の KMS キーのみ使用可能

```typescript
// KMS キーポリシー設定
const kmsKey = new kms.Key(this, 'LogsEncryptionKey', {
  enableKeyRotation: true,
  description: 'KMS key for CloudWatch Logs encryption',
});

// CloudWatch Logs への使用許可
kmsKey.grantEncryptDecrypt(new iam.ServicePrincipal('logs.ap-northeast-1.amazonaws.com'));
```

#### S3 Glacier 移行の制約

- Glacier 移行は最小 30 日後（Glacier Deep Archive の場合は 180 日後が推奨）
- オブジェクトのサイズが小さい場合、ストレージコストが増加する可能性あり

```typescript
// S3 Lifecycle Rule 設定
bucket.addLifecycleRule({
  transitions: [
    {
      storageClass: s3.StorageClass.GLACIER,
      transitionAfter: cdk.Duration.days(30),
    },
  ],
});
```

### 6.2 セキュリティ要件

#### ログデータ暗号化

- すべての Log Group は KMS で暗号化（デフォルト有効）
- Customer Managed Key (CMK) を使用

#### S3 バケットセキュリティ

- バケットポリシーで Firehose からのアクセスのみ許可
- パブリックアクセスブロック有効化
- サーバーサイド暗号化 (SSE-S3 または SSE-KMS)

### 6.3 パフォーマンス要件

#### ログ保持期間によるコスト最適化

- Dev 環境: 3 日間で自動削除（コスト最小化）
- Prod 環境: 30 日間 CloudWatch 保持、以降 Glacier アーカイブ

#### Firehose バッファリング設定

- バッファサイズ: 5 MB（推奨）
- バッファインターバル: 300 秒（推奨）

### 6.4 依存タスク

| タスクID | タスク名 | 関係 | ステータス |
|----------|----------|------|-----------|
| TASK-0020 | Distribution Stack 統合 | 前提 | 完了予定 |
| TASK-0022 | CloudWatch Alarms + Chatbot 設定 | 後続 | 未着手 |
| TASK-0002 | VPC Construct 実装 | 参照（VPC Flow Logs 用） | 完了 |
| TASK-0012 | ECS Cluster Construct 実装 | 参照（ECS ログ用） | 完了 |
| TASK-0008 | Aurora Construct 実装 | 参照（RDS ログ用） | 完了 |

### 6.5 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- RemovalPolicy を適切に設定（Prod: RETAIN, Dev: DESTROY）
- Log Group リソースは `logs.LogGroup` を使用

```typescript
// RemovalPolicy の環境別設定
const removalPolicy = props.envName === 'prod'
  ? cdk.RemovalPolicy.RETAIN
  : cdk.RemovalPolicy.DESTROY;
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-035〜038, REQ-101, REQ-102)
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

---

## 7. 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/monitoring/log-group-construct.ts` | Log Group Construct 実装 |
| `infra/lib/construct/monitoring/log-export-construct.ts` | S3 Export Construct 実装 |
| `infra/test/construct/monitoring/log-group-construct.test.ts` | Log Group テストファイル |
| `infra/test/construct/monitoring/log-export-construct.test.ts` | S3 Export テストファイル |

---

## 8. TDD 実行手順

### 8.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0021` - 詳細要件定義
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
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0021.md` - タスク定義

### 9.2 既存実装参照

- `infra/lib/construct/vpc/vpc-construct.ts` - VPC Construct パターン
- `infra/lib/construct/ecs/ecs-cluster-construct.ts` - ECS Cluster Construct パターン
- `infra/lib/construct/database/aurora-construct.ts` - Aurora Construct パターン
- `infra/test/construct/vpc/vpc-construct.test.ts` - テストパターン

### 9.3 AWS ドキュメント

- [AWS CDK Logs Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs-readme.html)
- [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [CloudWatch Logs Encryption](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)
- [Kinesis Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [S3 Glacier](https://docs.aws.amazon.com/amazonglacier/latest/dev/introduction.html)

---

## 10. デフォルト定数設計

```typescript
// ============================================================================
// 【定数定義】: CloudWatch Logs 構成のデフォルト値
// 🔵 信頼性: REQ-035〜038, REQ-101, REQ-102 より
// ============================================================================

/**
 * 【Dev 環境ログ保持期間】: Dev 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-036, REQ-102 より (3日)
 */
const DEV_LOG_RETENTION_DAYS = logs.RetentionDays.THREE_DAYS;

/**
 * 【Prod 環境ログ保持期間】: Prod 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-037 より (30日)
 */
const PROD_LOG_RETENTION_DAYS = logs.RetentionDays.ONE_MONTH;

/**
 * 【Glacier 移行日数】: S3 Glacier への移行日数
 * 🔵 信頼性: REQ-101 より (30日後)
 */
const DEFAULT_GLACIER_TRANSITION_DAYS = 30;

/**
 * 【Log Group プレフィックス - ECS】: ECS ログ用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
const LOG_GROUP_PREFIX_ECS = '/ecs';

/**
 * 【Log Group プレフィックス - RDS】: RDS ログ用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
const LOG_GROUP_PREFIX_RDS = '/rds';

/**
 * 【Log Group プレフィックス - VPC】: VPC Flow Logs 用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
const LOG_GROUP_PREFIX_VPC = '/vpc';

/**
 * 【デフォルト暗号化設定】: Log Group 暗号化のデフォルト
 * 🔵 信頼性: セキュリティベストプラクティスより
 */
const DEFAULT_ENABLE_ENCRYPTION = true;

/**
 * 【Firehose バッファサイズ】: Firehose のバッファサイズ (MB)
 * 🟡 信頼性: AWS 推奨設定
 */
const DEFAULT_FIREHOSE_BUFFER_SIZE_MB = 5;

/**
 * 【Firehose バッファインターバル】: Firehose のバッファインターバル (秒)
 * 🟡 信頼性: AWS 推奨設定
 */
const DEFAULT_FIREHOSE_BUFFER_INTERVAL_SECONDS = 300;
```

---

**信頼性レベルサマリー**:
- 🔵 青信号: 要件定義書・設計文書より確認済み (REQ-035〜038, REQ-101, REQ-102)
- 🟡 黄信号: AWS 推奨設定・妥当な推測による設計
- 🔴 赤信号: 推測による設計（なし）

**品質評価**: 高品質 - 対象要件が明確で、環境別設定パターンが確立されている
