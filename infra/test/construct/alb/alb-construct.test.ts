/**
 * ALB Construct テスト
 *
 * TASK-0016: ALB Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-ALB-01: ALB リソース作成確認
 * - TC-ALB-02: Internet-facing 確認
 * - TC-ALB-03: ALB Type 確認
 * - TC-ALB-04: Public Subnet 配置確認
 * - TC-ALB-05: HTTP Listener 作成確認
 * - TC-ALB-06: HTTP → HTTPS リダイレクト確認
 * - TC-ALB-07: HTTPS Listener 作成確認
 * - TC-ALB-08: ACM Certificate 設定確認
 * - TC-ALB-09: Target Group 作成確認
 * - TC-ALB-10: Target Type 確認
 * - TC-ALB-11: Health Check Path 確認
 * - TC-ALB-12: Health Check 詳細設定確認
 * - TC-ALB-13: Security Group 関連付け確認
 * - TC-ALB-14: SSL Policy 確認
 * - TC-ALB-15: Internet-facing デフォルト値確認
 * - TC-ALB-16: HTTP リダイレクト デフォルト値確認
 * - TC-ALB-17: Target Port デフォルト値確認
 * - TC-ALB-18: Health Check Path デフォルト値確認
 * - TC-ALB-19: loadBalancer プロパティ確認
 * - TC-ALB-20: targetGroup プロパティ確認
 * - TC-ALB-21: httpsListener プロパティ確認
 * - TC-ALB-22: httpListener プロパティ確認
 * - TC-ALB-23: dnsName プロパティ確認
 * - TC-ALB-24: CloudFormation テンプレートスナップショット確認
 *
 * 🔵 信頼性: 要件定義書 REQ-028〜030, NFR-001, NFR-105 に基づくテスト
 *
 * @module alb-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AlbConstruct } from '../../../lib/construct/alb/alb-construct';

describe('AlbConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;
  let certificate: acm.ICertificate;

  // テスト用定数
  const TEST_CERTIFICATE_ARN =
    'arn:aws:acm:ap-northeast-1:123456789012:certificate/test-cert-id';

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

    // 【VPC作成】: ALB を配置する VPC（Public Subnet 含む）
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // 【Security Group 作成】: ALB 用 Security Group
    securityGroup = new ec2.SecurityGroup(stack, 'TestAlbSG', {
      vpc,
      description: 'Test Security Group for ALB',
      allowAllOutbound: true,
    });

    // 【ACM Certificate 参照】: HTTPS Listener 用証明書
    certificate = acm.Certificate.fromCertificateArn(
      stack,
      'TestCertificate',
      TEST_CERTIFICATE_ARN
    );
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // 正常系テストケース（基本機能）
  // ============================================================================

  describe('正常系 - 基本機能', () => {
    // ============================================================================
    // TC-ALB-01: ALB リソース作成確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-01: ALB リソース作成確認', () => {
      // 【テスト目的】: AlbConstruct がデフォルト設定で正常に ALB を作成することを確認
      // 【テスト内容】: 必須パラメータのみで Construct をインスタンス化し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::ElasticLoadBalancingV2::LoadBalancer リソースが 1 つ作成される
      // 🔵 信頼性: REQ-028 より

      test('ALB リソースが 1 つ作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        // 【初期条件設定】: デフォルト設定を使用
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB リソースの存在確認
        // 【期待値確認】: 1つの ALB が作成されること
        template.resourceCountIs(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          1
        ); // 【確認内容】: ALB リソースが1つ存在する 🔵
      });
    });

    // ============================================================================
    // TC-ALB-02: Internet-facing 確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-02: Internet-facing 確認', () => {
      // 【テスト目的】: ALB が Internet-facing で作成されることを確認
      // 【テスト内容】: Scheme プロパティが 'internet-facing' であることを検証
      // 【期待される動作】: Scheme: 'internet-facing' が設定される
      // 🔵 信頼性: REQ-028 より

      test('Scheme が internet-facing に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Internet-facing 設定の確認
        // 【期待値確認】: Scheme が 'internet-facing' であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          {
            Scheme: 'internet-facing', // 【確認内容】: Internet-facing 設定が有効 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-03: ALB Type 確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-03: ALB Type 確認', () => {
      // 【テスト目的】: ALB の Type が 'application' であることを確認
      // 【テスト内容】: Type プロパティが 'application' であることを検証
      // 【期待される動作】: Type: 'application' が設定される
      // 🔵 信頼性: REQ-028 より

      test('Type が application に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ALB Type の確認
        // 【期待値確認】: Type が 'application' であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          {
            Type: 'application', // 【確認内容】: Application Load Balancer タイプ 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-04: Public Subnet 配置確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-04: Public Subnet 配置確認', () => {
      // 【テスト目的】: ALB が Public Subnet に配置されることを確認
      // 【テスト内容】: Subnets プロパティに Public Subnet の参照が設定されることを検証
      // 【期待される動作】: ALB の Subnets に Public Subnet が設定される
      // 🔵 信頼性: REQ-028 より

      test('Subnets が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Subnet 配置の確認
        // 【期待値確認】: Subnets プロパティが設定されていること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          {
            Subnets: Match.anyValue(), // 【確認内容】: Subnet が設定されている 🔵
          }
        );
      });
    });
  });

  // ============================================================================
  // Listener テストケース
  // ============================================================================

  describe('Listener テスト', () => {
    // ============================================================================
    // TC-ALB-05: HTTP Listener 作成確認
    // 🔵 信頼性: REQ-029 より
    // ============================================================================
    describe('TC-ALB-05: HTTP Listener 作成確認', () => {
      // 【テスト目的】: Port 80 の HTTP Listener が作成されることを確認
      // 【テスト内容】: Listener リソースが Port 80 で作成されることを検証
      // 【期待される動作】: Port: 80, Protocol: 'HTTP' の Listener が作成される
      // 🔵 信頼性: REQ-029 より

      test('Port 80 の HTTP Listener が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: HTTP Listener の確認
        // 【期待値確認】: Port 80, Protocol HTTP の Listener が存在すること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 80, // 【確認内容】: HTTP ポート 🔵
            Protocol: 'HTTP', // 【確認内容】: HTTP プロトコル 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-06: HTTP → HTTPS リダイレクト確認
    // 🔵 信頼性: REQ-029 より
    // ============================================================================
    describe('TC-ALB-06: HTTP → HTTPS リダイレクト確認', () => {
      // 【テスト目的】: HTTP Listener がリダイレクトアクションを持つことを確認
      // 【テスト内容】: DefaultActions に Redirect アクションが設定されることを検証
      // 【期待される動作】: リダイレクトアクション（StatusCode: HTTP_301, Port: 443, Protocol: HTTPS）
      // 🔵 信頼性: REQ-029 より

      test('HTTP Listener にリダイレクトアクションが設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: リダイレクトアクションの確認
        // 【期待値確認】: DefaultActions に redirect タイプが含まれること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 80,
            DefaultActions: Match.arrayWith([
              Match.objectLike({
                Type: 'redirect', // 【確認内容】: リダイレクトアクション 🔵
                RedirectConfig: Match.objectLike({
                  Protocol: 'HTTPS', // 【確認内容】: HTTPS へリダイレクト 🔵
                  Port: '443', // 【確認内容】: ポート 443 へリダイレクト 🔵
                  StatusCode: 'HTTP_301', // 【確認内容】: 301 永続リダイレクト 🔵
                }),
              }),
            ]),
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-07: HTTPS Listener 作成確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-07: HTTPS Listener 作成確認', () => {
      // 【テスト目的】: Port 443 の HTTPS Listener が作成されることを確認
      // 【テスト内容】: Listener リソースが Port 443 で作成されることを検証
      // 【期待される動作】: Port: 443, Protocol: 'HTTPS' の Listener が作成される
      // 🔵 信頼性: REQ-028 より

      test('Port 443 の HTTPS Listener が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: HTTPS Listener の確認
        // 【期待値確認】: Port 443, Protocol HTTPS の Listener が存在すること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 443, // 【確認内容】: HTTPS ポート 🔵
            Protocol: 'HTTPS', // 【確認内容】: HTTPS プロトコル 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-08: ACM Certificate 設定確認
    // 🔵 信頼性: REQ-030 より
    // ============================================================================
    describe('TC-ALB-08: ACM Certificate 設定確認', () => {
      // 【テスト目的】: HTTPS Listener に ACM 証明書が設定されることを確認
      // 【テスト内容】: Certificates プロパティに証明書 ARN が設定されることを検証
      // 【期待される動作】: 指定した証明書 ARN が Certificates に設定される
      // 🔵 信頼性: REQ-030 より

      test('HTTPS Listener に証明書が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: 証明書設定の確認
        // 【期待値確認】: Certificates に証明書 ARN が含まれること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 443,
            Certificates: Match.arrayWith([
              Match.objectLike({
                CertificateArn: TEST_CERTIFICATE_ARN, // 【確認内容】: ACM 証明書 ARN 🔵
              }),
            ]),
          }
        );
      });
    });
  });

  // ============================================================================
  // Target Group テストケース
  // ============================================================================

  describe('Target Group テスト', () => {
    // ============================================================================
    // TC-ALB-09: Target Group 作成確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-09: Target Group 作成確認', () => {
      // 【テスト目的】: Target Group が作成されることを確認
      // 【テスト内容】: TargetGroup リソースが 1 つ作成されることを検証
      // 【期待される動作】: AWS::ElasticLoadBalancingV2::TargetGroup が作成される
      // 🔵 信頼性: REQ-028 より

      test('Target Group が 1 つ作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Target Group の存在確認
        // 【期待値確認】: 1つの Target Group が作成されること
        template.resourceCountIs(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          1
        ); // 【確認内容】: Target Group が1つ存在する 🔵
      });
    });

    // ============================================================================
    // TC-ALB-10: Target Type 確認
    // 🔵 信頼性: 設計文書より
    // ============================================================================
    describe('TC-ALB-10: Target Type 確認', () => {
      // 【テスト目的】: Target Group の Target Type が 'ip' であることを確認
      // 【テスト内容】: TargetType プロパティが 'ip' であることを検証
      // 【期待される動作】: TargetType: 'ip' が設定される（Fargate 用）
      // 🔵 信頼性: 設計文書より

      test('TargetType が ip に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Target Type の確認
        // 【期待値確認】: TargetType が 'ip' であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          {
            TargetType: 'ip', // 【確認内容】: IP ベースのターゲット（Fargate 用）🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-11: Health Check Path 確認
    // 🟡 信頼性: 設計文書から妥当な推測
    // ============================================================================
    describe('TC-ALB-11: Health Check Path 確認', () => {
      // 【テスト目的】: ヘルスチェックパスが設定されることを確認
      // 【テスト内容】: HealthCheckPath プロパティが設定されることを検証
      // 【期待される動作】: HealthCheckPath: '/health' が設定される
      // 🟡 信頼性: 設計文書から妥当な推測

      test('HealthCheckPath が /health に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ヘルスチェックパスの確認
        // 【期待値確認】: デフォルトで '/health' が設定されること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          {
            HealthCheckPath: '/health', // 【確認内容】: デフォルトヘルスチェックパス 🟡
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-12: Health Check 詳細設定確認
    // 🟡 信頼性: AWS デフォルト値から妥当な推測
    // ============================================================================
    describe('TC-ALB-12: Health Check 詳細設定確認', () => {
      // 【テスト目的】: ヘルスチェックの詳細パラメータが正しく設定されることを確認
      // 【テスト内容】: HealthyThresholdCount, UnhealthyThresholdCount, Timeout, Interval を検証
      // 【期待される動作】: デフォルト値が設定される
      // 🟡 信頼性: AWS デフォルト値から妥当な推測

      test('ヘルスチェック詳細設定が正しく設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ヘルスチェック詳細設定の確認
        // 【期待値確認】: 各パラメータがデフォルト値で設定されること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          {
            HealthyThresholdCount: 2, // 【確認内容】: ヘルシー閾値 🟡
            UnhealthyThresholdCount: 2, // 【確認内容】: アンヘルシー閾値 🟡
            HealthCheckTimeoutSeconds: 5, // 【確認内容】: タイムアウト 🟡
            HealthCheckIntervalSeconds: 30, // 【確認内容】: インターバル 🟡
          }
        );
      });
    });
  });

  // ============================================================================
  // Security 設定テストケース
  // ============================================================================

  describe('Security 設定テスト', () => {
    // ============================================================================
    // TC-ALB-13: Security Group 関連付け確認
    // 🔵 信頼性: TASK-0005 より
    // ============================================================================
    describe('TC-ALB-13: Security Group 関連付け確認', () => {
      // 【テスト目的】: ALB に Security Group が関連付けられることを確認
      // 【テスト内容】: SecurityGroups プロパティに Security Group 参照が設定されることを検証
      // 【期待される動作】: SecurityGroups に Security Group の参照が含まれる
      // 🔵 信頼性: TASK-0005 より

      test('SecurityGroups が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Security Group 関連付けの確認
        // 【期待値確認】: SecurityGroups プロパティが設定されていること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          {
            SecurityGroups: Match.anyValue(), // 【確認内容】: Security Group が関連付けられている 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-14: SSL Policy 確認
    // 🔵 信頼性: NFR-105 より
    // ============================================================================
    describe('TC-ALB-14: SSL Policy 確認', () => {
      // 【テスト目的】: HTTPS Listener に適切な SSL Policy が設定されることを確認
      // 【テスト内容】: SslPolicy プロパティが設定されることを検証
      // 【期待される動作】: SslPolicy が設定される（TLS 1.2 以上）
      // 🔵 信頼性: NFR-105 より

      test('HTTPS Listener に SslPolicy が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: SSL Policy の確認
        // 【期待値確認】: SslPolicy が設定されていること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 443,
            SslPolicy: Match.anyValue(), // 【確認内容】: SSL Policy が設定されている 🔵
          }
        );
      });
    });
  });

  // ============================================================================
  // デフォルト値テストケース
  // ============================================================================

  describe('デフォルト値テスト', () => {
    // ============================================================================
    // TC-ALB-15: Internet-facing デフォルト値確認
    // 🔵 信頼性: REQ-028 より
    // ============================================================================
    describe('TC-ALB-15: Internet-facing デフォルト値確認', () => {
      // 【テスト目的】: internetFacing 未指定時にデフォルトで true になることを確認
      // 【テスト内容】: パラメータ省略時の動作を検証
      // 【期待される動作】: Scheme が 'internet-facing' に設定される
      // 🔵 信頼性: REQ-028 より

      test('internetFacing 未指定時にデフォルトで internet-facing になること', () => {
        // 【テストデータ準備】: internetFacing を省略して AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
          // internetFacing を省略
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: デフォルト値の確認
        // 【期待値確認】: Scheme が 'internet-facing' であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::LoadBalancer',
          {
            Scheme: 'internet-facing', // 【確認内容】: デフォルトで Internet-facing 🔵
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-16: HTTP リダイレクト デフォルト値確認
    // 🔵 信頼性: REQ-029 より
    // ============================================================================
    describe('TC-ALB-16: HTTP リダイレクト デフォルト値確認', () => {
      // 【テスト目的】: enableHttpToHttpsRedirect 未指定時にデフォルトで true になることを確認
      // 【テスト内容】: パラメータ省略時の動作を検証
      // 【期待される動作】: HTTP Listener にリダイレクトアクションが設定される
      // 🔵 信頼性: REQ-029 より

      test('enableHttpToHttpsRedirect 未指定時にリダイレクトが有効になること', () => {
        // 【テストデータ準備】: enableHttpToHttpsRedirect を省略して AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
          // enableHttpToHttpsRedirect を省略
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: デフォルト値の確認
        // 【期待値確認】: リダイレクトアクションが設定されていること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::Listener',
          {
            Port: 80,
            DefaultActions: Match.arrayWith([
              Match.objectLike({
                Type: 'redirect', // 【確認内容】: デフォルトでリダイレクト有効 🔵
              }),
            ]),
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-17: Target Port デフォルト値確認
    // 🟡 信頼性: 設計文書から妥当な推測
    // ============================================================================
    describe('TC-ALB-17: Target Port デフォルト値確認', () => {
      // 【テスト目的】: targetPort 未指定時にデフォルトで 80 になることを確認
      // 【テスト内容】: パラメータ省略時の動作を検証
      // 【期待される動作】: Target Group の Port が 80 に設定される
      // 🟡 信頼性: 設計文書から妥当な推測

      test('targetPort 未指定時にデフォルトで 80 になること', () => {
        // 【テストデータ準備】: targetPort を省略して AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
          // targetPort を省略
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: デフォルト値の確認
        // 【期待値確認】: Port が 80 であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          {
            Port: 80, // 【確認内容】: デフォルトポート 80 🟡
          }
        );
      });
    });

    // ============================================================================
    // TC-ALB-18: Health Check Path デフォルト値確認
    // 🟡 信頼性: 設計文書から妥当な推測
    // ============================================================================
    describe('TC-ALB-18: Health Check Path デフォルト値確認', () => {
      // 【テスト目的】: healthCheckPath 未指定時にデフォルトで '/health' になることを確認
      // 【テスト内容】: パラメータ省略時の動作を検証
      // 【期待される動作】: HealthCheckPath が '/health' に設定される
      // 🟡 信頼性: 設計文書から妥当な推測

      test('healthCheckPath 未指定時にデフォルトで /health になること', () => {
        // 【テストデータ準備】: healthCheckPath を省略して AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
          // healthCheckPath を省略
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: デフォルト値の確認
        // 【期待値確認】: HealthCheckPath が '/health' であること
        template.hasResourceProperties(
          'AWS::ElasticLoadBalancingV2::TargetGroup',
          {
            HealthCheckPath: '/health', // 【確認内容】: デフォルトヘルスチェックパス 🟡
          }
        );
      });
    });
  });

  // ============================================================================
  // 公開プロパティテストケース
  // ============================================================================

  describe('公開プロパティテスト', () => {
    // ============================================================================
    // TC-ALB-19: loadBalancer プロパティ確認
    // 🔵 信頼性: 要件定義書より
    // ============================================================================
    describe('TC-ALB-19: loadBalancer プロパティ確認', () => {
      // 【テスト目的】: Construct から loadBalancer プロパティにアクセスできることを確認
      // 【テスト内容】: loadBalancer プロパティが定義されていることを検証
      // 【期待される動作】: loadBalancer プロパティが undefined でない
      // 🔵 信頼性: 要件定義書より

      test('loadBalancer プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        const albConstruct = new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: loadBalancer が undefined でないこと
        expect(albConstruct.loadBalancer).toBeDefined(); // 【確認内容】: loadBalancer プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-ALB-20: targetGroup プロパティ確認
    // 🔵 信頼性: 要件定義書より
    // ============================================================================
    describe('TC-ALB-20: targetGroup プロパティ確認', () => {
      // 【テスト目的】: Construct から targetGroup プロパティにアクセスできることを確認
      // 【テスト内容】: targetGroup プロパティが定義されていることを検証
      // 【期待される動作】: targetGroup プロパティが undefined でない
      // 🔵 信頼性: 要件定義書より

      test('targetGroup プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        const albConstruct = new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: targetGroup が undefined でないこと
        expect(albConstruct.targetGroup).toBeDefined(); // 【確認内容】: targetGroup プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-ALB-21: httpsListener プロパティ確認
    // 🔵 信頼性: 要件定義書より
    // ============================================================================
    describe('TC-ALB-21: httpsListener プロパティ確認', () => {
      // 【テスト目的】: Construct から httpsListener プロパティにアクセスできることを確認
      // 【テスト内容】: httpsListener プロパティが定義されていることを検証
      // 【期待される動作】: httpsListener プロパティが undefined でない
      // 🔵 信頼性: 要件定義書より

      test('httpsListener プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        const albConstruct = new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: httpsListener が undefined でないこと
        expect(albConstruct.httpsListener).toBeDefined(); // 【確認内容】: httpsListener プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-ALB-22: httpListener プロパティ確認
    // 🔵 信頼性: 要件定義書より
    // ============================================================================
    describe('TC-ALB-22: httpListener プロパティ確認', () => {
      // 【テスト目的】: Construct から httpListener プロパティにアクセスできることを確認
      // 【テスト内容】: httpListener プロパティが定義されていることを検証
      // 【期待される動作】: httpListener プロパティが undefined でない
      // 🔵 信頼性: 要件定義書より

      test('httpListener プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        const albConstruct = new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: httpListener が undefined でないこと
        expect(albConstruct.httpListener).toBeDefined(); // 【確認内容】: httpListener プロパティが存在 🔵
      });
    });

    // ============================================================================
    // TC-ALB-23: dnsName プロパティ確認
    // 🔵 信頼性: 要件定義書より
    // ============================================================================
    describe('TC-ALB-23: dnsName プロパティ確認', () => {
      // 【テスト目的】: Construct から dnsName プロパティにアクセスできることを確認
      // 【テスト内容】: dnsName プロパティが定義されていることを検証
      // 【期待される動作】: dnsName プロパティが undefined でない
      // 🔵 信頼性: 要件定義書より

      test('dnsName プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        const albConstruct = new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: dnsName が undefined でないこと
        expect(albConstruct.dnsName).toBeDefined(); // 【確認内容】: dnsName プロパティが存在 🔵
      });
    });
  });

  // ============================================================================
  // スナップショットテストケース
  // ============================================================================

  describe('スナップショットテスト', () => {
    // ============================================================================
    // TC-ALB-24: CloudFormation テンプレートスナップショット確認
    // 🔵 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-ALB-24: CloudFormation テンプレートスナップショット確認', () => {
      // 【テスト目的】: 生成される CloudFormation テンプレートが期待通りであることを確認
      // 【テスト内容】: テンプレートがスナップショットと一致することを検証
      // 【期待される動作】: テンプレートがスナップショットと一致する
      // 🔵 信頼性: CDK ベストプラクティスより

      test('CloudFormation テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: 必須パラメータで AlbConstruct を作成
        new AlbConstruct(stack, 'TestAlb', {
          vpc,
          securityGroup,
          certificateArn: TEST_CERTIFICATE_ARN,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: CloudFormation テンプレートスナップショット 🔵
      });
    });
  });
});
