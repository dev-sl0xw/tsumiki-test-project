/**
 * AlarmConstruct 実装
 *
 * TASK-0022: CloudWatch Alarms + Chatbot 設定
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: CloudWatch Alarms と SNS Topic を作成
 * 【実装方針】: ECS CPU/Memory 監視、Log Error パターン監視をサポート
 * 【テスト対応】: TC-ALARM-001〜028 の全28テストケースに対応
 *
 * 構成内容:
 * - SNS Topic (KMS 暗号化) (FR-014, FR-016, FR-017)
 * - ECS CPU/Memory Alarms (FR-001〜007)
 * - Metric Filter + Error Alarms (FR-008〜013)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-039 に基づく実装
 *
 * @module monitoring/alarm-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../../parameter';

// ============================================================================
// 【定数定義】: CloudWatch Alarms 構成のデフォルト値
// 🔵 信頼性: FR-003〜006, FR-012 より
// ============================================================================

/**
 * 【デフォルト CPU 閾値】: CPU 使用率アラームのデフォルト閾値
 * 🔵 信頼性: FR-003 より (80%)
 */
const DEFAULT_CPU_THRESHOLD = 80;

/**
 * 【デフォルト Memory 閾値】: Memory 使用率アラームのデフォルト閾値
 * 🔵 信頼性: FR-004 より (80%)
 */
const DEFAULT_MEMORY_THRESHOLD = 80;

/**
 * 【デフォルト評価期間】: Alarm 評価期間 (分)
 * 🟡 信頼性: FR-005 より (5分)
 */
const DEFAULT_EVALUATION_PERIOD_MINUTES = 5;

/**
 * 【デフォルトデータポイント】: トリガーに必要な連続データポイント数
 * 🟡 信頼性: FR-006 より (3回)
 */
const DEFAULT_DATAPOINTS_TO_ALARM = 3;

/**
 * 【Error Alarm 閾値】: エラーアラームの閾値
 * 🔵 信頼性: FR-012 より (1件以上)
 */
const ERROR_ALARM_THRESHOLD = 1;

/**
 * 【エラーパターン】: Metric Filter で検出するエラーパターン
 * 🔵 信頼性: FR-009, FR-010 より
 */
const ERROR_FILTER_PATTERN = logs.FilterPattern.anyTerm('ERROR', 'Exception');

/**
 * 【カスタムメトリクス名前空間】: エラーカウント用名前空間
 * 🟡 信頼性: 設計仕様より
 */
const ERROR_METRIC_NAMESPACE = 'Custom/Application';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * AlarmConstruct の Props インターフェース
 *
 * 【設計方針】: 環境名と config は必須、その他はオプショナルでデフォルト値を提供
 * 【再利用性】: Dev/Prod 環境で柔軟に設定可能
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface AlarmConstructProps
 */
export interface AlarmConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: SNS Topic 名のプレフィックス、アラーム識別
   * 【制約】: 'dev' | 'prod'
   * 🔵 信頼性: REQ-042 より
   *
   * @type {'dev' | 'prod'}
   */
  readonly envName: 'dev' | 'prod';

  /**
   * 環境設定 (必須)
   *
   * 【用途】: Slack 連携設定などを含む環境固有設定
   * 🔵 信頼性: 設計文書より
   *
   * @type {EnvironmentConfig}
   */
  readonly config: EnvironmentConfig;

  /**
   * ECS クラスター名 (オプション)
   *
   * 【用途】: ECS Alarm のディメンション設定
   * 【備考】: 未指定時は ECS Alarm を作成しない
   * 🟡 信頼性: FR-026 より
   *
   * @type {string}
   */
  readonly ecsClusterName?: string;

  /**
   * ECS サービス名配列 (オプション)
   *
   * 【用途】: ECS Alarm の作成対象サービス
   * 【備考】: 未指定時は ECS Alarm を作成しない
   * 🟡 信頼性: FR-027 より
   *
   * @type {string[]}
   */
  readonly ecsServiceNames?: string[];

  /**
   * Log Groups (オプション)
   *
   * 【用途】: Error Alarm の作成対象 Log Groups
   * 【備考】: 未指定時は Error Alarm を作成しない
   * 🟡 信頼性: FR-028 より
   *
   * @type {logs.ILogGroup[]}
   */
  readonly logGroups?: logs.ILogGroup[];

  /**
   * CPU 使用率閾値 (オプション、デフォルト 80)
   *
   * 【用途】: CPU Alarm の閾値カスタマイズ
   * 【制約】: 1〜100 の範囲
   * 🔵 信頼性: FR-003, FR-029 より
   *
   * @type {number}
   * @default 80
   */
  readonly cpuThreshold?: number;

  /**
   * Memory 使用率閾値 (オプション、デフォルト 80)
   *
   * 【用途】: Memory Alarm の閾値カスタマイズ
   * 【制約】: 1〜100 の範囲
   * 🔵 信頼性: FR-004, FR-030 より
   *
   * @type {number}
   * @default 80
   */
  readonly memoryThreshold?: number;

  /**
   * 評価期間（分）(オプション、デフォルト 5)
   *
   * 【用途】: Alarm 評価期間のカスタマイズ
   * 🟡 信頼性: FR-005 より
   *
   * @type {number}
   * @default 5
   */
  readonly evaluationPeriods?: number;

  /**
   * データポイント数 (オプション、デフォルト 3)
   *
   * 【用途】: トリガーに必要な連続超過回数
   * 🟡 信頼性: FR-006 より
   *
   * @type {number}
   * @default 3
   */
  readonly datapointsToAlarm?: number;
}

