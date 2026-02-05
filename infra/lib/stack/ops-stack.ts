/**
 * Ops Stack
 *
 * TASK-0024: Ops Stack 統合 + 最終統合テスト
 * フェーズ: TDD Refactor Phase - 品質改善完了
 *
 * 【Stack 概要】: 運用監視・CI/CD 機能を提供する Stack
 * 【責務】: CloudWatch Logs, Alarms, Chatbot, Log Export, CI/CD Pipeline の統合
 *
 * 【統合 Construct】:
 * - LogGroupConstruct: ECS Frontend/Backend、RDS、VPC Flow Logs 用 Log Groups
 * - AlarmConstruct: CPU/Memory 使用率、エラーパターン監視
 * - ChatbotConstruct: Slack 連携（オプション）
 * - LogExportConstruct: S3 Glacier エクスポート（オプション）
 * - CodeCommit/CodeBuild/CodePipeline: CI/CD パイプライン（オプション）
 *
 * 🔵 信頼性: 要件定義書 REQ-035〜042, REQ-101〜103, NFR-101〜102 に基づく実装
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { LogGroupConstruct } from '../construct/monitoring/log-group-construct';
import { AlarmConstruct } from '../construct/monitoring/alarm-construct';
import { ChatbotConstruct } from '../construct/monitoring/chatbot-construct';
import { LogExportConstruct } from '../construct/monitoring/log-export-construct';
import { CodeCommitConstruct } from '../construct/cicd/codecommit-construct';
import { CodeBuildConstruct } from '../construct/cicd/codebuild-construct';
import { CodePipelineConstruct } from '../construct/cicd/codepipeline-construct';

// ============================================================================
// 【定数定義】
// ============================================================================

/**
 * 環境名の最大長
 * 🔵 信頼性: DistributionStack パターンより
 */
const MAX_ENV_NAME_LENGTH = 20;

/**
 * 環境名の形式パターン（小文字英数字とハイフンのみ）
 * 🔵 信頼性: DistributionStack パターンより
 */
const ENV_NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * エラーメッセージ: envName が空
 * 🔵 信頼性: DistributionStack パターンより
 */
const ERROR_ENV_NAME_EMPTY = 'envName は必須パラメータです';

/**
 * エラーメッセージ: envName が長すぎる
 * 🔵 信頼性: DistributionStack パターンより
 */
const ERROR_ENV_NAME_LENGTH = `envName は ${MAX_ENV_NAME_LENGTH} 文字以下で指定してください`;

/**
 * エラーメッセージ: envName が不正な形式
 * 🔵 信頼性: DistributionStack パターンより
 */
const ERROR_ENV_NAME_INVALID_FORMAT = 'envName は小文字英数字とハイフンのみ使用できます';

/**
 * ログ保持期間のマッピングテーブル
 *
 * 【用途】: 数値から logs.RetentionDays 列挙型への変換に使用
 * 【設計方針】: 定数として外出しすることでパフォーマンス向上（毎回のオブジェクト生成を回避）
 * 🔵 信頼性: AWS CloudWatch Logs の保持期間オプションより
 */
const RETENTION_DAYS_MAP: { [key: number]: logs.RetentionDays } = {
  1: logs.RetentionDays.ONE_DAY,
  3: logs.RetentionDays.THREE_DAYS,
  5: logs.RetentionDays.FIVE_DAYS,
  7: logs.RetentionDays.ONE_WEEK,
  14: logs.RetentionDays.TWO_WEEKS,
  30: logs.RetentionDays.ONE_MONTH,
  60: logs.RetentionDays.TWO_MONTHS,
  90: logs.RetentionDays.THREE_MONTHS,
  120: logs.RetentionDays.FOUR_MONTHS,
  150: logs.RetentionDays.FIVE_MONTHS,
  180: logs.RetentionDays.SIX_MONTHS,
  365: logs.RetentionDays.ONE_YEAR,
  400: logs.RetentionDays.THIRTEEN_MONTHS,
  545: logs.RetentionDays.EIGHTEEN_MONTHS,
  731: logs.RetentionDays.TWO_YEARS,
  1827: logs.RetentionDays.FIVE_YEARS,
  3653: logs.RetentionDays.TEN_YEARS,
};

