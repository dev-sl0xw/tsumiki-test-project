/**
 * ChatbotConstruct 実装
 *
 * TASK-0022: CloudWatch Alarms + Chatbot 設定
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: AWS Chatbot Slack 連携を作成
 * 【実装方針】: Slack ID 指定時のみ Chatbot リソースを作成
 * 【テスト対応】: TC-CHATBOT-001〜016 の全16テストケースに対応
 *
 * 構成内容:
 * - Slack Channel Configuration (FR-018〜021)
 * - IAM Role with CloudWatch 権限 (FR-022, FR-023)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-039, REQ-103 に基づく実装
 *
 * @module monitoring/chatbot-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * ChatbotConstruct の Props インターフェース
 *
 * 【設計方針】: envName と snsTopics は必須、Slack 設定はオプショナル
 * 【再利用性】: Slack 連携なしでも使用可能（Chatbot は作成されない）
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface ChatbotConstructProps
 */
export interface ChatbotConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: Chatbot 設定名のプレフィックス
   * 【制約】: 'dev' | 'prod'
   * 🔵 信頼性: REQ-042 より
   *
   * @type {'dev' | 'prod'}
   */
  readonly envName: 'dev' | 'prod';

  /**
   * SNS Topics (必須)
   *
   * 【用途】: Chatbot が購読する SNS Topic
   * 【制約】: 1 つ以上の Topic が必要
   * 🔵 信頼性: REQ-039 より
   *
   * @type {sns.ITopic[]}
   */
  readonly snsTopics: sns.ITopic[];

  /**
   * Slack Workspace ID (オプション)
   *
   * 【用途】: Chatbot の Slack 連携設定
   * 【備考】: 未指定時は Chatbot を作成しない
   * 🔵 信頼性: 設計文書・parameter.ts より
   *
   * @type {string}
   */
  readonly slackWorkspaceId?: string;

  /**
   * Slack Channel ID (オプション)
   *
   * 【用途】: Chatbot の Slack 連携設定
   * 【備考】: 未指定時は Chatbot を作成しない
   * 🔵 信頼性: 設計文書・parameter.ts より
   *
   * @type {string}
   */
  readonly slackChannelId?: string;

  /**
   * Chatbot 有効化フラグ (オプション、デフォルト true)
   *
   * 【用途】: Chatbot 作成の強制無効化
   * 🟡 信頼性: 設計仕様より
   *
   * @type {boolean}
   * @default true
   */
  readonly enableChatbot?: boolean;
}

/**
 * ChatbotConstruct クラス
 *
 * 【機能概要】: AWS Chatbot Slack 連携を作成
 * 【実装方針】: Slack ID 指定時のみ Chatbot リソースを作成
 *
 * 通知フロー:
 * ```
 * CloudWatch Alarms
 *        ↓
 *    SNS Topic
 *        ↓
 *    AWS Chatbot  ← 本 Construct
 *        ↓
 *    Slack Channel
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-039, REQ-103 に基づく実装
 *
 * @class ChatbotConstruct
 * @extends Construct
 */
export class ChatbotConstruct extends Construct {
  /**
   * 【プロパティ】: Slack Channel Configuration
   *
   * 【用途】: Chatbot 設定へのアクセス
   * 【備考】: Chatbot 未作成時は undefined
   * 🔵 信頼性: FR-018 より
   *
   * @readonly
   * @type {chatbot.SlackChannelConfiguration | undefined}
   */
  public readonly slackChannelConfiguration?: chatbot.SlackChannelConfiguration;

  /**
   * 【プロパティ】: Chatbot IAM Role
   *
   * 【用途】: Chatbot の IAM Role へのアクセス
   * 【備考】: Chatbot 未作成時は undefined
   * 🔵 信頼性: FR-022 より
   *
   * @readonly
   * @type {iam.IRole | undefined}
   */
  public readonly chatbotRole?: iam.IRole;

  /**
   * 【プロパティ】: Chatbot 有効化状態
   *
   * 【用途】: Chatbot が作成されたかどうかを示す
   * 🟡 信頼性: 設計仕様より
   *
   * @readonly
   * @type {boolean}
   */
  public readonly isChatbotEnabled: boolean;