/**
 * AlarmConstruct クラス
 *
 * 【機能概要】: CloudWatch Alarms と SNS Topic を作成
 * 【実装方針】: ECS CPU/Memory 監視、Log Error パターン監視をサポート
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Database Stack → Application Stack
 *                                                    ↓
 *                                              Distribution Stack
 *                                                    ↓
 *                                                Ops Stack
 *                                                    ↓
 *                                         ┌─────────────────────┐
 *                                         │  CloudWatch Alarms  │ ← 本 Construct
 *                                         │  (SNS Topic)        │
 *                                         └─────────────────────┘
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-039 に基づく実装
 *
 * @class AlarmConstruct
 * @extends Construct
 */
export class AlarmConstruct extends Construct {
  /**
   * 【プロパティ】: アラーム通知用 SNS Topic
   *
   * 【用途】: CloudWatch Alarms のアクション先
   * 🔵 信頼性: FR-014 より
   *
   * @readonly
   * @type {sns.ITopic}
   */
  public readonly alarmTopic: sns.ITopic;

  /**
   * 【プロパティ】: CPU 使用率 Alarm 配列
   *
   * 【用途】: ECS サービスの CPU 監視 Alarm
   * 🔵 信頼性: FR-001 より
   *
   * @readonly
   * @type {cloudwatch.IAlarm[]}
   */
  public readonly cpuAlarms: cloudwatch.IAlarm[];

  /**
   * 【プロパティ】: Memory 使用率 Alarm 配列
   *
   * 【用途】: ECS サービスの Memory 監視 Alarm
   * 🔵 信頼性: FR-002 より
   *
   * @readonly
   * @type {cloudwatch.IAlarm[]}
   */
  public readonly memoryAlarms: cloudwatch.IAlarm[];

  /**
   * 【プロパティ】: エラーパターン Alarm 配列
   *
   * 【用途】: ログのエラーパターン監視 Alarm
   * 🔵 信頼性: FR-011 より
   *
   * @readonly
   * @type {cloudwatch.IAlarm[]}
   */
  public readonly errorAlarms: cloudwatch.IAlarm[];

  /**
   * 【プロパティ】: 全 Alarm 配列
   *
   * 【用途】: 全ての Alarm への一括アクセス
   * 🟡 信頼性: 設計仕様より
   *
   * @readonly
   * @type {cloudwatch.IAlarm[]}
   */
  public readonly allAlarms: cloudwatch.IAlarm[];

