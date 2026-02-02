/**
 * LogExportConstruct 実装
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: CloudWatch Logs から S3 Glacier へのエクスポートを管理
 * 【実装方針】: Prod 環境でのみ有効化、Kinesis Data Firehose を使用
 * 【テスト対応】: TC-LOGS-013〜017, TC-LOGS-023 のテストケースに対応
 *
 * 構成内容:
 * - S3 アーカイブバケット (REQ-038)
 * - S3 Lifecycle Rule (Glacier 移行) (REQ-101)
 * - Kinesis Data Firehose (REQ-038)
 * - Subscription Filter (Log Group → Firehose) (REQ-038)
 * - Dev 環境での無効化 (REQ-102)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-038, REQ-101, REQ-102 に基づく実装
 *
 * @module monitoring/log-export-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: S3 Glacier Export 構成のデフォルト値
// 🔵 信頼性: REQ-038, REQ-101 より
// ============================================================================

/**
 * 【Glacier 移行日数】: S3 Glacier への移行日数
 * 🔵 信頼性: REQ-101 より (30日後)
 */
const DEFAULT_GLACIER_TRANSITION_DAYS = 30;

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

/**
 * 【Subscription Filter パターン】: 全ログを転送するフィルターパターン
 * 🔵 信頼性: REQ-038 より
 */
const SUBSCRIPTION_FILTER_PATTERN_ALL = '';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

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
}

/**
 * LogExportConstruct クラス
 *
 * 【機能概要】: CloudWatch Logs から S3 Glacier へのエクスポートを管理
 * 【実装方針】: Prod 環境でのみ有効化、Kinesis Data Firehose を使用
 *
 * アーキテクチャ位置づけ:
 * ```
 * CloudWatch Logs (LogGroupConstruct)
 *           ↓
 *   Subscription Filter
 *           ↓
 *   Kinesis Data Firehose ←── 本 Construct
 *           ↓
 *      S3 Bucket
 *           ↓
 * S3 Lifecycle (Glacier 移行)
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-038, REQ-101, REQ-102 に基づく実装
 *
 * @class LogExportConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const logExportConstruct = new LogExportConstruct(this, 'LogExport', {
 *   envName: 'prod',
 *   logGroups: logGroupConstruct.allLogGroups,
 * });
 * ```
 */
export class LogExportConstruct extends Construct {
  /**
   * 【プロパティ】: S3 アーカイブバケット
   *
   * 【用途】: ログの長期保存先
   * 【備考】: Export 無効時は undefined
   * 🔵 信頼性: REQ-038 より
   *
   * @readonly
   * @type {s3.IBucket | undefined}
   */
  public readonly archiveBucket?: s3.IBucket;

  /**
   * 【プロパティ】: Kinesis Data Firehose Delivery Stream
   *
   * 【用途】: CloudWatch Logs → S3 への転送
   * 【備考】: Export 無効時は undefined
   * 🔵 信頼性: REQ-038 より
   *
   * @readonly
   * @type {firehose.CfnDeliveryStream | undefined}
   */
  public readonly deliveryStream?: firehose.CfnDeliveryStream;

  /**
   * 【プロパティ】: Export 有効フラグ
   *
   * 【用途】: Export が有効化されているかの確認
   * 🟡 信頼性: 設計仕様より
   *
   * @readonly
   * @type {boolean}
   */
  public readonly isExportEnabled: boolean;

  /**
   * LogExportConstruct のコンストラクタ
   *
   * 【処理概要】: Prod 環境で S3 Glacier Export を設定
   * 【設計方針】: enableExport フラグにより制御
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {LogExportConstructProps} props - Export 設定
   */
  constructor(scope: Construct, id: string, props: LogExportConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-038, REQ-101, REQ-102 より
    // ========================================================================
    const glacierTransitionDays =
      props.glacierTransitionDays ?? DEFAULT_GLACIER_TRANSITION_DAYS;

    // 環境別の Export 有効化判定
    const defaultEnableExport = props.envName === 'prod';
    const enableExport = props.enableExport ?? defaultEnableExport;

    this.isExportEnabled = enableExport;

    // ========================================================================
    // 【Export 有効時の処理】: S3 Bucket と Firehose の作成
    // 🔵 信頼性: REQ-038, REQ-101 より
    // ========================================================================
    if (enableExport) {
      // ======================================================================
      // 【S3 アーカイブバケット作成】
      // 🔵 信頼性: REQ-038 より
      // ======================================================================
      const archiveBucket = this.createArchiveBucket(props.envName, glacierTransitionDays);

      // ======================================================================
      // 【Firehose IAM Role とデリバリーストリーム作成】
      // 🔵 信頼性: REQ-038 より
      // ======================================================================
      const firehoseRole = this.createFirehoseRole(archiveBucket);
      const deliveryStream = this.createDeliveryStream(archiveBucket, firehoseRole);

      // ======================================================================
      // 【Subscription Filter 作成】: Log Group → Firehose
      // 🔵 信頼性: REQ-038 より
      // ======================================================================
      this.createSubscriptionFilters(props.logGroups, deliveryStream);

      // ======================================================================
      // 【プロパティ設定】: 公開プロパティに値を設定
      // ======================================================================
      this.archiveBucket = archiveBucket;
      this.deliveryStream = deliveryStream;
    }
  }

