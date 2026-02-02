# CloudWatch Logs Construct 詳細要件定義書

**作成日**: 2026-02-01
**タスクID**: TASK-0021
**フェーズ**: Phase 4 - 配信・運用
**関連タスクノート**: [note.md](note.md)

---

## 1. 機能要件 (Functional Requirements)

### 1.1 Log Groups 作成 (REQ-035)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-001 | システムは ECS Frontend 用の Log Group `/ecs/{env-name}/frontend` を作成しなければならない | 🔵 | REQ-035 |
| FR-002 | システムは ECS Backend 用の Log Group `/ecs/{env-name}/backend` を作成しなければならない | 🔵 | REQ-035 |
| FR-003 | システムは RDS Aurora 用の Log Group `/rds/{env-name}/aurora` を作成しなければならない | 🔵 | REQ-035 |
| FR-004 | システムは VPC Flow Logs 用の Log Group `/vpc/{env-name}/flow-logs` を作成しなければならない | 🔵 | REQ-035 |

### 1.2 環境別 Retention 設定 (REQ-036, REQ-037, REQ-102)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-005 | システムは Dev 環境で Log Group のログ保持期間を 3 日間に設定しなければならない | 🔵 | REQ-036, REQ-102 |
| FR-006 | システムは Prod 環境で Log Group のログ保持期間を 30 日間に設定しなければならない | 🔵 | REQ-037 |
| FR-007 | システムは envName パラメータに基づいて自動的に保持期間を決定しなければならない | 🔵 | REQ-036, REQ-037 |
| FR-008 | システムは retentionDays パラメータによるカスタム保持期間の上書きを許可しなければならない | 🟡 | 設計仕様 |

### 1.3 KMS 暗号化設定 (セキュリティベストプラクティス)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-009 | システムは Log Group 暗号化用の KMS Customer Managed Key (CMK) を作成しなければならない | 🔵 | セキュリティベストプラクティス |
| FR-010 | システムは作成した KMS キーで全ての Log Group を暗号化しなければならない | 🔵 | セキュリティベストプラクティス |
| FR-011 | システムは KMS キーのキーローテーションを有効化しなければならない | 🔵 | セキュリティベストプラクティス |
| FR-012 | システムは外部提供された KMS キーの使用を許可しなければならない | 🟡 | 設計仕様 |
| FR-013 | システムは enableEncryption パラメータで暗号化を無効化できなければならない | 🟡 | 設計仕様 |

### 1.4 S3 Glacier Export 設定 (REQ-038, REQ-101)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-014 | システムは Prod 環境でログアーカイブ用 S3 バケットを作成しなければならない | 🔵 | REQ-038 |
| FR-015 | システムは S3 バケットに 30 日後 Glacier への移行 Lifecycle Rule を設定しなければならない | 🔵 | REQ-101 |
| FR-016 | システムは Kinesis Data Firehose Delivery Stream を作成しなければならない | 🔵 | REQ-038 |
| FR-017 | システムは Log Group と Firehose を Subscription Filter で連携しなければならない | 🔵 | REQ-038 |
| FR-018 | システムは Dev 環境で S3 Glacier Export を無効化しなければならない | 🔵 | REQ-102 |
| FR-019 | システムは glacierTransitionDays パラメータで移行日数をカスタマイズ可能にしなければならない | 🟡 | 設計仕様 |

### 1.5 S3 バケットセキュリティ (セキュリティベストプラクティス)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-020 | システムは S3 バケットのパブリックアクセスをブロックしなければならない | 🔵 | セキュリティベストプラクティス |
| FR-021 | システムは S3 バケットのサーバーサイド暗号化を有効化しなければならない | 🔵 | セキュリティベストプラクティス |
| FR-022 | システムは Firehose からのアクセスのみを許可するバケットポリシーを設定しなければならない | 🔵 | セキュリティベストプラクティス |

### 1.6 環境別 RemovalPolicy 設定

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-023 | システムは Dev 環境で RemovalPolicy.DESTROY を設定しなければならない | 🟡 | CDK ベストプラクティス |
| FR-024 | システムは Prod 環境で RemovalPolicy.RETAIN を設定しなければならない | 🟡 | CDK ベストプラクティス |

