/**
 * LogGroupConstruct 実装
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: ECS、RDS、VPC Flow Logs 用の Log Groups を作成
 * 【実装方針】: 環境別の保持期間設定、KMS 暗号化をサポート
 * 【テスト対応】: TC-LOGS-001〜030 の全30テストケースに対応
 *
 * 構成内容:
 * - ECS Frontend/Backend Log Group (REQ-035)
 * - RDS Aurora Log Group (REQ-035)
 * - VPC Flow Log Group (REQ-035)
 * - 環境別 Retention 設定 (REQ-036, REQ-037, REQ-102)
 * - KMS 暗号化 (セキュリティベストプラクティス)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-035〜037, REQ-102 に基づく実装
 *
 * @module monitoring/log-group-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

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

// ============================================================================
// 【インターフェース定義】
// ============================================================================

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

/**
 * LogGroupConstruct クラス
 *
 * 【機能概要】: ECS、RDS、VPC Flow Logs 用の Log Groups を作成
 * 【実装方針】: 環境別の保持期間設定、KMS 暗号化をサポート
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Database Stack → Application Stack
 *                                                    ↓
 *                                              Distribution Stack
 *                                                    ↓
 *                                                Ops Stack
 *                                                    ↓
 *                                           CloudWatch Logs
 *                                           (本 Construct)
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-035〜037, REQ-102 に基づく実装
 *
 * @class LogGroupConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const logGroupConstruct = new LogGroupConstruct(this, 'LogGroup', {
 *   envName: 'dev',
 * });
 *
 * // ECS Service との連携
 * const ecsService = new EcsServiceConstruct(this, 'Service', {
 *   logGroup: logGroupConstruct.ecsFrontendLogGroup,
 *   // ...
 * });
 * ```
 */
export class LogGroupConstruct extends Construct {
  /**
   * 【プロパティ】: ECS Frontend Log Group
   *
   * 【用途】: Frontend ECS Service のログ出力先
   * 【Log Group 名】: /ecs/{env-name}/frontend
   * 🔵 信頼性: REQ-035 より
   *
   * @readonly
   * @type {logs.ILogGroup}
   */
  public readonly ecsFrontendLogGroup: logs.ILogGroup;

  /**
   * 【プロパティ】: ECS Backend Log Group
   *
   * 【用途】: Backend ECS Service のログ出力先
   * 【Log Group 名】: /ecs/{env-name}/backend
   * 🔵 信頼性: REQ-035 より
   *
   * @readonly
   * @type {logs.ILogGroup}
   */
  public readonly ecsBackendLogGroup: logs.ILogGroup;

  /**
   * 【プロパティ】: RDS Aurora Log Group
   *
   * 【用途】: Aurora MySQL のログ出力先
   * 【Log Group 名】: /rds/{env-name}/aurora
   * 🔵 信頼性: REQ-035 より
   *
   * @readonly
   * @type {logs.ILogGroup}
   */
  public readonly rdsLogGroup: logs.ILogGroup;

  /**
   * 【プロパティ】: VPC Flow Log Group
   *
   * 【用途】: VPC Flow Logs の出力先
   * 【Log Group 名】: /vpc/{env-name}/flow-logs
   * 🔵 信頼性: REQ-035 より
   *
   * @readonly
   * @type {logs.ILogGroup}
   */
  public readonly vpcFlowLogGroup: logs.ILogGroup;

  /**
   * 【プロパティ】: 全 Log Groups の配列
   *
   * 【用途】: LogExportConstruct への受け渡し
   * 🟡 信頼性: 設計仕様より
   *
   * @readonly
   * @type {logs.ILogGroup[]}
   */
  public readonly allLogGroups: logs.ILogGroup[];

  /**
   * 【プロパティ】: KMS 暗号化キー
   *
   * 【用途】: Log Group 暗号化に使用した KMS キー
   * 【備考】: enableEncryption: false の場合は undefined
   * 🔵 信頼性: セキュリティベストプラクティスより
   *
   * @readonly
   * @type {kms.IKey | undefined}
   */
  public readonly encryptionKey?: kms.IKey;