  /**
   * AlarmConstruct のコンストラクタ
   *
   * 【処理概要】: SNS Topic と各種 CloudWatch Alarms を作成
   * 【設計方針】: 条件付きリソース作成をサポート
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {AlarmConstructProps} props - Alarm 設定
   */
  constructor(scope: Construct, id: string, props: AlarmConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【入力バリデーション】: Props の検証
    // 🟡 信頼性: 設計仕様より
    // ========================================================================
    this.validateProps(props);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: FR-003〜006 より
    // ========================================================================
    const cpuThreshold = props.cpuThreshold ?? DEFAULT_CPU_THRESHOLD;
    const memoryThreshold = props.memoryThreshold ?? DEFAULT_MEMORY_THRESHOLD;
    const evaluationPeriods = props.evaluationPeriods ?? DEFAULT_EVALUATION_PERIOD_MINUTES;
    const datapointsToAlarm = props.datapointsToAlarm ?? DEFAULT_DATAPOINTS_TO_ALARM;

    // ========================================================================
    // 【SNS Topic 作成】: アラーム通知用の SNS Topic (KMS 暗号化)
    // 🔵 信頼性: FR-014, FR-016, FR-017 より
    // ========================================================================
    const kmsKey = this.createKmsKey(props.envName);
    this.alarmTopic = this.createSnsTopic(props.envName, kmsKey);

    // ========================================================================
    // 【ECS Alarms 作成】: CPU/Memory 使用率監視 Alarms
    // 🔵 信頼性: FR-001, FR-002, FR-007 より
    // ========================================================================
    this.cpuAlarms = this.createEcsAlarms(
      props.ecsClusterName,
      props.ecsServiceNames,
      'CPUUtilization',
      cpuThreshold,
      evaluationPeriods,
      datapointsToAlarm,
      'CPU'
    );

    this.memoryAlarms = this.createEcsAlarms(
      props.ecsClusterName,
      props.ecsServiceNames,
      'MemoryUtilization',
      memoryThreshold,
      evaluationPeriods,
      datapointsToAlarm,
      'Memory'
    );

    // ========================================================================
    // 【Error Alarms 作成】: ログエラーパターン監視 Alarms
    // 🔵 信頼性: FR-008〜013 より
    // ========================================================================
    this.errorAlarms = this.createErrorAlarms(
      props.logGroups,
      props.envName
    );

    // ========================================================================
    // 【プロパティ設定】: 全 Alarm 配列を設定
    // 🟡 信頼性: 設計仕様より
    // ========================================================================
    this.allAlarms = [
      ...this.cpuAlarms,
      ...this.memoryAlarms,
      ...this.errorAlarms,
    ];
  }

  /**
   * Props の入力バリデーション
   *
   * 【処理概要】: envName と閾値の妥当性を検証
   * 【設計方針】: 早期エラー検出でデバッグを容易に
   *
   * @param {AlarmConstructProps} props - 検証対象の Props
   * @throws {Error} envName が空または閾値が範囲外の場合
   *
   * @private
   */
  private validateProps(props: AlarmConstructProps): void {
    // envName の検証
    if (!props.envName || props.envName.trim() === '') {
      throw new Error('envName は必須パラメータです');
    }

    // cpuThreshold の検証
    if (props.cpuThreshold !== undefined) {
      if (props.cpuThreshold <= 0 || props.cpuThreshold > 100) {
        throw new Error('cpuThreshold は 1〜100 の範囲で指定してください');
      }
    }

    // memoryThreshold の検証
    if (props.memoryThreshold !== undefined) {
      if (props.memoryThreshold <= 0 || props.memoryThreshold > 100) {
        throw new Error('memoryThreshold は 1〜100 の範囲で指定してください');
      }
    }
  }