---

## 2. 非機能要件 (Non-functional Requirements)

### 2.1 パフォーマンス

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-001 | Firehose バッファサイズは 5 MB に設定すること | 🟡 | AWS 推奨設定 |
| NFR-002 | Firehose バッファインターバルは 300 秒に設定すること | 🟡 | AWS 推奨設定 |

### 2.2 セキュリティ

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-003 | 全ての Log Group は KMS で暗号化されること | 🔵 | セキュリティベストプラクティス |
| NFR-004 | KMS キーには CloudWatch Logs サービスへの使用許可が設定されること | 🔵 | AWS 仕様 |
| NFR-005 | S3 バケットはパブリックアクセスをブロックすること | 🔵 | セキュリティベストプラクティス |

### 2.3 コスト最適化

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-006 | Dev 環境は短期間 (3日) でログを自動削除しコストを最小化すること | 🔵 | REQ-036, REQ-102 |
| NFR-007 | Prod 環境は CloudWatch 保持 30 日後に Glacier アーカイブに移行しコストを最適化すること | 🔵 | REQ-037, REQ-101 |

### 2.4 可用性

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-008 | Log Group は指定リージョン (ap-northeast-1) で作成されること | 🔵 | REQ-403 |

---

## 3. Props インターフェース定義

### 3.1 LogGroupConstructProps

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

  /**
   * ログ保持期間 (オプション)
   *
   * 【用途】: デフォルト保持期間の上書き
   * 【デフォルト】: Dev: THREE_DAYS (3日), Prod: ONE_MONTH (30日)
   * 🟡 信頼性: 設計仕様より
   *
   * @type {logs.RetentionDays}
   * @default Dev: THREE_DAYS, Prod: ONE_MONTH
   */
  readonly retentionDays?: logs.RetentionDays;

  /**
   * KMS 暗号化有効化 (オプション)
   *
   * 【用途】: Log Group の KMS 暗号化を制御
   * 【デフォルト】: true (暗号化有効)
   * 🔵 信頼性: セキュリティベストプラクティスより
   *
   * @type {boolean}
   * @default true
   */
  readonly enableEncryption?: boolean;

  /**
   * KMS キー (オプション)
   *
   * 【用途】: 外部提供の KMS キーを使用
   * 【デフォルト】: Construct 内で新規作成
   * 🟡 信頼性: 設計仕様より
   *
   * @type {kms.IKey}
   * @default 新規作成
   */
  readonly encryptionKey?: kms.IKey;
}
```

### 3.2 LogExportConstructProps

```typescript
/**
 * LogExportConstruct の Props インターフェース
 *
 * 【設計方針】: Prod 環境での S3 Glacier Export を管理
 * 【再利用性】: 環境パラメータで Export 有効/無効を制御
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface LogExportConstructProps
 */
export interface LogExportConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: Export 有効化の判定、リソース命名
   * 【制約】: 'dev' | 'prod'
   * 🔵 信頼性: REQ-042 より
   *
   * @type {'dev' | 'prod'}
   */
  readonly envName: 'dev' | 'prod';

  /**
   * エクスポート対象 Log Groups (必須)
   *
   * 【用途】: Firehose Subscription Filter の設定対象
   * 【制約】: LogGroupConstruct から出力された Log Groups
   * 🔵 信頼性: REQ-038 より
   *
   * @type {logs.ILogGroup[]}
   */
  readonly logGroups: logs.ILogGroup[];

  /**
   * Glacier 移行日数 (オプション)
   *
   * 【用途】: S3 から Glacier への移行タイミング
   * 【デフォルト】: 30 日
   * 🔵 信頼性: REQ-101 より
   *
   * @type {number}
   * @default 30
   */
  readonly glacierTransitionDays?: number;

  /**
   * エクスポート有効化 (オプション)
   *
   * 【用途】: 環境に関わらず Export を制御
   * 【デフォルト】: Prod: true, Dev: false
   * 🔵 信頼性: REQ-038, REQ-102 より
   *
   * @type {boolean}
   * @default Prod: true, Dev: false
   */
  readonly enableExport?: boolean;

  /**
   * アーカイブバケット暗号化用 KMS キー (オプション)
   *
   * 【用途】: S3 バケットの SSE-KMS 暗号化
   * 【デフォルト】: SSE-S3 を使用
   * 🟡 信頼性: 設計仕様より
   *
   * @type {kms.IKey}
   * @default SSE-S3
   */
  readonly bucketEncryptionKey?: kms.IKey;
}
```

---

## 4. 公開プロパティ定義 (Public Properties)

### 4.1 LogGroupConstruct

```typescript
/**
 * LogGroupConstruct クラス
 *
 * 【機能概要】: ECS、RDS、VPC Flow Logs 用の Log Groups を作成
 * 【実装方針】: 環境別の保持期間設定、KMS 暗号化をサポート
 * 🔵 信頼性: REQ-035〜037, REQ-102 より
 */