  /**
   * LogGroupConstruct のコンストラクタ
   *
   * 【処理概要】: 環境別の Log Groups を作成し、KMS 暗号化を設定
   * 【設計方針】: デフォルト値を適用しつつ、カスタマイズ可能に
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {LogGroupConstructProps} props - Log Group 設定
   */
  constructor(scope: Construct, id: string, props: LogGroupConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-035〜037, REQ-102 より
    // ========================================================================
    const enableEncryption = props.enableEncryption ?? DEFAULT_ENABLE_ENCRYPTION;

    // 環境別の保持期間設定
    const defaultRetentionDays =
      props.envName === 'prod' ? PROD_LOG_RETENTION_DAYS : DEV_LOG_RETENTION_DAYS;
    const retentionDays = props.retentionDays ?? defaultRetentionDays;

    // 環境別の RemovalPolicy 設定
    const removalPolicy =
      props.envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ========================================================================
    // 【KMS キー作成】: Log Group 暗号化用の KMS キー
    // 🔵 信頼性: セキュリティベストプラクティスより
    // ========================================================================
    const kmsKey = this.createEncryptionKey(
      enableEncryption,
      props.encryptionKey,
      removalPolicy
    );

    // ========================================================================
    // 【Log Groups 作成】: 各種サービス用の Log Groups を作成
    // 🔵 信頼性: REQ-035 より
    // ========================================================================
    this.ecsFrontendLogGroup = this.createLogGroup(
      'EcsFrontendLogGroup',
      `${LOG_GROUP_PREFIX_ECS}/${props.envName}/frontend`,
      retentionDays,
      kmsKey,
      removalPolicy
    );

    this.ecsBackendLogGroup = this.createLogGroup(
      'EcsBackendLogGroup',
      `${LOG_GROUP_PREFIX_ECS}/${props.envName}/backend`,
      retentionDays,
      kmsKey,
      removalPolicy
    );

    this.rdsLogGroup = this.createLogGroup(
      'RdsLogGroup',
      `${LOG_GROUP_PREFIX_RDS}/${props.envName}/aurora`,
      retentionDays,
      kmsKey,
      removalPolicy
    );

    this.vpcFlowLogGroup = this.createLogGroup(
      'VpcFlowLogGroup',
      `${LOG_GROUP_PREFIX_VPC}/${props.envName}/flow-logs`,
      retentionDays,
      kmsKey,
      removalPolicy
    );

    // ========================================================================
    // 【プロパティ設定】: 公開プロパティに値を設定
    // ========================================================================
    this.allLogGroups = [
      this.ecsFrontendLogGroup,
      this.ecsBackendLogGroup,
      this.rdsLogGroup,
      this.vpcFlowLogGroup,
    ];
    this.encryptionKey = kmsKey;
  }

  /**
   * KMS 暗号化キーを作成する
   *
   * 【処理概要】: 暗号化が有効な場合、KMS キーを作成または既存キーを使用
   * 【設計方針】: CloudWatch Logs サービスからの使用を許可するポリシーを設定
   *
   * @param {boolean} enableEncryption - 暗号化有効フラグ
   * @param {kms.IKey | undefined} existingKey - 既存の KMS キー (オプション)
   * @param {cdk.RemovalPolicy} removalPolicy - 削除ポリシー
   * @returns {kms.IKey | undefined} KMS キー (暗号化無効時は undefined)
   *
   * @private
   */
  private createEncryptionKey(
    enableEncryption: boolean,
    existingKey: kms.IKey | undefined,
    removalPolicy: cdk.RemovalPolicy
  ): kms.IKey | undefined {
    if (!enableEncryption) {
      return undefined;
    }

    // 外部提供の KMS キーを使用
    if (existingKey) {
      return existingKey;
    }

    // 新規 KMS キーを作成
    const kmsKey = new kms.Key(this, 'EncryptionKey', {
      enableKeyRotation: true,
      description: 'KMS key for CloudWatch Logs encryption',
      removalPolicy: removalPolicy,
    });

    // CloudWatch Logs サービスへの使用許可
    kmsKey.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'Allow CloudWatch Logs to use the key',
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ServicePrincipal(`logs.${cdk.Stack.of(this).region}.amazonaws.com`),
        ],
        actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey'],
        resources: ['*'],
        conditions: {
          ArnLike: {
            'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`,
          },
        },
      })
    );

    return kmsKey;
  }

  /**
   * Log Group を作成する
   *
   * 【処理概要】: 共通設定で Log Group リソースを作成
   * 【設計方針】: DRY 原則に基づき、Log Group 作成ロジックを統一
   *
   * @param {string} id - Log Group の論理 ID
   * @param {string} logGroupName - Log Group 名
   * @param {logs.RetentionDays} retention - ログ保持期間
   * @param {kms.IKey | undefined} encryptionKey - KMS 暗号化キー (オプション)
   * @param {cdk.RemovalPolicy} removalPolicy - 削除ポリシー
   * @returns {logs.ILogGroup} 作成された Log Group
   *
   * @private
   */
  private createLogGroup(
    id: string,
    logGroupName: string,
    retention: logs.RetentionDays,
    encryptionKey: kms.IKey | undefined,
    removalPolicy: cdk.RemovalPolicy
  ): logs.ILogGroup {
    return new logs.LogGroup(this, id, {
      logGroupName,
      retention,
      encryptionKey,
      removalPolicy,
    });
  }
}
