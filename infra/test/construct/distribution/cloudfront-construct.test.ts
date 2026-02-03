/**
 * CloudFront Construct テスト
 *
 * TASK-0019: CloudFront Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-CF-001: CloudFront Distribution リソース作成確認
 * - TC-CF-002: Distribution Enabled 設定確認
 * - TC-CF-003: Price Class 設定確認
 * - TC-CF-004: HTTP Version 設定確認
 * - TC-CF-005: Default Root Object 設定確認
 * - TC-CF-006: カスタム Price Class 設定確認
 * - TC-S3O-001: S3 Origin 作成確認
 * - TC-S3O-002: OAC ID 設定確認
 * - TC-S3O-003: S3 Origin Config 確認
 * - TC-S3O-004: S3 Origin ID 確認
 * - TC-S3O-005: S3 Origin Domain Name 確認
 * - TC-ALBO-001: ALB Origin 作成確認
 * - TC-ALBO-002: ALB Origin Protocol Policy 確認
 * - TC-ALBO-003: ALB Origin HTTPS Port 確認
 * - TC-ALBO-004: ALB Origin Domain Name 確認
 * - TC-CB-001: Default Cache Behavior 確認
 * - TC-CB-002: Default Viewer Protocol Policy 確認
 * - TC-CB-003: Static Asset Path Behavior 確認
 * - TC-CB-004: Assets Path Behavior 確認
 * - TC-CB-005: API Path Behavior 確認
 * - TC-ERR-001: 403 Custom Error Response 確認
 * - TC-ERR-002: 404 Custom Error Response 確認
 * - TC-ERR-003: 5xx Custom Error Response 確認
 * - TC-ERR-004: カスタム Error Page Path 確認
 * - TC-PROP-001: distribution プロパティ確認
 * - TC-PROP-002: distributionArn プロパティ確認
 * - TC-PROP-003: distributionDomainName プロパティ確認
 * - TC-PROP-004: distributionId プロパティ確認
 * - TC-OPT-001: デフォルト値適用確認
 * - TC-OPT-002: カスタム staticAssetPaths 確認
 * - TC-OPT-003: カスタム apiPaths 確認
 * - TC-VAL-001: envName 空文字エラー確認
 * - TC-VAL-002: envName 長さ超過エラー確認
 * - TC-VAL-003: envName 不正文字エラー確認
 * - TC-VAL-004: envName ハイフン開始エラー確認
 * - TC-SNAP-001: CloudFormation テンプレートスナップショット確認
 *
 * 🔵 信頼性: 要件定義書 REQ-031, REQ-032, REQ-043, NFR-104, NFR-105 に基づくテスト
 *
 * @module cloudfront-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CloudFrontConstruct } from '../../../lib/construct/distribution/cloudfront-construct';

describe('CloudFrontConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let s3Bucket: s3.IBucket;
  let originAccessControl: cloudfront.CfnOriginAccessControl;
  let alb: elb.IApplicationLoadBalancer;
  let vpc: ec2.Vpc;

  // テスト用定数
  const TEST_ENV_NAME = 'test';
  const TEST_ACCOUNT = '123456789012';
  const TEST_REGION = 'ap-northeast-1';

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: テスト用のモックリソースを作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: TEST_ACCOUNT,
        region: TEST_REGION,
      },
    });

    // 【VPC 作成】: ALB 配置用
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // 【S3 Bucket 作成】: S3 Origin 用モック
    s3Bucket = new s3.Bucket(stack, 'TestS3Bucket', {
      bucketName: `${TEST_ENV_NAME}-static-content`,
    });

    // 【OAC 作成】: S3 Origin Access Control
    originAccessControl = new cloudfront.CfnOriginAccessControl(
      stack,
      'TestOAC',
      {
        originAccessControlConfig: {
          name: `${TEST_ENV_NAME}-oac`,
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
        },
      }
    );

    // 【ALB 作成】: ALB Origin 用モック
    alb = new elb.ApplicationLoadBalancer(stack, 'TestAlb', {
      vpc,
      internetFacing: true,
    });
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // 正常系テストケース（Distribution 作成）
  // ============================================================================

  describe('正常系 - Distribution 作成', () => {
    // ============================================================================
    // TC-CF-001: CloudFront Distribution リソース作成確認
    // 🔵 信頼性: REQ-032 より
    // ============================================================================
    describe('TC-CF-001: CloudFront Distribution リソース作成確認', () => {
      // 【テスト目的】: CloudFrontConstruct がデフォルト設定で正常に Distribution を作成することを確認
      // 【テスト内容】: 必須パラメータで Construct をインスタンス化し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::CloudFront::Distribution リソースが 1 つ作成される
      // 🔵 信頼性: REQ-032 より

      test('CloudFront Distribution リソースが 1 つ作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        // 【初期条件設定】: デフォルト設定を使用
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Distribution リソースの存在確認
        // 【期待値確認】: 1つの Distribution が作成されること
        template.resourceCountIs('AWS::CloudFront::Distribution', 1); // 【確認内容】: Distribution が1つ存在する 🔵
      });
    });

    // ============================================================================
    // TC-CF-002: Distribution Enabled 設定確認
    // 🔵 信頼性: REQ-032 より
    // ============================================================================
    describe('TC-CF-002: Distribution Enabled 設定確認', () => {
      // 【テスト目的】: Distribution の Enabled 設定が true であることを確認
      // 【テスト内容】: DistributionConfig の Enabled を検証
      // 【期待される動作】: Enabled: true が設定される
      // 🔵 信頼性: REQ-032 より

      test('Distribution が有効化されていること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Distribution Enabled 設定の確認
        // 【期待値確認】: Enabled が true であること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Enabled: true, // 【確認内容】: Distribution が有効 🔵
          }),
        });
      });
    });

    // ============================================================================
    // TC-CF-003: Price Class 設定確認
    // 🔵 信頼性: 設計文書 architecture.md より
    // ============================================================================
    describe('TC-CF-003: Price Class 設定確認', () => {
      // 【テスト目的】: Price Class が PRICE_CLASS_200 (日本含むリージョン) に設定されることを確認
      // 【テスト内容】: DistributionConfig の PriceClass を検証
      // 【期待される動作】: PriceClass: PriceClass_200 が設定される
      // 🔵 信頼性: 設計文書 architecture.md より

      test('Price Class が PriceClass_200 に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Price Class 設定の確認
        // 【期待値確認】: PriceClass_200 が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            PriceClass: 'PriceClass_200', // 【確認内容】: 日本を含む Price Class 🔵
          }),
        });
      });
    });

    // ============================================================================
    // TC-CF-004: HTTP Version 設定確認
    // 🟡 信頼性: タスクノートより
    // ============================================================================
    describe('TC-CF-004: HTTP Version 設定確認', () => {
      // 【テスト目的】: HTTP Version が HTTP/2 and HTTP/3 に設定されることを確認
      // 【テスト内容】: DistributionConfig の HttpVersion を検証
      // 【期待される動作】: HttpVersion: http2and3 が設定される
      // 🟡 信頼性: タスクノートより

      test('HTTP Version が http2and3 に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: HTTP Version 設定の確認
        // 【期待値確認】: http2and3 が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            HttpVersion: 'http2and3', // 【確認内容】: HTTP/2 and HTTP/3 有効 🟡
          }),
        });
      });
    });

    // ============================================================================
    // TC-CF-005: Default Root Object 設定確認
    // 🟡 信頼性: タスクノートより
    // ============================================================================
    describe('TC-CF-005: Default Root Object 設定確認', () => {
      // 【テスト目的】: Default Root Object が index.html に設定されることを確認
      // 【テスト内容】: DistributionConfig の DefaultRootObject を検証
      // 【期待される動作】: DefaultRootObject: index.html が設定される
      // 🟡 信頼性: タスクノートより

      test('Default Root Object が index.html に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Default Root Object 設定の確認
        // 【期待値確認】: index.html が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            DefaultRootObject: 'index.html', // 【確認内容】: デフォルトルートオブジェクト 🟡
          }),
        });
      });
    });

    // ============================================================================
    // TC-CF-006: カスタム Price Class 設定確認
    // 🟡 信頼性: オプションパラメータ仕様より
    // ============================================================================
    describe('TC-CF-006: カスタム Price Class 設定確認', () => {
      // 【テスト目的】: カスタム Price Class が正しく設定されることを確認
      // 【テスト内容】: priceClass オプションで PRICE_CLASS_ALL を指定
      // 【期待される動作】: PriceClass_All が設定される
      // 🟡 信頼性: オプションパラメータ仕様より

      test('カスタム Price Class が正しく設定されること', () => {
        // 【テストデータ準備】: priceClass を指定して CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
          priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: カスタム Price Class 設定の確認
        // 【期待値確認】: PriceClass_All が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            PriceClass: 'PriceClass_All', // 【確認内容】: カスタム Price Class 🟡
          }),
        });
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（S3 Origin OAC）
  // ============================================================================

  describe('正常系 - S3 Origin (OAC)', () => {
    // ============================================================================
    // TC-S3O-001: S3 Origin 作成確認
    // 🔵 信頼性: REQ-032 より
    // ============================================================================
    describe('TC-S3O-001: S3 Origin 作成確認', () => {
      // 【テスト目的】: S3 バケットが Origin として設定されることを確認
      // 【テスト内容】: Origins 配列に S3 Origin が含まれることを検証
      // 【期待される動作】: S3 バケットドメインが Origin に設定される
      // 🔵 信頼性: REQ-032 より

      test('S3 Origin が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3 Origin の存在確認
        // 【期待値確認】: Origins に S3 バケットドメインが含まれること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                DomainName: Match.objectLike({
                  'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*S3Bucket.*')]),
                }),
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-S3O-002: OAC ID 設定確認
    // 🔵 信頼性: NFR-104 より
    // ============================================================================
    describe('TC-S3O-002: OAC ID 設定確認', () => {
      // 【テスト目的】: S3 Origin に OAC ID が設定されることを確認
      // 【テスト内容】: OriginAccessControlId が設定されていることを検証
      // 【期待される動作】: OriginAccessControlId が存在する
      // 🔵 信頼性: NFR-104 より

      test('S3 Origin に OAC ID が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: OAC ID 設定の確認
        // 【期待値確認】: OriginAccessControlId が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                OriginAccessControlId: Match.anyValue(), // 【確認内容】: OAC ID が設定されている 🔵
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-S3O-003: S3 Origin Config 確認
    // 🔵 信頼性: OAC 標準設定より
    // ============================================================================
    describe('TC-S3O-003: S3 Origin Config 確認', () => {
      // 【テスト目的】: OAC 使用時の S3OriginConfig 設定を確認
      // 【テスト内容】: S3OriginConfig.OriginAccessIdentity が空文字列であることを検証
      // 【期待される動作】: OriginAccessIdentity: '' が設定される (OAC 使用時は OAI を使用しない)
      // 🔵 信頼性: OAC 標準設定より

      test('S3OriginConfig で OriginAccessIdentity が空であること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3OriginConfig の確認
        // 【期待値確認】: OriginAccessIdentity が空文字列であること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                S3OriginConfig: {
                  OriginAccessIdentity: '', // 【確認内容】: OAC 使用時は OAI を使用しない 🔵
                },
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-S3O-004: S3 Origin ID 確認
    // 🟡 信頼性: 実装パターンより
    // ============================================================================
    describe('TC-S3O-004: S3 Origin ID 確認', () => {
      // 【テスト目的】: S3 Origin の ID が適切に設定されることを確認
      // 【テスト内容】: Origin の Id が設定されていることを検証
      // 【期待される動作】: Id が存在する
      // 🟡 信頼性: 実装パターンより

      test('S3 Origin の ID が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3 Origin ID の確認
        // 【期待値確認】: Id が存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                Id: Match.anyValue(), // 【確認内容】: Origin ID が設定されている 🟡
                S3OriginConfig: Match.anyValue(),
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-S3O-005: S3 Origin Domain Name 確認
    // 🔵 信頼性: S3 Origin 標準設定より
    // ============================================================================
    describe('TC-S3O-005: S3 Origin Domain Name 確認', () => {
      // 【テスト目的】: S3 Origin のドメイン名が正しく設定されることを確認
      // 【テスト内容】: S3 バケットのリージョナルドメイン名が設定されていることを検証
      // 【期待される動作】: bucketRegionalDomainName 形式が設定される
      // 🔵 信頼性: S3 Origin 標準設定より

      test('S3 Origin のドメイン名が正しく設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: S3 Origin Domain Name の確認
        // 【期待値確認】: RegionalDomainName が使用されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                DomainName: Match.objectLike({
                  'Fn::GetAtt': [
                    Match.stringLikeRegexp('.*S3Bucket.*'),
                    'RegionalDomainName', // 【確認内容】: リージョナルドメイン名 🔵
                  ],
                }),
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（ALB Origin）
  // ============================================================================

  describe('正常系 - ALB Origin', () => {
    // ============================================================================
    // TC-ALBO-001: ALB Origin 作成確認
    // 🔵 信頼性: 設計文書 architecture.md より
    // ============================================================================
    describe('TC-ALBO-001: ALB Origin 作成確認', () => {
      // 【テスト目的】: ALB が Origin として設定されることを確認
      // 【テスト内容】: Origins 配列に ALB Origin が含まれることを検証
      // 【期待される動作】: ALB ドメインが Origin に設定される
      // 🔵 信頼性: 設計文書 architecture.md より

      test('ALB Origin が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB Origin の存在確認
        // 【期待値確認】: Origins に CustomOriginConfig を持つ Origin が含まれること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                CustomOriginConfig: Match.anyValue(), // 【確認内容】: ALB Origin (CustomOriginConfig) が存在 🔵
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-ALBO-002: ALB Origin Protocol Policy 確認
    // 🔵 信頼性: NFR-105 より
    // ============================================================================
    describe('TC-ALBO-002: ALB Origin Protocol Policy 確認', () => {
      // 【テスト目的】: ALB Origin が HTTPS-only で設定されることを確認
      // 【テスト内容】: OriginProtocolPolicy が https-only であることを検証
      // 【期待される動作】: OriginProtocolPolicy: https-only が設定される
      // 🔵 信頼性: NFR-105 より

      test('ALB Origin が https-only で設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB Origin Protocol Policy の確認
        // 【期待値確認】: https-only が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                CustomOriginConfig: Match.objectLike({
                  OriginProtocolPolicy: 'https-only', // 【確認内容】: HTTPS のみ 🔵
                }),
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-ALBO-003: ALB Origin HTTPS Port 確認
    // 🔵 信頼性: ALB 標準設定より
    // ============================================================================
    describe('TC-ALBO-003: ALB Origin HTTPS Port 確認', () => {
      // 【テスト目的】: ALB Origin の HTTPS ポートが 443 に設定されることを確認
      // 【テスト内容】: HTTPSPort が 443 であることを検証
      // 【期待される動作】: HTTPSPort: 443 が設定される
      // 🔵 信頼性: ALB 標準設定より

      test('ALB Origin の HTTPS ポートが 443 であること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB Origin HTTPS Port の確認
        // 【期待値確認】: HTTPSPort が 443 であること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                CustomOriginConfig: Match.objectLike({
                  HTTPSPort: 443, // 【確認内容】: HTTPS ポート 443 🔵
                }),
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-ALBO-004: ALB Origin Domain Name 確認
    // 🔵 信頼性: ALB Origin 標準設定より
    // ============================================================================
    describe('TC-ALBO-004: ALB Origin Domain Name 確認', () => {
      // 【テスト目的】: ALB Origin のドメイン名が正しく設定されることを確認
      // 【テスト内容】: ALB の loadBalancerDnsName が設定されていることを検証
      // 【期待される動作】: ALB ドメインが設定される
      // 🔵 信頼性: ALB Origin 標準設定より

      test('ALB Origin のドメイン名が正しく設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB Origin Domain Name の確認
        // 【期待値確認】: ALB の DNSName が使用されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            Origins: Match.arrayWith([
              Match.objectLike({
                DomainName: Match.objectLike({
                  'Fn::GetAtt': [
                    Match.stringLikeRegexp('.*Alb.*'),
                    'DNSName', // 【確認内容】: ALB の DNS 名 🔵
                  ],
                }),
                CustomOriginConfig: Match.objectLike({}),
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（Cache Behavior）
  // ============================================================================

  describe('正常系 - Cache Behavior', () => {
    // ============================================================================
    // TC-CB-001: Default Cache Behavior 確認
    // 🔵 信頼性: 設計文書 dataflow.md より
    // ============================================================================
    describe('TC-CB-001: Default Cache Behavior 確認', () => {
      // 【テスト目的】: Default Cache Behavior が ALB Origin を指すことを確認
      // 【テスト内容】: DefaultCacheBehavior の TargetOriginId が ALB Origin を指すことを検証
      // 【期待される動作】: TargetOriginId が ALB Origin の ID
      // 🔵 信頼性: 設計文書 dataflow.md より

      test('Default Cache Behavior が ALB Origin を指すこと', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Default Cache Behavior の確認
        // 【期待値確認】: TargetOriginId が存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              TargetOriginId: Match.anyValue(), // 【確認内容】: Default が ALB Origin を指す 🔵
            }),
          }),
        });
      });
    });

    // ============================================================================
    // TC-CB-002: Default Viewer Protocol Policy 確認
    // 🔵 信頼性: NFR-105 より
    // ============================================================================
    describe('TC-CB-002: Default Viewer Protocol Policy 確認', () => {
      // 【テスト目的】: Default Cache Behavior で HTTPS リダイレクトが設定されることを確認
      // 【テスト内容】: ViewerProtocolPolicy が redirect-to-https であることを検証
      // 【期待される動作】: ViewerProtocolPolicy: redirect-to-https が設定される
      // 🔵 信頼性: NFR-105 より

      test('Default Cache Behavior で HTTPS リダイレクトが設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Viewer Protocol Policy の確認
        // 【期待値確認】: redirect-to-https が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              ViewerProtocolPolicy: 'redirect-to-https', // 【確認内容】: HTTPS リダイレクト 🔵
            }),
          }),
        });
      });
    });

    // ============================================================================
    // TC-CB-003: Static Asset Path Behavior 確認
    // 🔵 信頼性: REQ-032 より
    // ============================================================================
    describe('TC-CB-003: Static Asset Path Behavior 確認', () => {
      // 【テスト目的】: /static/* パスが S3 Origin にルーティングされることを確認
      // 【テスト内容】: CacheBehaviors に /static/* パターンが含まれることを検証
      // 【期待される動作】: /static/* → S3 Origin の CacheBehavior が存在
      // 🔵 信頼性: REQ-032 より

      test('/static/* パスが S3 Origin にルーティングされること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: /static/* CacheBehavior の確認
        // 【期待値確認】: PathPattern が /static/* の CacheBehavior が存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({
                PathPattern: '/static/*', // 【確認内容】: /static/* パス 🔵
                ViewerProtocolPolicy: 'redirect-to-https',
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-CB-004: Assets Path Behavior 確認
    // 🔵 信頼性: REQ-032 より
    // ============================================================================
    describe('TC-CB-004: Assets Path Behavior 確認', () => {
      // 【テスト目的】: /assets/* パスが S3 Origin にルーティングされることを確認
      // 【テスト内容】: CacheBehaviors に /assets/* パターンが含まれることを検証
      // 【期待される動作】: /assets/* → S3 Origin の CacheBehavior が存在
      // 🔵 信頼性: REQ-032 より

      test('/assets/* パスが S3 Origin にルーティングされること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: /assets/* CacheBehavior の確認
        // 【期待値確認】: PathPattern が /assets/* の CacheBehavior が存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({
                PathPattern: '/assets/*', // 【確認内容】: /assets/* パス 🔵
                ViewerProtocolPolicy: 'redirect-to-https',
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-CB-005: API Path Behavior 確認
    // 🔵 信頼性: 設計文書 dataflow.md より
    // ============================================================================
    describe('TC-CB-005: API Path Behavior 確認', () => {
      // 【テスト目的】: /api/* パスが ALB Origin にルーティングされることを確認
      // 【テスト内容】: CacheBehaviors に /api/* パターンが含まれることを検証
      // 【期待される動作】: /api/* → ALB Origin の CacheBehavior が存在
      // 🔵 信頼性: 設計文書 dataflow.md より

      test('/api/* パスが ALB Origin にルーティングされること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: /api/* CacheBehavior の確認
        // 【期待値確認】: PathPattern が /api/* の CacheBehavior が存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({
                PathPattern: '/api/*', // 【確認内容】: /api/* パス 🔵
                ViewerProtocolPolicy: 'redirect-to-https',
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（エラーページ）
  // ============================================================================

  describe('正常系 - エラーページ', () => {
    // ============================================================================
    // TC-ERR-001: 403 Custom Error Response 確認
    // 🔵 信頼性: REQ-031 より
    // ============================================================================
    describe('TC-ERR-001: 403 Custom Error Response 確認', () => {
      // 【テスト目的】: 403 エラー時にエラーページが返されることを確認
      // 【テスト内容】: CustomErrorResponses に 403 の設定が含まれることを検証
      // 【期待される動作】: 403 → 200 + /error.html
      // 🔵 信頼性: REQ-031 より

      test('403 エラー時にエラーページが返されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: 403 Custom Error Response の確認
        // 【期待値確認】: ErrorCode: 403, ResponseCode: 200, ResponsePagePath: /error.html
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 403,
                ResponseCode: 200,
                ResponsePagePath: '/error.html', // 【確認内容】: 403 エラーハンドリング 🔵
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-ERR-002: 404 Custom Error Response 確認
    // 🔵 信頼性: REQ-031 より
    // ============================================================================
    describe('TC-ERR-002: 404 Custom Error Response 確認', () => {
      // 【テスト目的】: 404 エラー時にエラーページが返されることを確認
      // 【テスト内容】: CustomErrorResponses に 404 の設定が含まれることを検証
      // 【期待される動作】: 404 → 200 + /error.html
      // 🔵 信頼性: REQ-031 より

      test('404 エラー時にエラーページが返されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: 404 Custom Error Response の確認
        // 【期待値確認】: ErrorCode: 404, ResponseCode: 200, ResponsePagePath: /error.html
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: '/error.html', // 【確認内容】: 404 エラーハンドリング 🔵
              }),
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-ERR-003: 5xx Custom Error Response 確認
    // 🔵 信頼性: REQ-031, EDGE-001 より
    // ============================================================================
    describe('TC-ERR-003: 5xx Custom Error Response 確認', () => {
      // 【テスト目的】: 5xx エラー時にエラーページが返されることを確認
      // 【テスト内容】: CustomErrorResponses に 500, 502, 503, 504 の設定が含まれることを検証
      // 【期待される動作】: 5xx → 200 + /error.html
      // 🔵 信頼性: REQ-031, EDGE-001 より

      test('5xx エラー時にエラーページが返されること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: 5xx Custom Error Response の確認
        // 【期待値確認】: 500, 502, 503, 504 のエラーレスポンスが設定されていること
        const errorCodes = [500, 502, 503, 504];
        for (const errorCode of errorCodes) {
          template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
              CustomErrorResponses: Match.arrayWith([
                Match.objectLike({
                  ErrorCode: errorCode,
                  ResponseCode: 200,
                  ResponsePagePath: '/error.html', // 【確認内容】: 5xx エラーハンドリング 🔵
                }),
              ]),
            }),
          });
        }
      });
    });

    // ============================================================================
    // TC-ERR-004: カスタム Error Page Path 確認
    // 🟡 信頼性: オプションパラメータ仕様より
    // ============================================================================
    describe('TC-ERR-004: カスタム Error Page Path 確認', () => {
      // 【テスト目的】: カスタムエラーページパスが設定されることを確認
      // 【テスト内容】: errorPagePath オプションで /sorry.html を指定
      // 【期待される動作】: ResponsePagePath: /sorry.html が設定される
      // 🟡 信頼性: オプションパラメータ仕様より

      test('カスタムエラーページパスが設定されること', () => {
        // 【テストデータ準備】: errorPagePath を指定して CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
          errorPagePath: '/sorry.html',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: カスタム Error Page Path の確認
        // 【期待値確認】: ResponsePagePath が /sorry.html であること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ResponsePagePath: '/sorry.html', // 【確認内容】: カスタムエラーページパス 🟡
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（プロパティ）
  // ============================================================================

  describe('正常系 - プロパティ', () => {
    // ============================================================================
    // TC-PROP-001: distribution プロパティ確認
    // 🔵 信頼性: note.md 設計文書より
    // ============================================================================
    describe('TC-PROP-001: distribution プロパティ確認', () => {
      // 【テスト目的】: distribution プロパティが正しく公開されることを確認
      // 【テスト内容】: distribution プロパティが定義されていることを検証
      // 【期待される動作】: distribution プロパティが undefined でない
      // 🔵 信頼性: note.md 設計文書より

      test('distribution プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        const cloudfrontConstruct = new CloudFrontConstruct(
          stack,
          'TestCloudFront',
          {
            envName: TEST_ENV_NAME,
            s3Bucket,
            originAccessControl,
            alb,
          }
        );

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: distribution が undefined でないこと
        expect(cloudfrontConstruct.distribution).toBeDefined(); // 【確認内容】: distribution プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-PROP-002: distributionArn プロパティ確認
    // 🔵 信頼性: note.md 設計文書より
    // ============================================================================
    describe('TC-PROP-002: distributionArn プロパティ確認', () => {
      // 【テスト目的】: distributionArn プロパティが正しく公開されることを確認
      // 【テスト内容】: distributionArn プロパティが定義されていることを検証
      // 【期待される動作】: distributionArn プロパティが undefined でない
      // 🔵 信頼性: note.md 設計文書より

      test('distributionArn プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        const cloudfrontConstruct = new CloudFrontConstruct(
          stack,
          'TestCloudFront',
          {
            envName: TEST_ENV_NAME,
            s3Bucket,
            originAccessControl,
            alb,
          }
        );

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: distributionArn が undefined でないこと
        expect(cloudfrontConstruct.distributionArn).toBeDefined(); // 【確認内容】: distributionArn プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-PROP-003: distributionDomainName プロパティ確認
    // 🔵 信頼性: REQ-043 より
    // ============================================================================
    describe('TC-PROP-003: distributionDomainName プロパティ確認', () => {
      // 【テスト目的】: distributionDomainName プロパティが正しく公開されることを確認
      // 【テスト内容】: distributionDomainName プロパティが定義されていることを検証
      // 【期待される動作】: distributionDomainName プロパティが undefined でない
      // 🔵 信頼性: REQ-043 より

      test('distributionDomainName プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        const cloudfrontConstruct = new CloudFrontConstruct(
          stack,
          'TestCloudFront',
          {
            envName: TEST_ENV_NAME,
            s3Bucket,
            originAccessControl,
            alb,
          }
        );

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: distributionDomainName が undefined でないこと
        expect(cloudfrontConstruct.distributionDomainName).toBeDefined(); // 【確認内容】: distributionDomainName プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-PROP-004: distributionId プロパティ確認
    // 🔵 信頼性: note.md 設計文書より
    // ============================================================================
    describe('TC-PROP-004: distributionId プロパティ確認', () => {
      // 【テスト目的】: distributionId プロパティが正しく公開されることを確認
      // 【テスト内容】: distributionId プロパティが定義されていることを検証
      // 【期待される動作】: distributionId プロパティが undefined でない
      // 🔵 信頼性: note.md 設計文書より

      test('distributionId プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで CloudFrontConstruct を作成
        const cloudfrontConstruct = new CloudFrontConstruct(
          stack,
          'TestCloudFront',
          {
            envName: TEST_ENV_NAME,
            s3Bucket,
            originAccessControl,
            alb,
          }
        );

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: distributionId が undefined でないこと
        expect(cloudfrontConstruct.distributionId).toBeDefined(); // 【確認内容】: distributionId プロパティが存在 🔵
      });
    });
  });

  // ============================================================================
  // 正常系テストケース（オプション設定）
  // ============================================================================

  describe('正常系 - オプション設定', () => {
    // ============================================================================
    // TC-OPT-001: デフォルト値適用確認
    // 🟡 信頼性: オプションパラメータ仕様より
    // ============================================================================
    describe('TC-OPT-001: デフォルト値適用確認', () => {
      // 【テスト目的】: オプションパラメータのデフォルト値が適用されることを確認
      // 【テスト内容】: 必須パラメータのみで作成し、デフォルト値を検証
      // 【期待される動作】: 全デフォルト値が正しく設定される
      // 🟡 信頼性: オプションパラメータ仕様より

      test('デフォルト値が正しく適用されること', () => {
        // 【テストデータ準備】: 必須パラメータのみで CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: デフォルト値の確認
        // 【期待値確認】: PriceClass_200, http2and3, index.html が設定されていること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            PriceClass: 'PriceClass_200',
            HttpVersion: 'http2and3',
            DefaultRootObject: 'index.html', // 【確認内容】: デフォルト値が適用されている 🟡
          }),
        });
      });
    });

    // ============================================================================
    // TC-OPT-002: カスタム staticAssetPaths 確認
    // 🟡 信頼性: オプションパラメータ仕様より
    // ============================================================================
    describe('TC-OPT-002: カスタム staticAssetPaths 確認', () => {
      // 【テスト目的】: カスタム静的アセットパスが設定されることを確認
      // 【テスト内容】: staticAssetPaths オプションでカスタムパスを指定
      // 【期待される動作】: 指定したパスの CacheBehavior が作成される
      // 🟡 信頼性: オプションパラメータ仕様より

      test('カスタム静的アセットパスが設定されること', () => {
        // 【テストデータ準備】: staticAssetPaths を指定して CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
          staticAssetPaths: ['/static/*', '/images/*', '/css/*'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: カスタム staticAssetPaths の確認
        // 【期待値確認】: /images/* と /css/* のパスが存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({ PathPattern: '/images/*' }),
              Match.objectLike({ PathPattern: '/css/*' }), // 【確認内容】: カスタム静的アセットパス 🟡
            ]),
          }),
        });
      });
    });

    // ============================================================================
    // TC-OPT-003: カスタム apiPaths 確認
    // 🟡 信頼性: オプションパラメータ仕様より
    // ============================================================================
    describe('TC-OPT-003: カスタム apiPaths 確認', () => {
      // 【テスト目的】: カスタム API パスが設定されることを確認
      // 【テスト内容】: apiPaths オプションでカスタムパスを指定
      // 【期待される動作】: 指定したパスの CacheBehavior が作成される
      // 🟡 信頼性: オプションパラメータ仕様より

      test('カスタム API パスが設定されること', () => {
        // 【テストデータ準備】: apiPaths を指定して CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
          apiPaths: ['/api/*', '/graphql/*'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: カスタム apiPaths の確認
        // 【期待値確認】: /graphql/* のパスが存在すること
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({ PathPattern: '/graphql/*' }), // 【確認内容】: カスタム API パス 🟡
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // 異常系テストケース（バリデーション）
  // ============================================================================

  describe('異常系 - バリデーション', () => {
    // ============================================================================
    // TC-VAL-001: envName 空文字エラー確認
    // 🟡 信頼性: 既存 Construct パターンより
    // ============================================================================
    describe('TC-VAL-001: envName 空文字エラー確認', () => {
      // 【テスト目的】: envName が空文字の場合にエラーが発生することを確認
      // 【テスト内容】: envName='' でインスタンス化し、エラー発生を検証
      // 【期待される動作】: バリデーションエラーがスローされる
      // 🟡 信頼性: 既存 Construct パターンより

      test('envName が空の場合エラーとなること', () => {
        // 【テストデータ準備】: envName='' で CloudFrontConstruct を作成
        // 【期待される動作】: エラーがスローされる
        expect(() => {
          new CloudFrontConstruct(stack, 'TestCloudFront', {
            envName: '',
            s3Bucket,
            originAccessControl,
            alb,
          });
        }).toThrow('envName は必須です。空文字列は指定できません。'); // 【確認内容】: 空文字エラー 🟡
      });
    });

    // ============================================================================
    // TC-VAL-002: envName 長さ超過エラー確認
    // 🟡 信頼性: 既存 Construct パターンより
    // ============================================================================
    describe('TC-VAL-002: envName 長さ超過エラー確認', () => {
      // 【テスト目的】: envName が 20 文字を超える場合にエラーが発生することを確認
      // 【テスト内容】: 21 文字の envName でインスタンス化し、エラー発生を検証
      // 【期待される動作】: バリデーションエラーがスローされる
      // 🟡 信頼性: 既存 Construct パターンより

      test('envName が 20 文字を超える場合エラーとなること', () => {
        // 【テストデータ準備】: 21 文字の envName で CloudFrontConstruct を作成
        // 【期待される動作】: エラーがスローされる
        expect(() => {
          new CloudFrontConstruct(stack, 'TestCloudFront', {
            envName: 'a'.repeat(21),
            s3Bucket,
            originAccessControl,
            alb,
          });
        }).toThrow('envName は 20 文字以下である必要があります。'); // 【確認内容】: 長さ超過エラー 🟡
      });
    });

    // ============================================================================
    // TC-VAL-003: envName 不正文字エラー確認
    // 🟡 信頼性: 既存 Construct パターンより
    // ============================================================================
    describe('TC-VAL-003: envName 不正文字エラー確認', () => {
      // 【テスト目的】: envName に不正な文字が含まれる場合にエラーが発生することを確認
      // 【テスト内容】: 大文字・アンダースコアを含む envName でインスタンス化し、エラー発生を検証
      // 【期待される動作】: バリデーションエラーがスローされる
      // 🟡 信頼性: 既存 Construct パターンより

      test('envName に不正な文字が含まれる場合エラーとなること', () => {
        // 【テストデータ準備】: 不正文字を含む envName で CloudFrontConstruct を作成
        // 【期待される動作】: エラーがスローされる
        expect(() => {
          new CloudFrontConstruct(stack, 'TestCloudFront', {
            envName: 'Test_Env',
            s3Bucket,
            originAccessControl,
            alb,
          });
        }).toThrow('envName は小文字英数字とハイフンのみで構成されます。'); // 【確認内容】: 不正文字エラー 🟡
      });
    });

    // ============================================================================
    // TC-VAL-004: envName ハイフン開始エラー確認
    // 🟡 信頼性: 既存 Construct パターンより
    // ============================================================================
    describe('TC-VAL-004: envName ハイフン開始エラー確認', () => {
      // 【テスト目的】: envName がハイフンで開始する場合にエラーが発生することを確認
      // 【テスト内容】: ハイフン開始の envName でインスタンス化し、エラー発生を検証
      // 【期待される動作】: バリデーションエラーがスローされる
      // 🟡 信頼性: 既存 Construct パターンより

      test('envName がハイフンで開始する場合エラーとなること', () => {
        // 【テストデータ準備】: ハイフン開始の envName で CloudFrontConstruct を作成
        // 【期待される動作】: エラーがスローされる
        expect(() => {
          new CloudFrontConstruct(stack, 'TestCloudFront', {
            envName: '-dev',
            s3Bucket,
            originAccessControl,
            alb,
          });
        }).toThrow('envName は小文字英数字とハイフンのみで構成されます。'); // 【確認内容】: ハイフン開始エラー 🟡
      });
    });
  });

  // ============================================================================
  // スナップショットテストケース
  // ============================================================================

  describe('スナップショットテスト', () => {
    // ============================================================================
    // TC-SNAP-001: CloudFormation テンプレートスナップショット確認
    // 🔵 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-SNAP-001: CloudFormation テンプレートスナップショット確認', () => {
      // 【テスト目的】: 生成される CloudFormation テンプレートが期待通りであることを確認
      // 【テスト内容】: テンプレートがスナップショットと一致することを検証
      // 【期待される動作】: テンプレートがスナップショットと一致する
      // 🔵 信頼性: CDK ベストプラクティスより

      test('CloudFormation テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: 全オプション指定で CloudFrontConstruct を作成
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          envName: TEST_ENV_NAME,
          s3Bucket,
          originAccessControl,
          alb,
          priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
          defaultRootObject: 'index.html',
          httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
          enableErrorPages: true,
          errorPagePath: '/error.html',
          staticAssetPaths: ['/static/*', '/assets/*'],
          apiPaths: ['/api/*'],
        });

        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: CloudFormation テンプレートスナップショット 🔵
      });
    });
  });
});