export class LogGroupConstruct extends Construct {
  /**
   * ECS Frontend Log Group
   *
   * 【用途】: Frontend ECS Service のログ出力先
   * 【Log Group 名】: /ecs/{env-name}/frontend
   * 🔵 信頼性: REQ-035 より
   *
   * @type {logs.ILogGroup}
   */
  public readonly ecsFrontendLogGroup: logs.ILogGroup;

  /**
   * ECS Backend Log Group
   *
   * 【用途】: Backend ECS Service のログ出力先
   * 【Log Group 名】: /ecs/{env-name}/backend
   * 🔵 信頼性: REQ-035 より
   *
   * @type {logs.ILogGroup}
   */
  public readonly ecsBackendLogGroup: logs.ILogGroup;

  /**
   * RDS Aurora Log Group
   *
   * 【用途】: Aurora MySQL のログ出力先
   * 【Log Group 名】: /rds/{env-name}/aurora
   * 🔵 信頼性: REQ-035 より
   *
   * @type {logs.ILogGroup}
   */
  public readonly rdsLogGroup: logs.ILogGroup;

  /**
   * VPC Flow Log Group
   *
   * 【用途】: VPC Flow Logs の出力先
   * 【Log Group 名】: /vpc/{env-name}/flow-logs
   * 🔵 信頼性: REQ-035 より
   *
   * @type {logs.ILogGroup}
   */
  public readonly vpcFlowLogGroup: logs.ILogGroup;

  /**
   * 全 Log Groups の配列
   *
   * 【用途】: LogExportConstruct への受け渡し
   * 🟡 信頼性: 設計仕様より
   *
   * @type {logs.ILogGroup[]}
   */
  public readonly allLogGroups: logs.ILogGroup[];

  /**
   * KMS 暗号化キー
   *
   * 【用途】: Log Group 暗号化に使用した KMS キー
   * 【備考】: enableEncryption: false の場合は undefined
   * 🔵 信頼性: セキュリティベストプラクティスより
   *
   * @type {kms.IKey | undefined}
   */
  public readonly encryptionKey?: kms.IKey;
}
```

### 4.2 LogExportConstruct

```typescript
/**
 * LogExportConstruct クラス
 *
 * 【機能概要】: CloudWatch Logs から S3 Glacier へのエクスポートを管理
 * 【実装方針】: Prod 環境でのみ有効化、Kinesis Data Firehose を使用
 * 🔵 信頼性: REQ-038, REQ-101 より
 */
export class LogExportConstruct extends Construct {
  /**
   * S3 アーカイブバケット
   *
   * 【用途】: ログの長期保存先
   * 【備考】: Export 無効時は undefined
   * 🔵 信頼性: REQ-038 より
   *
   * @type {s3.IBucket | undefined}
   */
  public readonly archiveBucket?: s3.IBucket;

  /**
   * Kinesis Data Firehose Delivery Stream
   *
   * 【用途】: CloudWatch Logs → S3 への転送
   * 【備考】: Export 無効時は undefined
   * 🔵 信頼性: REQ-038 より
   *
   * @type {firehose.CfnDeliveryStream | undefined}
   */
  public readonly deliveryStream?: firehose.CfnDeliveryStream;

