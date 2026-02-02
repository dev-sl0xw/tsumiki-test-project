/**
 * LogExportConstruct テスト
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-LOGS-013: S3 アーカイブバケット作成確認
 * - TC-LOGS-014: S3 Lifecycle Rule Glacier 移行確認
 * - TC-LOGS-015: Kinesis Firehose 作成確認
 * - TC-LOGS-016: Subscription Filter 設定確認
 * - TC-LOGS-017: Dev 環境 S3 Export 無効確認
 * - TC-LOGS-023: archiveBucket プロパティ確認
 *
 * 🔵 信頼性: 要件定義書 REQ-038, REQ-101, REQ-102 に基づくテスト
 *
 * @module monitoring/log-export-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LogGroupConstruct } from '../../../lib/construct/monitoring/log-group-construct';
import { LogExportConstruct } from '../../../lib/construct/monitoring/log-export-construct';

describe('LogExportConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;

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
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // S3 Glacier Export テスト (Prod 環境)
  // ============================================================================

  describe('S3 Glacier Export テスト (Prod 環境)', () => {
    // ============================================================================
    // TC-LOGS-013: S3 アーカイブバケット作成確認
    // 🔵 信頼性: REQ-038 より
    // ============================================================================
    describe('TC-LOGS-013: S3 アーカイブバケット作成確認', () => {
      // 【テスト目的】: Prod 環境でログアーカイブ用の S3 バケットが作成されることを確認する
      // 【テスト内容】: LogExportConstruct を `envName: 'prod'`, `enableExport: true` で作成し、S3 バケットを検証
      // 【期待される動作】: AWS::S3::Bucket リソースが作成され、PublicAccessBlockConfiguration が全て true に設定される
      // 🔵 信頼性: REQ-038 より

      test('Prod 環境で S3 バケットが作成されること', () => {
        // 【テストデータ準備】: LogExportConstruct を作成
        new LogExportConstruct(stack, 'LogExport', {
          envName: 'prod',
          logGroups: [],
          enableExport: true,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3 バケットの存在と設定確認
        // 【期待値確認】: PublicAccessBlockConfiguration が全て true であること
        template.hasResourceProperties('AWS::S3::Bucket', {
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true, // 【確認内容】: パブリック ACL ブロック 🔵
            BlockPublicPolicy: true, // 【確認内容】: パブリックポリシーブロック 🔵
            IgnorePublicAcls: true, // 【確認内容】: パブリック ACL 無視 🔵
            RestrictPublicBuckets: true, // 【確認内容】: パブリックバケット制限 🔵
          },
        });
      });
    });

    // ============================================================================
    // TC-LOGS-014: S3 Lifecycle Rule Glacier 移行確認
    // 🔵 信頼性: REQ-101 より
    // ============================================================================
    describe('TC-LOGS-014: S3 Lifecycle Rule Glacier 移行確認', () => {
      // 【テスト目的】: S3 バケットに 30 日後の Glacier 移行ルールが設定されることを確認する
      // 【テスト内容】: LogExportConstruct を `envName: 'prod'` で作成し、LifecycleConfiguration を検証
      // 【期待される動作】: Transitions に StorageClass: GLACIER, TransitionInDays: 30 が含まれる
      // 🔵 信頼性: REQ-101 より

      test('30日後に Glacier へ移行するルールが設定されること', () => {
        // 【テストデータ準備】: LogExportConstruct を作成
        new LogExportConstruct(stack, 'LogExport', {
          envName: 'prod',
          logGroups: [],
          enableExport: true,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Lifecycle Rule の確認
        // 【期待値確認】: Glacier 移行ルールが設定されていること
        template.hasResourceProperties('AWS::S3::Bucket', {
          LifecycleConfiguration: {
            Rules: Match.arrayWith([
              Match.objectLike({
                Transitions: Match.arrayWith([
                  Match.objectLike({
                    StorageClass: 'GLACIER', // 【確認内容】: Glacier ストレージクラス 🔵
                    TransitionInDays: 30, // 【確認内容】: 30 日後に移行 🔵
                  }),
                ]),
                Status: 'Enabled', // 【確認内容】: ルール有効 🔵
              }),
            ]),
          },
        });
      });
    });

    // ============================================================================
    // TC-LOGS-015: Kinesis Firehose 作成確認
    // 🔵 信頼性: REQ-038 より
    // ============================================================================
    describe('TC-LOGS-015: Kinesis Firehose 作成確認', () => {
      // 【テスト目的】: ログエクスポート用の Kinesis Data Firehose が作成されることを確認する
      // 【テスト内容】: LogExportConstruct を `envName: 'prod'`, `enableExport: true` で作成し、Firehose を検証
      // 【期待される動作】: AWS::KinesisFirehose::DeliveryStream リソースが作成され、S3DestinationConfiguration が設定される
      // 🔵 信頼性: REQ-038 より

      test('Kinesis Data Firehose が作成されること', () => {
        // 【テストデータ準備】: LogExportConstruct を作成
        new LogExportConstruct(stack, 'LogExport', {
          envName: 'prod',
          logGroups: [],
          enableExport: true,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Firehose の存在と設定確認
        // 【期待値確認】: S3DestinationConfiguration が設定されていること
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
          S3DestinationConfiguration: Match.objectLike({
            BucketARN: Match.anyValue(), // 【確認内容】: S3 バケット ARN が設定されている 🔵
          }),
        });
      });
    });

    // ============================================================================
    // TC-LOGS-016: Subscription Filter 設定確認
    // 🔵 信頼性: REQ-038 より
    // ============================================================================
    describe('TC-LOGS-016: Subscription Filter 設定確認', () => {
      // 【テスト目的】: Log Group から Firehose への Subscription Filter が設定されることを確認する
      // 【テスト内容】: LogGroupConstruct と LogExportConstruct を作成し、Subscription Filter を検証
      // 【期待される動作】: AWS::Logs::SubscriptionFilter リソースが Log Group ごとに作成され、DestinationArn が Firehose を参照する
      // 🔵 信頼性: REQ-038 より

      test('Subscription Filter が設定されること', () => {
        // 【テストデータ準備】: LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'prod',
        });

        // 【テストデータ準備】: LogExportConstruct を作成
        new LogExportConstruct(stack, 'LogExport', {
          envName: 'prod',
          logGroups: [logGroupConstruct.ecsFrontendLogGroup],
          enableExport: true,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Subscription Filter の存在確認
        // 【期待値確認】: DestinationArn と FilterPattern が設定されていること
        template.hasResourceProperties('AWS::Logs::SubscriptionFilter', {
          DestinationArn: Match.anyValue(), // 【確認内容】: Firehose ARN が設定されている 🔵
          FilterPattern: '', // 【確認内容】: 全ログを転送 🔵
        });
      });
    });
  });

  // ============================================================================
  // Dev 環境 S3 Export 無効確認
  // ============================================================================

  describe('Dev 環境 S3 Export 無効確認', () => {
    // ============================================================================
    // TC-LOGS-017: Dev 環境 S3 Export 無効確認
    // 🔵 信頼性: REQ-102 より
    // ============================================================================
    describe('TC-LOGS-017: Dev 環境 S3 Export 無効確認', () => {
      // 【テスト目的】: Dev 環境で S3 Export リソースが作成されないことを確認する
      // 【テスト内容】: LogExportConstruct を `envName: 'dev'` で作成し、リソース数を検証
      // 【期待される動作】: AWS::S3::Bucket リソースが作成されない、AWS::KinesisFirehose::DeliveryStream リソースが作成されない
      // 🔵 信頼性: REQ-102 より

      test('Dev 環境で S3 Export リソースが作成されないこと', () => {
        // 【テストデータ準備】: Dev 環境で LogExportConstruct を作成
        new LogExportConstruct(stack, 'LogExport', {
          envName: 'dev',
          logGroups: [],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3 バケットが作成されないことを確認
        // 【期待値確認】: S3 Bucket が 0 個であること
        template.resourceCountIs('AWS::S3::Bucket', 0); // 【確認内容】: S3 バケット作成なし 🔵

        // 【結果検証】: Firehose が作成されないことを確認
        // 【期待値確認】: KinesisFirehose::DeliveryStream が 0 個であること
        template.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', 0); // 【確認内容】: Firehose 作成なし 🔵
      });
    });
  });

  // ============================================================================
  // Props 検証テスト
  // ============================================================================

  describe('Props 検証テスト', () => {
    // ============================================================================
    // TC-LOGS-023: archiveBucket プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-023: archiveBucket プロパティ確認', () => {
      // 【テスト目的】: Prod 環境で archiveBucket プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogExportConstruct を `envName: 'prod'` で作成し、archiveBucket プロパティを検証
      // 【期待される動作】: archiveBucket が undefined ではない、bucketArn が定義されている
      // 🟡 信頼性: 設計仕様より

      test('archiveBucket プロパティが定義されていること (Prod)', () => {
        // 【テストデータ準備】: Prod 環境で LogExportConstruct を作成
        const logExportConstruct = new LogExportConstruct(stack, 'LogExport', {
          envName: 'prod',
          logGroups: [],
          enableExport: true,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、bucketArn が存在すること
        expect(logExportConstruct.archiveBucket).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logExportConstruct.archiveBucket?.bucketArn).toBeDefined(); // 【確認内容】: bucketArn 存在 🟡
      });
    });
  });
});