  /**
   * S3 アーカイブバケットを作成
   *
   * 【処理概要】: ログ長期保存用の S3 バケットを Glacier 移行ルール付きで作成
   * 【設計方針】: セキュリティベストプラクティスに準拠したバケット設定
   *
   * @param {string} envName - 環境名
   * @param {number} glacierTransitionDays - Glacier 移行日数
   * @returns {s3.IBucket} 作成された S3 バケット
   *
   * @private
   */
  private createArchiveBucket(envName: string, glacierTransitionDays: number): s3.IBucket {
    return new s3.Bucket(this, 'ArchiveBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(glacierTransitionDays),
            },
          ],
        },
      ],
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
  }

  /**
   * Firehose 用の IAM Role を作成
   *
   * 【処理概要】: Kinesis Data Firehose が S3 に書き込むための IAM Role を作成
   * 【設計方針】: 最小権限の原則に基づき、必要な権限のみ付与
   *
   * @param {s3.IBucket} archiveBucket - アーカイブバケット
   * @returns {iam.IRole} 作成された IAM Role
   *
   * @private
   */
  private createFirehoseRole(archiveBucket: s3.IBucket): iam.IRole {
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    archiveBucket.grantWrite(firehoseRole);

    return firehoseRole;
  }

  /**
   * Kinesis Data Firehose デリバリーストリームを作成
   *
   * 【処理概要】: CloudWatch Logs から S3 へのログ転送ストリームを作成
   * 【設計方針】: バッファリング設定により効率的なログ転送を実現
   *
   * @param {s3.IBucket} archiveBucket - アーカイブバケット
   * @param {iam.IRole} firehoseRole - Firehose 用 IAM Role
   * @returns {firehose.CfnDeliveryStream} 作成されたデリバリーストリーム
   *
   * @private
   */
  private createDeliveryStream(
    archiveBucket: s3.IBucket,
    firehoseRole: iam.IRole
  ): firehose.CfnDeliveryStream {
    return new firehose.CfnDeliveryStream(this, 'DeliveryStream', {
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: archiveBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        bufferingHints: {
          sizeInMBs: DEFAULT_FIREHOSE_BUFFER_SIZE_MB,
          intervalInSeconds: DEFAULT_FIREHOSE_BUFFER_INTERVAL_SECONDS,
        },
      },
    });
  }

  /**
   * Subscription Filter を作成
   *
   * 【処理概要】: 各 Log Group から Firehose へのログ転送フィルターを設定
   * 【設計方針】: 全ログを転送し、長期アーカイブを実現
   *
   * @param {logs.ILogGroup[]} logGroups - エクスポート対象 Log Groups
   * @param {firehose.CfnDeliveryStream} deliveryStream - デリバリーストリーム
   *
   * @private
   */
  private createSubscriptionFilters(
    logGroups: logs.ILogGroup[],
    deliveryStream: firehose.CfnDeliveryStream
  ): void {
    const subscriptionRole = new iam.Role(this, 'SubscriptionRole', {
      assumedBy: new iam.ServicePrincipal('logs.amazonaws.com'),
    });

    subscriptionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['firehose:PutRecord', 'firehose:PutRecordBatch'],
        resources: [deliveryStream.attrArn],
      })
    );

    logGroups.forEach((logGroup, index) => {
      new logs.CfnSubscriptionFilter(this, `SubscriptionFilter${index}`, {
        logGroupName: logGroup.logGroupName,
        filterPattern: SUBSCRIPTION_FILTER_PATTERN_ALL,
        destinationArn: deliveryStream.attrArn,
        roleArn: subscriptionRole.roleArn,
      });
    });
  }
}