  /**
   * Export 有効フラグ
   *
   * 【用途】: Export が有効化されているかの確認
   * 🟡 信頼性: 設計仕様より
   *
   * @type {boolean}
   */
  public readonly isExportEnabled: boolean;
}
```

---

## 5. デフォルト値定義 (Default Values)

```typescript
// ============================================================================
// 【定数定義】: CloudWatch Logs 構成のデフォルト値
// 🔵 信頼性: REQ-035〜038, REQ-101, REQ-102 より
// ============================================================================

/**
 * 【Dev 環境ログ保持期間】: Dev 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-036, REQ-102 より (3日)
 */
export const DEV_LOG_RETENTION_DAYS = logs.RetentionDays.THREE_DAYS;

/**
 * 【Prod 環境ログ保持期間】: Prod 環境のデフォルトログ保持日数
 * 🔵 信頼性: REQ-037 より (30日)
 */
export const PROD_LOG_RETENTION_DAYS = logs.RetentionDays.ONE_MONTH;

/**
 * 【Glacier 移行日数】: S3 Glacier への移行日数
 * 🔵 信頼性: REQ-101 より (30日後)
 */
export const DEFAULT_GLACIER_TRANSITION_DAYS = 30;

/**
 * 【Log Group プレフィックス - ECS】: ECS ログ用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
export const LOG_GROUP_PREFIX_ECS = '/ecs';

/**
 * 【Log Group プレフィックス - RDS】: RDS ログ用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
export const LOG_GROUP_PREFIX_RDS = '/rds';

/**
 * 【Log Group プレフィックス - VPC】: VPC Flow Logs 用プレフィックス
 * 🔵 信頼性: REQ-035 より
 */
export const LOG_GROUP_PREFIX_VPC = '/vpc';

/**
 * 【デフォルト暗号化設定】: Log Group 暗号化のデフォルト
 * 🔵 信頼性: セキュリティベストプラクティスより
 */
export const DEFAULT_ENABLE_ENCRYPTION = true;

/**
 * 【Firehose バッファサイズ】: Firehose のバッファサイズ (MB)
 * 🟡 信頼性: AWS 推奨設定
 */
export const DEFAULT_FIREHOSE_BUFFER_SIZE_MB = 5;

/**
 * 【Firehose バッファインターバル】: Firehose のバッファインターバル (秒)
 * 🟡 信頼性: AWS 推奨設定
 */
export const DEFAULT_FIREHOSE_BUFFER_INTERVAL_SECONDS = 300;

/**
 * 【KMS キー説明】: Log Group 暗号化キーの説明
 * 🟡 信頼性: 設計仕様
 */
export const KMS_KEY_DESCRIPTION = 'KMS key for CloudWatch Logs encryption';

/**
 * 【S3 バケット名サフィックス】: アーカイブバケットの名前サフィックス
 * 🟡 信頼性: 設計仕様
 */
