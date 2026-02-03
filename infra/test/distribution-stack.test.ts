/**
 * Distribution Stack テスト
 *
 * TASK-0020: Distribution Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * 【テスト概要】: DistributionStack の動作を検証するテストスイート
 * 【テスト対象】: distribution-stack.ts
 * 【テストケース数】: 36 テストケース
 *
 * テストケース:
 * - TC-DS-01〜02: スナップショットテスト
 * - TC-DS-03〜08: リソース存在確認テスト
 * - TC-DS-09〜14: Construct 統合テスト
 * - TC-DS-15〜20: 公開プロパティ確認テスト
 * - TC-DS-21〜24: CfnOutput 確認テスト
 * - TC-DS-25〜27: 依存関係テスト
 * - TC-DS-28〜30: セキュリティテスト
 * - TC-DS-31〜33: オプション設定テスト
 * - TC-DS-34〜36: 異常系・バリデーションテスト
 *
 * 🔵 信頼性: 要件定義書 REQ-031〜034, REQ-043、NFR-103〜105 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DistributionStack } from '../lib/stack/distribution-stack';
import { devConfig, prodConfig, EnvironmentConfig } from '../parameter';

// ============================================================================
// 【テスト用定数】
// ============================================================================

/**
 * 【テスト用 AWS アカウント ID】
 * 🔵 信頼性: テスト用の仮想アカウント
 */
const TEST_ACCOUNT_ID = '123456789012';

/**
 * 【テスト用リージョン】
 * 🔵 信頼性: REQ-403 より（ap-northeast-1）
 */
const TEST_REGION = 'ap-northeast-1';

// ============================================================================
// 【テストヘルパー関数】
// ============================================================================

/**
 * 【VPC 作成ヘルパー】: テスト用の VPC を作成
 *
 * 【設計方針】: Distribution Stack が必要とする ALB の前提 VPC
 * 【サブネット構成】: Public、Private App、Private DB（Isolated）の 3 層構造
 *
 * 🔵 信頼性: architecture.md VPC 設計より
 *
 * @param stack テスト用スタック
 * @returns 作成された VPC
 */
function createTestVpc(stack: cdk.Stack): ec2.IVpc {
  return new ec2.Vpc(stack, 'TestVpc', {
    maxAzs: 2,
    subnetConfiguration: [
      {
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        name: 'PrivateApp',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 23,
      },
      {
        name: 'PrivateDb',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        cidrMask: 24,
      },
    ],
  });
}

/**
 * 【ALB 作成ヘルパー】: テスト用の Application Load Balancer を作成
 *
 * 【設計方針】: Application Stack が作成する ALB をシミュレート
 *
 * 🔵 信頼性: application-stack.ts より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された ALB
 */
function createTestAlb(stack: cdk.Stack, vpc: ec2.IVpc): elb.IApplicationLoadBalancer {
  return new elb.ApplicationLoadBalancer(stack, 'TestAlb', {
    vpc,
    internetFacing: true,
    vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
  });
}

/**
 * 【ALB Security Group 作成ヘルパー】: テスト用の ALB Security Group を作成
 *
 * 【設計方針】: Security Stack が作成する ALB 用 Security Group をシミュレート
 *
 * 🔵 信頼性: security-stack.ts より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された Security Group
 */
function createTestAlbSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc): ec2.ISecurityGroup {
  return new ec2.SecurityGroup(stack, 'TestAlbSg', {
    vpc,
    description: 'Test ALB Security Group',
    allowAllOutbound: true,
  });
}

/**
 * 【テスト用 Config 作成ヘルパー】: カスタマイズされた config を作成
 *
 * @param overrides 上書きするプロパティ
 * @returns カスタマイズされた EnvironmentConfig
 */
function createTestConfig(overrides: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
  return {
    ...devConfig,
    ...overrides,
  };
}