  /**
   * ChatbotConstruct のコンストラクタ
   *
   * 【処理概要】: Slack 設定が有効な場合のみ Chatbot リソースを作成
   * 【設計方針】: 条件付きリソース作成をサポート
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {ChatbotConstructProps} props - Chatbot 設定
   */
  constructor(scope: Construct, id: string, props: ChatbotConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【入力バリデーション】: Props の検証
    // 🟡 信頼性: 設計仕様より
    // ========================================================================
    this.validateProps(props);

    // ========================================================================
    // 【Chatbot 有効化判定】: Slack 設定の有無を確認
    // 🟡 信頼性: NFR-007, NFR-008 より
    // ========================================================================
    const enableChatbot = props.enableChatbot ?? true;
    const hasSlackConfig = this.hasValidSlackConfig(
      props.slackWorkspaceId,
      props.slackChannelId
    );

    this.isChatbotEnabled = enableChatbot && hasSlackConfig;

    // ========================================================================
    // 【Chatbot 作成】: 有効な場合のみ Slack Channel Configuration を作成
    // 🔵 信頼性: FR-018〜023 より
    // ========================================================================
    if (this.isChatbotEnabled) {
      // IAM Role 作成
      this.chatbotRole = this.createChatbotRole(props.envName);

      // Slack Channel Configuration 作成
      this.slackChannelConfiguration = this.createSlackChannelConfiguration(
        props.envName,
        props.slackWorkspaceId!,
        props.slackChannelId!,
        props.snsTopics,
        this.chatbotRole
      );
    }
  }

  /**
   * Props の入力バリデーション
   *
   * 【処理概要】: snsTopics と Slack 設定の一貫性を検証
   * 【設計方針】: 早期エラー検出でデバッグを容易に
   *
   * @param {ChatbotConstructProps} props - 検証対象の Props
   * @throws {Error} snsTopics が空、または Slack 設定が不整合の場合
   *
   * @private
   */
  private validateProps(props: ChatbotConstructProps): void {
    // snsTopics の検証
    if (!props.snsTopics || props.snsTopics.length === 0) {
      throw new Error('snsTopics は 1 つ以上の Topic を指定してください');
    }

    // Slack 設定の一貫性チェック
    const hasWorkspaceId = !!props.slackWorkspaceId && props.slackWorkspaceId.trim() !== '';
    const hasChannelId = !!props.slackChannelId && props.slackChannelId.trim() !== '';

    // 片方だけ指定されている場合はエラー
    if (hasWorkspaceId !== hasChannelId) {
      throw new Error(
        'slackWorkspaceId と slackChannelId は両方指定するか、両方省略してください'
      );
    }
  }

  /**
   * 有効な Slack 設定が存在するか確認する
   *
   * 【処理概要】: Workspace ID と Channel ID が両方指定されているか確認
   *
   * @param {string | undefined} workspaceId - Slack Workspace ID
   * @param {string | undefined} channelId - Slack Channel ID
   * @returns {boolean} 有効な Slack 設定が存在する場合 true
   *
   * @private
   */
  private hasValidSlackConfig(
    workspaceId: string | undefined,
    channelId: string | undefined
  ): boolean {
    return (
      !!workspaceId &&
      workspaceId.trim() !== '' &&
      !!channelId &&
      channelId.trim() !== ''
    );
  }

  /**
   * Chatbot 用 IAM Role を作成する
   *
   * 【処理概要】: Chatbot が使用する IAM Role を作成
   * 【設計方針】: CloudWatch 読み取り権限を付与
   *
   * @param {string} envName - 環境名
   * @returns {iam.Role} 作成された IAM Role
   *
   * @private
   */
  private createChatbotRole(envName: string): iam.Role {
    const role = new iam.Role(this, 'ChatbotRole', {
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      roleName: `${envName}-chatbot-role`,
      description: `IAM Role for ${envName} AWS Chatbot`,
    });

    // CloudWatch 読み取り権限を付与
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudwatch:Describe*',
          'cloudwatch:Get*',
          'cloudwatch:List*',
          'logs:Describe*',
          'logs:Get*',
          'logs:FilterLogEvents',
        ],
        resources: ['*'],
      })
    );

    return role;
  }

  /**
   * Slack Channel Configuration を作成する
   *
   * 【処理概要】: AWS Chatbot の Slack Channel 設定を作成
   * 【設計方針】: SNS Topic を購読し、Slack に通知
   *
   * @param {string} envName - 環境名
   * @param {string} workspaceId - Slack Workspace ID
   * @param {string} channelId - Slack Channel ID
   * @param {sns.ITopic[]} snsTopics - 購読する SNS Topics
   * @param {iam.IRole} role - Chatbot 用 IAM Role
   * @returns {chatbot.SlackChannelConfiguration} 作成された Slack Channel Configuration
   *
   * @private
   */
  private createSlackChannelConfiguration(
    envName: string,
    workspaceId: string,
    channelId: string,
    snsTopics: sns.ITopic[],
    role: iam.IRole
  ): chatbot.SlackChannelConfiguration {
    return new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      slackChannelConfigurationName: `${envName}-alarm-notifications`,
      slackWorkspaceId: workspaceId,
      slackChannelId: channelId,
      notificationTopics: snsTopics,
      role,
      loggingLevel: chatbot.LoggingLevel.INFO,
    });
  }
}