export const ARCHIVE_BUCKET_SUFFIX = 'log-archive';
```

---

## 6. 制約事項 (Constraints)

### 6.1 技術的制約

| ID | 制約内容 | 信頼性 | 根拠 |
|----|----------|--------|------|
| CON-001 | Log Group 名は一意でなければならない | 🔵 | AWS 仕様 |
| CON-002 | KMS キーは同一リージョン内のキーのみ使用可能 | 🔵 | AWS 仕様 |
| CON-003 | CloudWatch Logs への KMS 使用許可ポリシーが必要 | 🔵 | AWS 仕様 |
| CON-004 | S3 Glacier 移行は最小 30 日後（Glacier Deep Archive は 180 日後推奨） | 🔵 | AWS 仕様 |
| CON-005 | Firehose は Log Group と同一リージョンで作成が必要 | 🔵 | AWS 仕様 |

### 6.2 命名規則制約

| 対象 | 規則 | 例 |
|------|------|-----|
| Log Group 名 | `/{type}/{env-name}/{service}` | `/ecs/dev/frontend` |
| KMS キーエイリアス | `alias/{env-name}/logs-encryption` | `alias/dev/logs-encryption` |
| S3 バケット名 | `{account-id}-{env-name}-log-archive-{region}` | `123456789012-prod-log-archive-ap-northeast-1` |
| Firehose 名 | `{env-name}-logs-to-s3-firehose` | `prod-logs-to-s3-firehose` |

### 6.3 セキュリティ制約

| ID | 制約内容 | 信頼性 | 根拠 |
|----|----------|--------|------|
| SEC-001 | 全ての Log Group は KMS 暗号化が推奨（デフォルト有効） | 🔵 | セキュリティベストプラクティス |
| SEC-002 | S3 バケットはパブリックアクセスブロック必須 | 🔵 | セキュリティベストプラクティス |
| SEC-003 | S3 バケットはサーバーサイド暗号化必須 | 🔵 | セキュリティベストプラクティス |
| SEC-004 | Firehose IAM ロールは最小権限の原則に従う | 🔵 | セキュリティベストプラクティス |

### 6.4 依存関係制約

| タスクID | タスク名 | 関係 | ステータス |
|----------|----------|------|-----------|
| TASK-0020 | Distribution Stack 統合 | 前提 | 完了予定 |
| TASK-0022 | CloudWatch Alarms + Chatbot 設定 | 後続 | 未着手 |
| TASK-0002 | VPC Construct 実装 | 参照（VPC Flow Logs 用） | 完了 |
| TASK-0012 | ECS Cluster Construct 実装 | 参照（ECS ログ用） | 完了 |
| TASK-0008 | Aurora Construct 実装 | 参照（RDS ログ用） | 完了 |

---

## 7. 信頼性レベルサマリー (Reliability Level Summary)

### 7.1 機能要件

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 19 | 79% | 要件定義書・設計文書より確認済み |
| 🟡 黄信号 | 5 | 21% | 設計仕様・妥当な推測による |
| 🔴 赤信号 | 0 | 0% | 推測による設計（なし） |

### 7.2 非機能要件

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 6 | 75% | 要件定義書・AWS 仕様より確認済み |
| 🟡 黄信号 | 2 | 25% | AWS 推奨設定による |
| 🔴 赤信号 | 0 | 0% | 推測による設計（なし） |

### 7.3 総合評価

| 項目 | 値 |
|------|-----|
| 総要件数 | 32 |
| 🔵 青信号 | 25 (78%) |
| 🟡 黄信号 | 7 (22%) |
| 🔴 赤信号 | 0 (0%) |

**品質評価**: **高品質** - 要件の大部分が要件定義書（REQ-035〜038, REQ-101, REQ-102）およびセキュリティベストプラクティスにより確認済み

---

## 8. 要件トレーサビリティマトリクス

| 要件ID | 機能要件ID | テストケースID |
|--------|------------|---------------|
| REQ-035 | FR-001, FR-002, FR-003, FR-004 | TC-LOGS-01〜04 |
| REQ-036 | FR-005, FR-007 | TC-LOGS-05, TC-LOGS-07 |
| REQ-037 | FR-006, FR-007 | TC-LOGS-06, TC-LOGS-07 |
| REQ-038 | FR-014, FR-016, FR-017 | TC-LOGS-13〜16 |
| REQ-101 | FR-015 | TC-LOGS-14 |
| REQ-102 | FR-005, FR-018 | TC-LOGS-05, TC-LOGS-17 |
| Security BP | FR-009〜013, FR-020〜022 | TC-LOGS-09〜12 |

---

## 9. 関連文書

### 9.1 プロジェクト内ドキュメント

- [タスク定義](../../tasks/aws-cdk-serverless-architecture/TASK-0021.md)
- [要件定義書](../../spec/aws-cdk-serverless-architecture/requirements.md)
- [アーキテクチャ設計](../../design/aws-cdk-serverless-architecture/architecture.md)
- [型定義](../../design/aws-cdk-serverless-architecture/interfaces.ts)
- [タスクノート](note.md)

### 9.2 AWS ドキュメント

- [AWS CDK Logs Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs-readme.html)
- [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [CloudWatch Logs Encryption](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)
- [Kinesis Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [S3 Glacier](https://docs.aws.amazon.com/amazonglacier/latest/dev/introduction.html)

---

**文書更新履歴**:
- 2026-02-01: 初版作成 (TDD Requirements Phase)