describe('DistributionStack', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と DistributionStack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let prereqStack: cdk.Stack;
  let vpc: ec2.IVpc;
  let alb: elb.IApplicationLoadBalancer;
  let albSecurityGroup: ec2.ISecurityGroup;
  let stack: DistributionStack;
  let template: Template;

  /**
   * 【テスト環境設定】: 各テストで使用する共通環境
   */
  const testEnv = {
    account: TEST_ACCOUNT_ID,
    region: TEST_REGION,
  };

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と 前提リソースを作成
    // 【初期条件設定】: devConfig を使用して DistributionStack を生成
    // 【前提条件確認】: Application Stack の模擬リソースが正常に作成されていること
    app = new cdk.App();

    // 【前提 Stack 作成】: Application Stack の模擬
    prereqStack = new cdk.Stack(app, 'TestPrereqStack', { env: testEnv });
    vpc = createTestVpc(prereqStack);
    alb = createTestAlb(prereqStack, vpc);
    albSecurityGroup = createTestAlbSecurityGroup(prereqStack, vpc);

    // 【実際の処理実行】: DistributionStack を作成
    // 【処理内容】: DistributionStack が作成するリソースを CloudFormation テンプレート形式で取得
    stack = new DistributionStack(app, 'TestDistributionStack', {
      alb,
      albSecurityGroup,
      config: devConfig,
      env: testEnv,
    });
    template = Template.fromStack(stack);
  });

  // ============================================================================
  // TC-DS-01: スナップショットテスト（devConfig）
  // 🔵 信頼性: CDK ベストプラクティス、application-stack.test.ts パターンより
  // ============================================================================
  describe('TC-DS-01: スナップショットテスト（devConfig）', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: DistributionStack の CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する

    test('CloudFormation テンプレートのスナップショットテスト（Dev環境）', () => {
      // 【テストデータ準備】: devConfig を使用して DistributionStack を作成
      const snapshotApp = new cdk.App();
      const snapshotEnv = { account: TEST_ACCOUNT_ID, region: TEST_REGION };

      // 【前提 Stack 作成】: 模擬リソース
      const snapshotPrereqStack = new cdk.Stack(snapshotApp, 'SnapshotPrereqStack', {
        env: snapshotEnv,
      });
      const snapshotVpc = createTestVpc(snapshotPrereqStack);
      const snapshotAlb = createTestAlb(snapshotPrereqStack, snapshotVpc);
      const snapshotAlbSg = createTestAlbSecurityGroup(snapshotPrereqStack, snapshotVpc);

      // 【実際の処理実行】: DistributionStack を作成
      const snapshotStack = new DistributionStack(snapshotApp, 'SnapshotDistributionStack', {
        alb: snapshotAlb,
        albSecurityGroup: snapshotAlbSg,
        config: devConfig,
        env: snapshotEnv,
      });
      const snapshotTemplate = Template.fromStack(snapshotStack);

      // 【結果検証】: スナップショットとの一致を確認
      expect(snapshotTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-DS-02: スナップショットテスト（WAF 無効化）
  // 🟡 信頼性: 要件定義書 enableWaf オプションより
  // ============================================================================
  describe('TC-DS-02: スナップショットテスト（WAF 無効化）', () => {
    test('CloudFormation テンプレートのスナップショットテスト（WAF無効）', () => {
      const noWafApp = new cdk.App();
      const noWafEnv = { account: TEST_ACCOUNT_ID, region: TEST_REGION };

      const noWafPrereqStack = new cdk.Stack(noWafApp, 'NoWafPrereqStack', { env: noWafEnv });
      const noWafVpc = createTestVpc(noWafPrereqStack);
      const noWafAlb = createTestAlb(noWafPrereqStack, noWafVpc);
      const noWafAlbSg = createTestAlbSecurityGroup(noWafPrereqStack, noWafVpc);

      const noWafStack = new DistributionStack(noWafApp, 'NoWafDistributionStack', {
        alb: noWafAlb,
        albSecurityGroup: noWafAlbSg,
        config: devConfig,
        enableWaf: false,
        env: noWafEnv,
      });
      const noWafTemplate = Template.fromStack(noWafStack);

      expect(noWafTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-DS-03: S3 Bucket リソース存在確認
  // 🔵 信頼性: REQ-031、TASK-0018 より
  // ============================================================================
  describe('TC-DS-03: S3 Bucket リソース存在確認', () => {
    test('S3 Bucket が 1 つ作成されること', () => {
      // 【検証項目】: S3 Bucket リソースの数
      // 🔵 信頼性: REQ-031 より
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });
  });

  // ============================================================================
  // TC-DS-04: S3 Bucket Policy リソース存在確認
  // 🔵 信頼性: REQ-032、TASK-0018 より
  // ============================================================================
  describe('TC-DS-04: S3 Bucket Policy リソース存在確認', () => {
    test('S3 Bucket Policy が作成されること', () => {
      // 【検証項目】: BucketPolicy リソースの数
      // 🔵 信頼性: REQ-032 より
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);
    });
  });

  // ============================================================================
  // TC-DS-05: OAC リソース存在確認
  // 🔵 信頼性: REQ-032、TASK-0018 より
  // ============================================================================
  describe('TC-DS-05: OAC リソース存在確認', () => {
    test('Origin Access Control が 1 つ作成されること', () => {
      // 【検証項目】: OAC リソースの数
      // 🔵 信頼性: REQ-032 より
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    });
  });

  // ============================================================================
  // TC-DS-06: CloudFront Distribution リソース存在確認
  // 🔵 信頼性: REQ-032、TASK-0019 より
  // ============================================================================
  describe('TC-DS-06: CloudFront Distribution リソース存在確認', () => {
    test('CloudFront Distribution が 1 つ作成されること', () => {
      // 【検証項目】: Distribution リソースの数
      // 🔵 信頼性: REQ-032 より
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
  });

  // ============================================================================
  // TC-DS-07: WAF WebACL リソース存在確認（有効時）
  // 🔵 信頼性: REQ-033、TASK-0011 より
  // ============================================================================
  describe('TC-DS-07: WAF WebACL リソース存在確認（有効時）', () => {
    test('WAF WebACL が 1 つ作成されること（enableWaf: true）', () => {
      // 【検証項目】: WebACL リソースの数（デフォルト設定）
      // 🔵 信頼性: REQ-033 より
      template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    });
  });

  // ============================================================================
  // TC-DS-08: WAF WebACL リソース不在確認（無効時）
  // 🟡 信頼性: 要件定義書 enableWaf オプションより
  // ============================================================================
  describe('TC-DS-08: WAF WebACL リソース不在確認（無効時）', () => {
    test('WAF WebACL が作成されないこと（enableWaf: false）', () => {
      // 【新規 Stack 作成】: enableWaf: false
      const noWafApp = new cdk.App();
      const noWafPrereqStack = new cdk.Stack(noWafApp, 'NoWafPrereq', { env: testEnv });
      const noWafVpc = createTestVpc(noWafPrereqStack);
      const noWafAlb = createTestAlb(noWafPrereqStack, noWafVpc);
      const noWafAlbSg = createTestAlbSecurityGroup(noWafPrereqStack, noWafVpc);

      const noWafStack = new DistributionStack(noWafApp, 'NoWafStack', {
        alb: noWafAlb,
        albSecurityGroup: noWafAlbSg,
        config: devConfig,
        enableWaf: false,
        env: testEnv,
      });
      const noWafTemplate = Template.fromStack(noWafStack);

      // 【検証項目】: WebACL リソースが存在しないこと
      noWafTemplate.resourceCountIs('AWS::WAFv2::WebACL', 0);
    });
  });

  // ============================================================================
  // TC-DS-09: S3 バケット パブリックアクセスブロック設定確認
  // 🔵 信頼性: REQ-031、NFR-104 より
  // ============================================================================
  describe('TC-DS-09: S3 バケット パブリックアクセスブロック設定確認', () => {
    test('S3 バケットにパブリックアクセスブロックが設定される', () => {
      // 【検証項目】: パブリックアクセスブロックの設定
      // 🔵 信頼性: NFR-104 より
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-10: CloudFront Distribution HTTPS 強制設定確認
  // 🔵 信頼性: NFR-105、TASK-0019 より
  // ============================================================================
  describe('TC-DS-10: CloudFront Distribution HTTPS 強制設定確認', () => {
    test('CloudFront で HTTPS リダイレクトが設定される', () => {
      // 【検証項目】: ViewerProtocolPolicy
      // 🔵 信頼性: NFR-105 より
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-11: CloudFront Distribution に S3 Origin が設定される
  // 🔵 信頼性: REQ-032 より
  // ============================================================================
  describe('TC-DS-11: CloudFront Distribution に S3 Origin が設定される', () => {
    test('Distribution の Origins に S3 バケットが含まれる', () => {
      // 【検証項目】: Origins 配列に S3 Origin が存在すること
      // 🔵 信頼性: REQ-032 より
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              S3OriginConfig: Match.anyValue(),
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-12: CloudFront Distribution に ALB Origin が設定される
  // 🔵 信頼性: TASK-0019 より
  // ============================================================================
  describe('TC-DS-12: CloudFront Distribution に ALB Origin が設定される', () => {
    test('Distribution の Origins に ALB が含まれる', () => {
      // 【検証項目】: Origins 配列に HTTP Origin (ALB) が存在すること
      // 🔵 信頼性: TASK-0019 より
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              CustomOriginConfig: Match.objectLike({
                OriginProtocolPolicy: 'https-only',
              }),
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-13: WAF Managed Rules 設定確認
  // 🔵 信頼性: REQ-034 より
  // ============================================================================
  describe('TC-DS-13: WAF Managed Rules 設定確認', () => {
    test('WAF WebACL に AWS Managed Rules が設定される', () => {
      // 【検証項目】: Managed Rules の存在
      // 🔵 信頼性: REQ-034 より
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesCommonRuleSet',
              },
            },
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-DS-14: WAF スコープが CLOUDFRONT に設定される
  // 🔵 信頼性: REQ-033 より
  // ============================================================================
  describe('TC-DS-14: WAF スコープが CLOUDFRONT に設定される', () => {
    test('WAF WebACL のスコープが CLOUDFRONT', () => {
      // 【検証項目】: WebACL Scope
      // 🔵 信頼性: REQ-033 より
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'CLOUDFRONT',
      });
    });
  });

  // ============================================================================
  // TC-DS-15: distribution プロパティ存在確認
  // 🔵 信頼性: 要件定義書 出力プロパティより
  // ============================================================================
  describe('TC-DS-15: distribution プロパティ存在確認', () => {
    test('distribution プロパティが定義されていること', () => {
      // 【検証項目】: distribution プロパティの存在
      expect(stack.distribution).toBeDefined();
    });

    test('distribution の distributionArn が取得可能であること', () => {
      // 【検証項目】: ARN の取得可能性
      expect(stack.distribution.distributionArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-16: distributionDomainName プロパティ確認
  // 🔵 信頼性: 要件定義書 出力プロパティより
  // ============================================================================
  describe('TC-DS-16: distributionDomainName プロパティ確認', () => {
    test('distributionDomainName プロパティが定義されていること', () => {
      expect(stack.distributionDomainName).toBeDefined();
    });

    test('distributionDomainName が string 型であること', () => {
      expect(typeof stack.distributionDomainName).toBe('string');
    });
  });

  // ============================================================================
  // TC-DS-17: distributionId プロパティ確認
  // 🔵 信頼性: 要件定義書 出力プロパティより
  // ============================================================================
  describe('TC-DS-17: distributionId プロパティ確認', () => {
    test('distributionId プロパティが定義されていること', () => {
      expect(stack.distributionId).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-18: bucket プロパティ確認
  // 🔵 信頼性: 要件定義書 出力プロパティより
  // ============================================================================
  describe('TC-DS-18: bucket プロパティ確認', () => {
    test('bucket プロパティが定義されていること', () => {
      expect(stack.bucket).toBeDefined();
    });

    test('bucket の bucketArn が取得可能であること', () => {
      expect(stack.bucket.bucketArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-19: bucketArn プロパティ確認
  // 🔵 信頼性: 要件定義書 出力プロパティより
  // ============================================================================
  describe('TC-DS-19: bucketArn プロパティ確認', () => {
    test('bucketArn プロパティが定義されていること', () => {
      expect(stack.bucketArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-20: webAcl プロパティ確認（条件付き）
  // 🟡 信頼性: 要件定義書 enableWaf オプションより
  // ============================================================================
  describe('TC-DS-20: webAcl プロパティ確認（条件付き）', () => {
    test('webAcl プロパティが定義されていること（enableWaf: true）', () => {
      // デフォルト（enableWaf: true）での確認
      expect(stack.webAcl).toBeDefined();
    });

    test('webAcl プロパティが undefined であること（enableWaf: false）', () => {
      const noWafApp = new cdk.App();
      const noWafPrereqStack = new cdk.Stack(noWafApp, 'NoWafPrereq', { env: testEnv });
      const noWafVpc = createTestVpc(noWafPrereqStack);
      const noWafAlb = createTestAlb(noWafPrereqStack, noWafVpc);
      const noWafAlbSg = createTestAlbSecurityGroup(noWafPrereqStack, noWafVpc);

      const noWafStack = new DistributionStack(noWafApp, 'NoWafStack', {
        alb: noWafAlb,
        albSecurityGroup: noWafAlbSg,
        config: devConfig,
        enableWaf: false,
        env: testEnv,
      });

      expect(noWafStack.webAcl).toBeUndefined();
    });
  });

  // ============================================================================
  // TC-DS-21: DistributionDomainName CfnOutput 確認
  // 🔵 信頼性: 要件定義書 CfnOutput より
  // ============================================================================
  describe('TC-DS-21: DistributionDomainName CfnOutput 確認', () => {
    test('DistributionDomainName がエクスポートされていること', () => {
      template.hasOutput('DistributionDomainName', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-DistributionDomainName`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-22: DistributionId CfnOutput 確認
  // 🔵 信頼性: 要件定義書 CfnOutput より
  // ============================================================================
  describe('TC-DS-22: DistributionId CfnOutput 確認', () => {
    test('DistributionId がエクスポートされていること', () => {
      template.hasOutput('DistributionId', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-DistributionId`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-23: BucketName CfnOutput 確認
  // 🔵 信頼性: 要件定義書 CfnOutput より
  // ============================================================================
  describe('TC-DS-23: BucketName CfnOutput 確認', () => {
    test('StaticContentBucket がエクスポートされていること', () => {
      template.hasOutput('StaticContentBucket', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-StaticContentBucket`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-24: BucketArn CfnOutput 確認
  // 🔵 信頼性: 要件定義書 CfnOutput より
  // ============================================================================
  describe('TC-DS-24: BucketArn CfnOutput 確認', () => {
    test('StaticContentBucketArn がエクスポートされていること', () => {
      template.hasOutput('StaticContentBucketArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-StaticContentBucketArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-25: S3 バケットポリシーが Distribution 作成後に適用される
  // 🔵 信頼性: TASK-0018 循環参照解決パターンより
  // ============================================================================
  describe('TC-DS-25: S3 バケットポリシーに CloudFront Distribution ARN が含まれる', () => {
    test('バケットポリシーに aws:SourceArn 条件が設定されている', () => {
      // 【検証項目】: バケットポリシーの Condition 設定
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: Match.objectLike({
                StringEquals: Match.objectLike({
                  'aws:SourceArn': Match.anyValue(),
                }),
              }),
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-26: ALB 参照が正しく設定される
  // 🔵 信頼性: 要件定義書 依存関係より
  // ============================================================================
  describe('TC-DS-26: ALB 参照が正しく設定される', () => {
    test('CloudFront Origin に ALB DNS 名への参照が含まれる', () => {
      // 【検証項目】: ALB Origin の存在
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.anyValue(),
              CustomOriginConfig: Match.anyValue(),
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-27: Stack の論理的依存関係確認
  // 🟡 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-DS-27: Stack の論理的依存関係確認', () => {
    test('Stack が正常に作成されること（依存関係が満たされている）', () => {
      // 【検証項目】: Stack が例外なく作成されること
      expect(stack).toBeDefined();
      expect(template).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-28: S3 バケットが暗号化されている
  // 🔵 信頼性: REQ-031 より
  // ============================================================================
  describe('TC-DS-28: S3 バケットが暗号化されている', () => {
    test('S3 バケットに S3 マネージド暗号化が設定される', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-29: OAC が sigv4、always で設定される
  // 🔵 信頼性: REQ-032 より
  // ============================================================================
  describe('TC-DS-29: OAC が sigv4、always で設定される', () => {
    test('OAC の署名設定が適切に構成される', () => {
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-30: CloudFront Origin Protocol Policy 確認
  // 🔵 信頼性: NFR-105 より
  // ============================================================================
  describe('TC-DS-30: CloudFront Origin Protocol Policy 確認', () => {
    test('ALB Origin が HTTPS-only で設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              CustomOriginConfig: Match.objectLike({
                OriginProtocolPolicy: 'https-only',
              }),
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-31: enableWaf デフォルト値テスト
  // 🟡 信頼性: 要件定義書 オプションパラメータより
  // ============================================================================
  describe('TC-DS-31: enableWaf デフォルト値テスト', () => {
    test('enableWaf を省略した場合 WAF が有効になる', () => {
      // 【検証項目】: デフォルト設定での WAF 有効化
      // beforeEach で作成された stack は enableWaf を省略
      template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    });
  });

  // ============================================================================
  // TC-DS-32: priceClass カスタム値テスト
  // 🟡 信頼性: 要件定義書 オプションパラメータより
  // ============================================================================
  describe('TC-DS-32: priceClass カスタム値テスト', () => {
    test('priceClass をカスタム値で設定できる', () => {
      const customApp = new cdk.App();
      const customPrereqStack = new cdk.Stack(customApp, 'CustomPrereq', { env: testEnv });
      const customVpc = createTestVpc(customPrereqStack);
      const customAlb = createTestAlb(customPrereqStack, customVpc);
      const customAlbSg = createTestAlbSecurityGroup(customPrereqStack, customVpc);

      const customStack = new DistributionStack(customApp, 'CustomStack', {
        alb: customAlb,
        albSecurityGroup: customAlbSg,
        config: devConfig,
        priceClass: 'PriceClass_All',
        env: testEnv,
      });
      const customTemplate = Template.fromStack(customStack);

      customTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All',
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-33: enableErrorPages 設定テスト
  // 🟡 信頼性: 要件定義書 オプションパラメータより
  // ============================================================================
  describe('TC-DS-33: enableErrorPages 設定テスト', () => {
    test('enableErrorPages: false でエラーレスポンス設定が含まれない', () => {
      const noErrorApp = new cdk.App();
      const noErrorPrereqStack = new cdk.Stack(noErrorApp, 'NoErrorPrereq', { env: testEnv });
      const noErrorVpc = createTestVpc(noErrorPrereqStack);
      const noErrorAlb = createTestAlb(noErrorPrereqStack, noErrorVpc);
      const noErrorAlbSg = createTestAlbSecurityGroup(noErrorPrereqStack, noErrorVpc);

      const noErrorStack = new DistributionStack(noErrorApp, 'NoErrorStack', {
        alb: noErrorAlb,
        albSecurityGroup: noErrorAlbSg,
        config: devConfig,
        enableErrorPages: false,
        env: testEnv,
      });
      const noErrorTemplate = Template.fromStack(noErrorStack);

      // CustomErrorResponses が空または存在しないことを確認
      const distributions = noErrorTemplate.findResources('AWS::CloudFront::Distribution');
      const distConfig = Object.values(distributions)[0] as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Properties: { DistributionConfig: any };
      };
      const errorResponses = distConfig.Properties.DistributionConfig.CustomErrorResponses || [];
      expect(errorResponses.length).toBe(0);
    });
  });

  // ============================================================================
  // TC-DS-34: envName 空文字エラー
  // 🟡 信頼性: 要件定義書 Props バリデーションより
  // ============================================================================
  describe('TC-DS-34: envName 空文字エラー', () => {
    test('envName が空文字の場合エラーが発生する', () => {
      const invalidApp = new cdk.App();
      const invalidPrereqStack = new cdk.Stack(invalidApp, 'InvalidPrereq', { env: testEnv });
      const invalidVpc = createTestVpc(invalidPrereqStack);
      const invalidAlb = createTestAlb(invalidPrereqStack, invalidVpc);
      const invalidAlbSg = createTestAlbSecurityGroup(invalidPrereqStack, invalidVpc);

      const invalidConfig = createTestConfig({ envName: '' });

      expect(() => {
        new DistributionStack(invalidApp, 'InvalidStack', {
          alb: invalidAlb,
          albSecurityGroup: invalidAlbSg,
          config: invalidConfig,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // TC-DS-35: envName 長さ超過エラー
  // 🟡 信頼性: 要件定義書 Props バリデーションより
  // ============================================================================
  describe('TC-DS-35: envName 長さ超過エラー', () => {
    test('envName が 20 文字を超える場合エラーが発生する', () => {
      const invalidApp = new cdk.App();
      const invalidPrereqStack = new cdk.Stack(invalidApp, 'InvalidPrereq', { env: testEnv });
      const invalidVpc = createTestVpc(invalidPrereqStack);
      const invalidAlb = createTestAlb(invalidPrereqStack, invalidVpc);
      const invalidAlbSg = createTestAlbSecurityGroup(invalidPrereqStack, invalidVpc);

      const invalidConfig = createTestConfig({ envName: 'a'.repeat(21) });

      expect(() => {
        new DistributionStack(invalidApp, 'InvalidStack', {
          alb: invalidAlb,
          albSecurityGroup: invalidAlbSg,
          config: invalidConfig,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // TC-DS-36: envName 不正形式エラー
  // 🟡 信頼性: 要件定義書 Props バリデーションより
  // ============================================================================
  describe('TC-DS-36: envName 不正形式エラー', () => {
    test('envName に不正な文字が含まれる場合エラーが発生する', () => {
      const invalidApp = new cdk.App();
      const invalidPrereqStack = new cdk.Stack(invalidApp, 'InvalidPrereq', { env: testEnv });
      const invalidVpc = createTestVpc(invalidPrereqStack);
      const invalidAlb = createTestAlb(invalidPrereqStack, invalidVpc);
      const invalidAlbSg = createTestAlbSecurityGroup(invalidPrereqStack, invalidVpc);

      const invalidConfig = createTestConfig({ envName: 'Dev-Environment' }); // 大文字を含む

      expect(() => {
        new DistributionStack(invalidApp, 'InvalidStack', {
          alb: invalidAlb,
          albSecurityGroup: invalidAlbSg,
          config: invalidConfig,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // 追加テスト: prodConfig での動作確認
  // 🔵 信頼性: parameter.ts、database-stack.test.ts パターンより
  // ============================================================================
  describe('環境別設定での動作確認', () => {
    test('prodConfig で正常に Stack が作成されること', () => {
      const prodApp = new cdk.App();
      const prodEnv = { account: TEST_ACCOUNT_ID, region: TEST_REGION };

      const prodPrereqStack = new cdk.Stack(prodApp, 'ProdPrereq', { env: prodEnv });
      const prodVpc = createTestVpc(prodPrereqStack);
      const prodAlb = createTestAlb(prodPrereqStack, prodVpc);
      const prodAlbSg = createTestAlbSecurityGroup(prodPrereqStack, prodVpc);

      const prodStack = new DistributionStack(prodApp, 'ProdStack', {
        alb: prodAlb,
        albSecurityGroup: prodAlbSg,
        config: prodConfig,
        env: prodEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 基本リソースの存在確認
      prodTemplate.resourceCountIs('AWS::S3::Bucket', 1);
      prodTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
      prodTemplate.resourceCountIs('AWS::WAFv2::WebACL', 1);
    });
  });
});