  /**
   * SNS Topic 暗号化用 KMS キーを作成する
   *
   * 【処理概要】: SNS Topic の暗号化に使用する KMS キーを作成
   * 【設計方針】: キーローテーション有効化、CloudWatch からの使用許可
   *
   * @param {string} envName - 環境名
   * @returns {kms.Key} 作成された KMS キー
   *
   * @private
   */
  private createKmsKey(envName: string): kms.Key {
    const kmsKey = new kms.Key(this, 'AlarmTopicKey', {
      enableKeyRotation: true,
      description: `KMS key for ${envName} alarm SNS topic encryption`,
      removalPolicy:
        envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CloudWatch からの使用を許可
    kmsKey.grant(
      new cdk.aws_iam.ServicePrincipal('cloudwatch.amazonaws.com'),
      'kms:Decrypt',
      'kms:GenerateDataKey*'
    );

    return kmsKey;
  }

  /**
   * アラーム通知用 SNS Topic を作成する
   *
   * 【処理概要】: KMS 暗号化された SNS Topic を作成
   * 【設計方針】: 環境名を含む命名規則
   *
   * @param {string} envName - 環境名
   * @param {kms.Key} kmsKey - 暗号化用 KMS キー
   * @returns {sns.Topic} 作成された SNS Topic
   *
   * @private
   */
  private createSnsTopic(envName: string, kmsKey: kms.Key): sns.Topic {
    return new sns.Topic(this, 'AlarmTopic', {
      topicName: `${envName}-alarm-notifications`,
      masterKey: kmsKey,
    });
  }

  /**
   * ECS Alarms を作成する
   *
   * 【処理概要】: 指定されたサービスごとに CloudWatch Alarm を作成
   * 【設計方針】: clusterName/serviceNames 未指定時は空配列を返す
   *
   * @param {string | undefined} clusterName - ECS クラスター名
   * @param {string[] | undefined} serviceNames - ECS サービス名配列
   * @param {string} metricName - メトリクス名 (CPUUtilization/MemoryUtilization)
   * @param {number} threshold - 閾値
   * @param {number} evaluationPeriods - 評価期間
   * @param {number} datapointsToAlarm - データポイント数
   * @param {string} alarmPrefix - Alarm 名プレフィックス
   * @returns {cloudwatch.IAlarm[]} 作成された Alarm 配列
   *
   * @private
   */
  private createEcsAlarms(
    clusterName: string | undefined,
    serviceNames: string[] | undefined,
    metricName: string,
    threshold: number,
    evaluationPeriods: number,
    datapointsToAlarm: number,
    alarmPrefix: string
  ): cloudwatch.IAlarm[] {
    // ECS 設定がない場合は空配列を返す
    if (!clusterName || !serviceNames || serviceNames.length === 0) {
      return [];
    }

    const alarms: cloudwatch.IAlarm[] = [];

    for (const serviceName of serviceNames) {
      const alarm = new cloudwatch.Alarm(this, `${alarmPrefix}Alarm${serviceName}`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName,
          dimensionsMap: {
            ClusterName: clusterName,
            ServiceName: serviceName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(evaluationPeriods),
        }),
        threshold,
        evaluationPeriods,
        datapointsToAlarm,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: `ECS ${alarmPrefix} 使用率が ${threshold}% を超えました (${serviceName})`,
      });

      // SNS Topic へのアクション追加
      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

      alarms.push(alarm);
    }

    return alarms;
  }

  /**
   * Error Alarms を作成する
   *
   * 【処理概要】: Log Groups ごとに Metric Filter と Error Alarm を作成
   * 【設計方針】: logGroups 未指定時は空配列を返す
   *
   * @param {logs.ILogGroup[] | undefined} logGroups - 対象 Log Groups
   * @param {string} envName - 環境名
   * @returns {cloudwatch.IAlarm[]} 作成された Error Alarm 配列
   *
   * @private
   */
  private createErrorAlarms(
    logGroups: logs.ILogGroup[] | undefined,
    envName: string
  ): cloudwatch.IAlarm[] {
    if (!logGroups || logGroups.length === 0) {
      return [];
    }

    const alarms: cloudwatch.IAlarm[] = [];

    for (let i = 0; i < logGroups.length; i++) {
      const logGroup = logGroups[i];
      const suffix = i.toString();

      // Metric Filter 作成
      const metricFilter = new logs.MetricFilter(this, `ErrorMetricFilter${suffix}`, {
        logGroup,
        metricNamespace: ERROR_METRIC_NAMESPACE,
        metricName: `${envName}-ErrorCount-${suffix}`,
        filterPattern: ERROR_FILTER_PATTERN,
        metricValue: '1',
      });

      // Error Alarm 作成
      const alarm = new cloudwatch.Alarm(this, `ErrorAlarm${suffix}`, {
        metric: metricFilter.metric(),
        threshold: ERROR_ALARM_THRESHOLD,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: `エラーが検出されました (${logGroup.logGroupName})`,
      });

      // SNS Topic へのアクション追加
      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

      alarms.push(alarm);
    }

    return alarms;
  }
}