/**
 * デフォルトのログ保持期間
 * 🔵 信頼性: 要件定義書より（マッピングに該当しない場合のフォールバック）
 */
const DEFAULT_RETENTION_DAYS = logs.RetentionDays.ONE_MONTH;

// ============================================================================
// 【Props インターフェース】
// ============================================================================

/**
 * OpsStack の Props インターフェース
 *
 * 【用途】: Ops Stack の設定パラメータを定義
 *
 * 🔵 信頼性: 要件定義書より
 */
export interface OpsStackProps extends cdk.StackProps {
  /**
   * 環境設定 (必須)
   *
   * 【用途】: 環境固有の設定（envName, slackWorkspaceId, slackChannelId など）
   * 🔵 信頼性: 要件定義書 REQ-042 より
   */
  readonly config: EnvironmentConfig;

  /**
   * ECS Cluster (必須)
   *
   * 【用途】: AlarmConstruct のメトリクス監視対象
   * 🔵 信頼性: 要件定義書 REQ-039 より
   */
  readonly ecsCluster: ecs.ICluster;

  /**
   * ECS Services (必須)
   *
   * 【用途】: AlarmConstruct のメトリクス監視対象、CodePipeline のデプロイ先
   * 🔵 信頼性: 要件定義書 REQ-039, REQ-040 より
   */
  readonly ecsServices: {
    frontend: ecs.IBaseService;
    backend: ecs.IBaseService;
  };

  /**
   * VPC (必須)
   *
   * 【用途】: 将来の拡張用（現時点では直接使用しない）
   * 🟡 信頼性: 設計仕様より
   */
  readonly vpc: ec2.IVpc;

  /**
   * Log Export 有効化 (オプション)
   *
   * 【用途】: S3 Glacier へのログエクスポートを制御
   * 【デフォルト】: Prod: true, Dev: false
   * 🔵 信頼性: 要件定義書 REQ-038, REQ-102 より
   */
  readonly enableLogExport?: boolean;

  /**
   * Chatbot 有効化 (オプション)
   *
   * 【用途】: AWS Chatbot の作成を制御
   * 【デフォルト】: true（Slack 設定がある場合）
   * 🔵 信頼性: 要件定義書 REQ-039, REQ-103 より
   */
  readonly enableChatbot?: boolean;

  /**
   * CI/CD 有効化 (オプション)
   *
   * 【用途】: CodeCommit/CodeBuild/CodePipeline の作成を制御
   * 【デフォルト】: true
   * 🔵 信頼性: 要件定義書 REQ-040, REQ-041 より
   */
  readonly enableCicd?: boolean;

  /**
   * ECR Repository (オプション)
   *
   * 【用途】: CodeBuild のプッシュ先 ECR リポジトリ
   * 【備考】: CI/CD 有効時に指定可能
   * 🟡 信頼性: 設計仕様より
   */
  readonly ecrRepository?: ecr.IRepository;
}

// ============================================================================
// 【OpsStack クラス】
// ============================================================================

/**
 * Ops Stack
 *
 * 【Stack 概要】: 運用監視・CI/CD 機能を提供する Stack
 * 【責務】: CloudWatch Logs, Alarms, Chatbot, Log Export, CI/CD Pipeline の統合
 *
 * 🔵 信頼性: 要件定義書 REQ-035〜042 に基づく実装
 */
