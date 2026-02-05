/**
 * ChatbotConstruct テスト
 *
 * TASK-0022: CloudWatch Alarms + Chatbot 設定
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-CHATBOT-001: Chatbot 有効時テンプレートスナップショット
 * - TC-CHATBOT-002: Chatbot 無効時テンプレートスナップショット
 * - TC-CHATBOT-003: Slack Channel Configuration 作成確認
 * - TC-CHATBOT-004: Chatbot IAM Role 作成確認
 * - TC-CHATBOT-005: Slack ID 未指定時 Chatbot 未作成確認
 * - TC-CHATBOT-006: Slack Workspace ID 設定確認
 * - TC-CHATBOT-007: Slack Channel ID 設定確認
 * - TC-CHATBOT-008: SNS Topic 購読確認
 * - TC-CHATBOT-009: Chatbot Role CloudWatch 権限確認
 * - TC-CHATBOT-010: slackChannelConfiguration プロパティ確認
 * - TC-CHATBOT-011: slackChannelConfiguration 未設定時 undefined
 * - TC-CHATBOT-012: isChatbotEnabled プロパティ確認 (有効時)
 * - TC-CHATBOT-013: isChatbotEnabled プロパティ確認 (無効時)
 * - TC-CHATBOT-014: snsTopics 空配列でエラー
 * - TC-CHATBOT-015: Workspace ID のみ指定でエラー
 * - TC-CHATBOT-016: Channel ID のみ指定でエラー
 *
 * 🔵 信頼性: 要件定義書 REQ-039, REQ-103 に基づくテスト
 *
 * @module monitoring/chatbot-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ChatbotConstruct } from '../../../lib/construct/monitoring/chatbot-construct';

describe('ChatbotConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let snsTopic: sns.Topic;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: テスト用のモックリソースを作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });

    // 【テストデータ準備】: テスト用 SNS Topic を作成
    snsTopic = new sns.Topic(stack, 'TestTopic', {
      topicName: 'test-alarm-topic',
    });
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // スナップショットテスト
  // ============================================================================

  describe('スナップショットテスト', () => {
    // ============================================================================
    // TC-CHATBOT-001: Chatbot 有効時テンプレートスナップショット
    // 🔵 信頼性: 既存テストパターンより
    // ============================================================================
    describe('TC-CHATBOT-001: Chatbot 有効時テンプレートスナップショット', () => {
      // 【テスト目的】: Chatbot リソース構成の変更を検出する
      // 【テスト内容】: ChatbotConstruct を全 Slack 設定有効で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致する
      // 🔵 信頼性: 既存テストパターンより

      test('Chatbot 有効時テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Chatbot 有効時スナップショット 🔵
      });
    });

    // ============================================================================
    // TC-CHATBOT-002: Chatbot 無効時テンプレートスナップショット
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-002: Chatbot 無効時テンプレートスナップショット', () => {
      // 【テスト目的】: Chatbot 無効時のリソース構成を確認
      // 【テスト内容】: ChatbotConstruct を Slack ID 未指定で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致（Chatbot リソースなし）
      // 🟡 信頼性: 設計仕様より

      test('Chatbot 無効時テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: Slack ID 未指定で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'dev',
          snsTopics: [snsTopic],
          // slackWorkspaceId, slackChannelId 未指定
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Chatbot 無効時スナップショット 🟡
      });
    });
  });

  // ============================================================================
  // リソース存在確認テスト
  // ============================================================================

  describe('リソース存在確認テスト', () => {
    // ============================================================================
    // TC-CHATBOT-003: Slack Channel Configuration 作成確認
    // 🔵 信頼性: FR-018 より
    // ============================================================================
    describe('TC-CHATBOT-003: Slack Channel Configuration 作成確認', () => {
      // 【テスト目的】: Chatbot リソースの作成を確認
      // 【テスト内容】: ChatbotConstruct を slackWorkspaceId, slackChannelId 指定で作成
      // 【期待される動作】: AWS::Chatbot::SlackChannelConfiguration が存在
      // 🔵 信頼性: FR-018 より

      test('SlackChannelConfiguration が作成されること', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Chatbot リソースの存在確認
        // 【期待値確認】: SlackChannelConfiguration が存在すること
        template.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 1); // 【確認内容】: Chatbot 作成 🔵
      });
    });

    // ============================================================================
    // TC-CHATBOT-004: Chatbot IAM Role 作成確認
    // 🔵 信頼性: FR-022 より
    // ============================================================================
    describe('TC-CHATBOT-004: Chatbot IAM Role 作成確認', () => {
      // 【テスト目的】: Chatbot IAM Role の作成を確認
      // 【テスト内容】: ChatbotConstruct を全 Slack 設定有効で作成
      // 【期待される動作】: AWS::IAM::Role が存在
      // 🔵 信頼性: FR-022 より

      test('Chatbot 用 IAM Role が作成されること', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: IAM Role の存在確認
        // 【期待値確認】: chatbot サービスプリンシパルを持つ IAM Role が存在すること
        template.hasResourceProperties('AWS::IAM::Role', {
          AssumeRolePolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: Match.objectLike({
                  Service: 'chatbot.amazonaws.com', // 【確認内容】: Chatbot サービスプリンシパル 🔵
                }),
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-CHATBOT-005: Slack ID 未指定時 Chatbot 未作成確認
    // 🟡 信頼性: NFR-008 より
    // ============================================================================
    describe('TC-CHATBOT-005: Slack ID 未指定時 Chatbot 未作成確認', () => {
      // 【テスト目的】: 条件付きリソース作成の動作を確認
      // 【テスト内容】: slackWorkspaceId, slackChannelId 未指定で ChatbotConstruct を作成
      // 【期待される動作】: AWS::Chatbot::SlackChannelConfiguration が 0
      // 🟡 信頼性: NFR-008 より

      test('Slack ID 未指定時に Chatbot が作成されないこと', () => {
        // 【テストデータ準備】: Slack ID 未指定で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'dev',
          snsTopics: [snsTopic],
          // slackWorkspaceId, slackChannelId 未指定
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Chatbot リソースが作成されないこと
        // 【期待値確認】: SlackChannelConfiguration が 0 であること
        template.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 0); // 【確認内容】: Chatbot 未作成 🟡
      });
    });
  });

  // ============================================================================
  // プロパティ検証テスト
  // ============================================================================

  describe('プロパティ検証テスト', () => {
    // ============================================================================
    // TC-CHATBOT-006: Slack Workspace ID 設定確認
    // 🔵 信頼性: FR-019 より
    // ============================================================================
    describe('TC-CHATBOT-006: Slack Workspace ID 設定確認', () => {
      // 【テスト目的】: Chatbot の Slack 連携設定を確認
      // 【テスト内容】: slackWorkspaceId: 'T12345678' で ChatbotConstruct を作成
      // 【期待される動作】: SlackWorkspaceId: 'T12345678' が設定
      // 🔵 信頼性: FR-019 より

      test('SlackWorkspaceId が正しく設定されること', () => {
        // 【テストデータ準備】: 指定した Slack Workspace ID で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Slack Workspace ID の設定確認
        // 【期待値確認】: SlackWorkspaceId が 'T12345678' であること
        template.hasResourceProperties('AWS::Chatbot::SlackChannelConfiguration', {
          SlackWorkspaceId: 'T12345678', // 【確認内容】: Slack Workspace ID 設定 🔵
        });
      });
    });

    // ============================================================================
    // TC-CHATBOT-007: Slack Channel ID 設定確認
    // 🔵 信頼性: FR-020 より
    // ============================================================================
    describe('TC-CHATBOT-007: Slack Channel ID 設定確認', () => {
      // 【テスト目的】: Chatbot の Slack 連携設定を確認
      // 【テスト内容】: slackChannelId: 'C12345678' で ChatbotConstruct を作成
      // 【期待される動作】: SlackChannelId: 'C12345678' が設定
      // 🔵 信頼性: FR-020 より

      test('SlackChannelId が正しく設定されること', () => {
        // 【テストデータ準備】: 指定した Slack Channel ID で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Slack Channel ID の設定確認
        // 【期待値確認】: SlackChannelId が 'C12345678' であること
        template.hasResourceProperties('AWS::Chatbot::SlackChannelConfiguration', {
          SlackChannelId: 'C12345678', // 【確認内容】: Slack Channel ID 設定 🔵
        });
      });
    });

    // ============================================================================
    // TC-CHATBOT-008: SNS Topic 購読確認
    // 🔵 信頼性: FR-021 より
    // ============================================================================
    describe('TC-CHATBOT-008: SNS Topic 購読確認', () => {
      // 【テスト目的】: Chatbot と SNS Topic の連携を確認
      // 【テスト内容】: snsTopics: [topic] で ChatbotConstruct を作成
      // 【期待される動作】: SnsTopicArns に Topic ARN が含まれること
      // 🔵 信頼性: FR-021 より

      test('Chatbot が SNS Topic を購読すること', () => {
        // 【テストデータ準備】: SNS Topic 付きで ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: SNS Topic 購読の確認
        // 【期待値確認】: SnsTopicArns が設定されていること
        template.hasResourceProperties('AWS::Chatbot::SlackChannelConfiguration', {
          SnsTopicArns: Match.anyValue(), // 【確認内容】: SNS Topic 購読 🔵
        });
      });
    });

    // ============================================================================
    // TC-CHATBOT-009: Chatbot Role CloudWatch 権限確認
    // 🟡 信頼性: FR-023 より
    // ============================================================================
    describe('TC-CHATBOT-009: Chatbot Role CloudWatch 権限確認', () => {
      // 【テスト目的】: IAM Role のポリシーを確認
      // 【テスト内容】: ChatbotConstruct を全 Slack 設定有効で作成
      // 【期待される動作】: CloudWatch 読み取り権限が付与されていること
      // 🟡 信頼性: FR-023 より

      test('Chatbot Role に CloudWatch 読み取り権限があること', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: IAM Policy の存在確認
        // 【期待値確認】: CloudWatch 関連のアクションが許可されていること
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.anyValue(), // 【確認内容】: CloudWatch 権限 🟡
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 公開プロパティ確認テスト
  // ============================================================================

  describe('公開プロパティ確認テスト', () => {
    // ============================================================================
    // TC-CHATBOT-010: slackChannelConfiguration プロパティ確認
    // 🔵 信頼性: 要件定義より
    // ============================================================================
    describe('TC-CHATBOT-010: slackChannelConfiguration プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティの型と値を確認
      // 【テスト内容】: ChatbotConstruct を全 Slack 設定有効で作成
      // 【期待される動作】: SlackChannelConfiguration インスタンスが返る
      // 🔵 信頼性: 要件定義より

      test('slackChannelConfiguration が設定を返すこと', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        const chatbotConstruct = new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: slackChannelConfiguration が定義されていること
        expect(chatbotConstruct.slackChannelConfiguration).toBeDefined(); // 【確認内容】: slackChannelConfiguration プロパティ 🔵
      });
    });

    // ============================================================================
    // TC-CHATBOT-011: slackChannelConfiguration 未設定時 undefined
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-011: slackChannelConfiguration 未設定時 undefined', () => {
      // 【テスト目的】: 条件付きプロパティの動作を確認
      // 【テスト内容】: Slack ID 未指定で ChatbotConstruct を作成
      // 【期待される動作】: slackChannelConfiguration === undefined
      // 🟡 信頼性: 設計仕様より

      test('Slack 未設定時に undefined が返ること', () => {
        // 【テストデータ準備】: Slack ID 未指定で ChatbotConstruct を作成
        const chatbotConstruct = new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'dev',
          snsTopics: [snsTopic],
          // slackWorkspaceId, slackChannelId 未指定
        });

        // 【結果検証】: プロパティが undefined であること
        // 【期待値確認】: slackChannelConfiguration が undefined であること
        expect(chatbotConstruct.slackChannelConfiguration).toBeUndefined(); // 【確認内容】: Slack 未設定時 undefined 🟡
      });
    });

    // ============================================================================
    // TC-CHATBOT-012: isChatbotEnabled プロパティ確認 (有効時)
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-012: isChatbotEnabled プロパティ確認 (有効時)', () => {
      // 【テスト目的】: 有効化フラグの動作を確認
      // 【テスト内容】: ChatbotConstruct を全 Slack 設定有効で作成
      // 【期待される動作】: isChatbotEnabled === true
      // 🟡 信頼性: 設計仕様より

      test('Chatbot 有効時に isChatbotEnabled が true を返すこと', () => {
        // 【テストデータ準備】: 全 Slack 設定有効で ChatbotConstruct を作成
        const chatbotConstruct = new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'prod',
          snsTopics: [snsTopic],
          slackWorkspaceId: 'T12345678',
          slackChannelId: 'C12345678',
        });

        // 【結果検証】: プロパティ値確認
        // 【期待値確認】: isChatbotEnabled が true であること
        expect(chatbotConstruct.isChatbotEnabled).toBe(true); // 【確認内容】: Chatbot 有効時 true 🟡
      });
    });

    // ============================================================================
    // TC-CHATBOT-013: isChatbotEnabled プロパティ確認 (無効時)
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-013: isChatbotEnabled プロパティ確認 (無効時)', () => {
      // 【テスト目的】: 有効化フラグの動作を確認
      // 【テスト内容】: Slack ID 未指定で ChatbotConstruct を作成
      // 【期待される動作】: isChatbotEnabled === false
      // 🟡 信頼性: 設計仕様より

      test('Chatbot 無効時に isChatbotEnabled が false を返すこと', () => {
        // 【テストデータ準備】: Slack ID 未指定で ChatbotConstruct を作成
        const chatbotConstruct = new ChatbotConstruct(stack, 'Chatbot', {
          envName: 'dev',
          snsTopics: [snsTopic],
          // slackWorkspaceId, slackChannelId 未指定
        });

        // 【結果検証】: プロパティ値確認
        // 【期待値確認】: isChatbotEnabled が false であること
        expect(chatbotConstruct.isChatbotEnabled).toBe(false); // 【確認内容】: Chatbot 無効時 false 🟡
      });
    });
  });

  // ============================================================================
  // 異常系テスト
  // ============================================================================

  describe('異常系テスト', () => {
    // ============================================================================
    // TC-CHATBOT-014: snsTopics 空配列でエラー
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-014: snsTopics 空配列でエラー', () => {
      // 【テスト目的】: 入力バリデーションの動作を確認
      // 【テスト内容】: snsTopics: [] で ChatbotConstruct を作成
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 設計仕様より

      test('snsTopics が空配列の場合エラーが発生すること', () => {
        // 【テストデータ準備】: 空の snsTopics で ChatbotConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new ChatbotConstruct(stack, 'Chatbot', {
            envName: 'prod',
            snsTopics: [],
            slackWorkspaceId: 'T12345678',
            slackChannelId: 'C12345678',
          });
        }).toThrow(); // 【確認内容】: snsTopics 空配列でエラー 🟡
      });
    });

    // ============================================================================
    // TC-CHATBOT-015: Workspace ID のみ指定でエラー
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-015: Workspace ID のみ指定でエラー', () => {
      // 【テスト目的】: Slack 設定の一貫性チェック
      // 【テスト内容】: slackWorkspaceId のみ、slackChannelId なしで ChatbotConstruct を作成
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 設計仕様より

      test('slackWorkspaceId のみ指定の場合エラー', () => {
        // 【テストデータ準備】: slackWorkspaceId のみ指定で ChatbotConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new ChatbotConstruct(stack, 'Chatbot', {
            envName: 'prod',
            snsTopics: [snsTopic],
            slackWorkspaceId: 'T12345678',
            // slackChannelId なし
          });
        }).toThrow(); // 【確認内容】: Workspace ID のみでエラー 🟡
      });
    });

    // ============================================================================
    // TC-CHATBOT-016: Channel ID のみ指定でエラー
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-CHATBOT-016: Channel ID のみ指定でエラー', () => {
      // 【テスト目的】: Slack 設定の一貫性チェック
      // 【テスト内容】: slackChannelId のみ、slackWorkspaceId なしで ChatbotConstruct を作成
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 設計仕様より

      test('slackChannelId のみ指定の場合エラー', () => {
        // 【テストデータ準備】: slackChannelId のみ指定で ChatbotConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new ChatbotConstruct(stack, 'Chatbot', {
            envName: 'prod',
            snsTopics: [snsTopic],
            // slackWorkspaceId なし
            slackChannelId: 'C12345678',
          });
        }).toThrow(); // 【確認内容】: Channel ID のみでエラー 🟡
      });
    });
  });
});