export class OpsStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // ==========================================================================

  /**
   * LogGroupConstruct
   *
   * 【用途】: Log Groups への参照
   * 🔵 信頼性: 要件定義書・テストケースより
   */
  public readonly logGroups: LogGroupConstruct;

  /**
   * AlarmConstruct
   *
   * 【用途】: Alarms への参照
   * 🔵 信頼性: 要件定義書・テストケースより
   */
  public readonly alarms: AlarmConstruct;

  /**
   * SNS Topic
   *
   * 【用途】: アラーム通知用 SNS Topic への参照
   * 🔵 信頼性: 要件定義書・テストケースより
   */
  public readonly alarmTopic: sns.ITopic;

  /**
   * ChatbotConstruct (条件付き)
   *
   * 【用途】: Chatbot への参照（enableChatbot: true かつ有効な Slack 設定がある場合のみ）
   * 🟡 信頼性: 設計仕様より
   */
  public readonly chatbot?: ChatbotConstruct;

  /**
   * CodePipelineConstruct (条件付き)
   *
   * 【用途】: Pipeline への参照（enableCicd: true の場合のみ）
   * 🟡 信頼性: 設計仕様より
   */
  public readonly pipeline?: CodePipelineConstruct;

  /**
   * OpsStack のコンストラクタ
   *
   * 【処理概要】: 監視・CI/CD Construct を統合して運用層を構成
   * 【設計方針】: 既存 Construct を組み合わせ、オプション機能を条件付きで作成
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Stack の識別子
   * @param {OpsStackProps} props - Stack 設定
   */
  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【Props バリデーション】: 入力パラメータの検証
    // 🔵 信頼性: DistributionStack パターンより
    // ========================================================================
    this.validateEnvName(props.config.envName);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // ========================================================================
    const envName = props.config.envName as 'dev' | 'prod';
    const enableLogExport = props.enableLogExport ?? (envName === 'prod');
    const enableChatbot = props.enableChatbot ?? true;
    const enableCicd = props.enableCicd ?? true;

    // ========================================================================
    // 【Step 1: LogGroupConstruct 作成】
    // ECS Frontend/Backend、RDS、VPC Flow Logs 用 Log Groups
    // 🔵 信頼性: REQ-035, REQ-036, REQ-037 より
    // ========================================================================
    this.logGroups = new LogGroupConstruct(this, 'LogGroups', {
      envName,
      retentionDays: this.getRetentionDays(props.config.logRetentionDays),
      enableEncryption: true,
    });

    // ========================================================================
    // 【Step 2: AlarmConstruct 作成】
    // CPU/Memory 使用率、エラーパターン監視 Alarms
    // 🔵 信頼性: REQ-039 より
    // ========================================================================
    // 【注意】: ECS サービス名は静的な名前を使用（CDK トークン問題回避）
    const ecsServiceNames = [`${envName}-frontend`, `${envName}-backend`];

    this.alarms = new AlarmConstruct(this, 'Alarms', {
      envName,
      config: props.config,
      ecsClusterName: props.ecsCluster.clusterName,
      ecsServiceNames: ecsServiceNames,
      logGroups: this.logGroups.allLogGroups,
    });

    // SNS Topic への参照を設定
    this.alarmTopic = this.alarms.alarmTopic;

    // ========================================================================
    // 【Step 3: ChatbotConstruct 作成（条件付き）】
    // Slack 連携（enableChatbot: true かつ有効な Slack 設定がある場合）
    // 🔵 信頼性: REQ-039, REQ-103 より
    // ========================================================================
    if (enableChatbot) {
      this.chatbot = new ChatbotConstruct(this, 'Chatbot', {
        envName,
        snsTopics: [this.alarmTopic],
        slackWorkspaceId: props.config.slackWorkspaceId,
        slackChannelId: props.config.slackChannelId,
        enableChatbot: enableChatbot,
      });
    }

    // ========================================================================
    // 【Step 4: LogExportConstruct 作成（条件付き）】
    // S3 Glacier エクスポート（enableLogExport: true の場合）
    // 🔵 信頼性: REQ-038, REQ-101 より
    // ========================================================================
    if (enableLogExport) {
      new LogExportConstruct(this, 'LogExport', {
        envName,
        logGroups: this.logGroups.allLogGroups,
        enableExport: enableLogExport,
      });
    }

    // ========================================================================
    // 【Step 5: CI/CD Constructs 作成（条件付き）】
    // CodeCommit/CodeBuild/CodePipeline（enableCicd: true の場合）
    // 🔵 信頼性: REQ-040, REQ-041 より
    // ========================================================================
    if (enableCicd) {
      this.pipeline = this.createCicdPipeline(envName, props);
    }

    // ========================================================================
    // 【CfnOutput 定義】
    // 他の Stack から参照可能な出力値を定義
    // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より
    // ========================================================================
    this.createCfnOutputs(envName);
  }

  // ==========================================================================
  // 【プライベートメソッド】
  // ==========================================================================

  /**
   * envName バリデーション
   *
   * 【用途】: 環境名の妥当性検証
   * 【検証項目】:
   * - 必須チェック (空文字列不可)
   * - 長さチェック (1-20文字)
   * - 形式チェック (小文字英数字とハイフンのみ)
   *
   * @private
   * @param {string} envName - 検証対象の環境名
   * @throws {Error} バリデーションエラー
   *
   * 🔵 信頼性: DistributionStack パターンより
   */
  private validateEnvName(envName: string): void {
    if (!envName || envName.length === 0) {
      throw new Error(ERROR_ENV_NAME_EMPTY);
    }

    if (envName.length > MAX_ENV_NAME_LENGTH) {
      throw new Error(ERROR_ENV_NAME_LENGTH);
    }

    if (!ENV_NAME_PATTERN.test(envName)) {
      throw new Error(ERROR_ENV_NAME_INVALID_FORMAT);
    }
  }

  /**
   * ログ保持期間を取得
   *
   * 【用途】: 数値から logs.RetentionDays 列挙型へ変換
   * 【改善内容】: マッピングを定数として外出しし、パフォーマンスを向上
   * 【設計方針】: 該当しない日数の場合は DEFAULT_RETENTION_DAYS を返す
   *
   * @private
   * @param {number} days - ログ保持日数
   * @returns {logs.RetentionDays} ログ保持期間
   *
   * 🔵 信頼性: AWS CloudWatch Logs の保持期間オプションより
   */
  private getRetentionDays(days: number): logs.RetentionDays {
    // 【マッピング参照】: 外部定義した定数マッピングを使用
    // 【フォールバック】: 無効な値の場合は ONE_MONTH をデフォルトとして使用
    return RETENTION_DAYS_MAP[days] ?? DEFAULT_RETENTION_DAYS;
  }

  /**
   * CI/CD パイプラインを作成
   *
   * 【用途】: CodeCommit/CodeBuild/CodePipeline の統合作成
   * 【改善内容】: コンストラクタから CI/CD 生成ロジックを分離し、可読性を向上
   * 【設計方針】: 単一責任原則に基づき、CI/CD 関連の責務をこのメソッドに集約
   *
   * @private
   * @param {string} envName - 環境名
   * @param {OpsStackProps} props - Stack 設定
   * @returns {CodePipelineConstruct} 作成された CodePipeline Construct
   *
   * 🔵 信頼性: REQ-040, REQ-041 より（リファクタリングによる分離）
   */
  private createCicdPipeline(
    envName: string,
    props: OpsStackProps
  ): CodePipelineConstruct {
    // 【CodeCommit Repository 作成】: ソースコード管理用リポジトリ
    const codeCommit = new CodeCommitConstruct(this, 'CodeCommit', {
      repositoryName: `${envName}-app-repository`,
      description: `Application source code repository for ${envName}`,
    });

    // 【CodeBuild Project 作成】: Docker ビルド + テスト実行用プロジェクト
    const codeBuild = new CodeBuildConstruct(this, 'CodeBuild', {
      projectName: `${envName}-app-build`,
      ecrRepository: props.ecrRepository,
    });

    // 【CodePipeline 作成】: Source → Build → Deploy パイプライン
    return new CodePipelineConstruct(this, 'CodePipeline', {
      pipelineName: `${envName}-app-pipeline`,
      repository: codeCommit.repository,
      buildProject: codeBuild.project,
      ecsCluster: props.ecsCluster,
      ecsService: props.ecsServices.frontend,
      notificationTopic: this.alarmTopic,
    });
  }

  /**
   * CfnOutput を一括生成する
   *
   * 【用途】: 複数の CfnOutput をまとめて生成
   * 【可読性向上】: コンストラクタから出力定義を分離
   *
   * @private
   * @param {string} envName - 環境名
   *
   * 🔵 信頼性: DistributionStack パターンより
   */
  private createCfnOutputs(envName: string): void {
    // 【AlarmTopicArn 出力】: アラーム通知先 SNS Topic の ARN をエクスポート
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarm notifications',
      exportName: `${envName}-AlarmTopicArn`,
    });
  }
}
