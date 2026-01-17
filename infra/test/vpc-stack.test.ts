/**
 * VPC Stack テスト
 *
 * TASK-0004: VPC Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-VS-01: スナップショットテスト
 * - TC-VS-02: VPC リソースの存在確認
 * - TC-VS-03: Subnet の総数確認
 * - TC-VS-04: Internet Gateway の存在確認
 * - TC-VS-05: NAT Gateway の Multi-AZ 配置確認
 * - TC-VS-06: VPC Endpoint の総数確認
 * - TC-VS-07〜10: Stack 出力プロパティ確認
 * - TC-VS-11〜12: Construct 統合確認
 * - TC-VS-13〜14: 異常系テスト
 * - TC-VS-15〜16: 境界値テスト
 *
 * 🔵 信頼性: 要件定義書 REQ-001〜011、タスク定義書に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcStack } from '../lib/stack/vpc-stack';
import { devConfig, prodConfig, EnvironmentConfig } from '../parameter';

describe('VpcStack', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と VpcStack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: VpcStack;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と VpcStack を作成
    // 【初期条件設定】: devConfig を使用して VpcStack を生成
    app = new cdk.App();
    stack = new VpcStack(app, 'TestVpcStack', {
      config: devConfig,
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    // 【実際の処理実行】: Template.fromStack(stack) で CloudFormation テンプレートを生成
    // 【処理内容】: VpcStack が作成するリソースを CloudFormation テンプレート形式で取得
    template = Template.fromStack(stack);
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // TC-VS-01: スナップショットテスト
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-VS-01: スナップショットテスト', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: VpcStack の CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティスより

    test('CloudFormation テンプレートのスナップショットテスト', () => {
      // 【テストデータ準備】: devConfig を使用して VpcStack を作成
      // 【初期条件設定】: 開発環境の標準設定でスタックを生成
      const snapshotApp = new cdk.App();
      const snapshotStack = new VpcStack(snapshotApp, 'SnapshotVpcStack', {
        config: devConfig,
      });

      // 【実際の処理実行】: Template.fromStack でテンプレートを取得
      // 【処理内容】: VpcStack が作成するリソースを CloudFormation テンプレート形式で取得
      const snapshotTemplate = Template.fromStack(snapshotStack);

      // 【結果検証】: スナップショットとの一致を確認
      // 【検証項目】: CloudFormation テンプレート全体
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(snapshotTemplate.toJSON()).toMatchSnapshot(); // 【確認内容】: テンプレートがスナップショットと一致する
    });
  });

  // ============================================================================
  // TC-VS-02: VPC リソースの存在確認
  // 🔵 信頼性: 要件定義書 REQ-001 より
  // ============================================================================
  describe('TC-VS-02: VPC リソースの存在確認', () => {
    // 【テスト目的】: VPC リソースが正しく作成されることを確認
    // 【テスト内容】: VpcStack が AWS::EC2::VPC リソースを 1 つ作成することを検証
    // 【期待される動作】: VPC リソースが 1 つ存在する
    // 🔵 信頼性: REQ-001 より

    test('VPC が 1 つ作成されること', () => {
      // 【検証項目】: VPC リソース数
      // 🔵 信頼性: REQ-001 より
      template.resourceCountIs('AWS::EC2::VPC', 1); // 【確認内容】: VPC が正確に 1 つ作成される
    });
  });

  // ============================================================================
  // TC-VS-03: Subnet の総数確認
  // 🔵 信頼性: 要件定義書 REQ-002〜005 より
  // ============================================================================
  describe('TC-VS-03: Subnet の総数確認', () => {
    // 【テスト目的】: 3層サブネット構成が正しく作成されることを確認
    // 【テスト内容】: VpcStack が 6 つの Subnet を作成することを検証
    // 【期待される動作】: 6 つの Subnet が存在する（3層 x 2 AZ）
    // 🔵 信頼性: REQ-002〜005 より

    test('Subnet が 6 つ作成されること（3層 x 2 AZ）', () => {
      // 【検証項目】: Subnet リソース総数
      // 🔵 信頼性: REQ-002〜005 より
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 【確認内容】: Public x2 + PrivateApp x2 + PrivateDb x2 = 6
    });

    test('Public Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Public Subnet の数
      // 🔵 信頼性: REQ-003 より
      const publicSubnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: true,
        },
      });
      expect(Object.keys(publicSubnets).length).toBe(2); // 【確認内容】: Public Subnet が 2 つ存在する
    });

    test('Private App Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Private App Subnet の数
      // 🔵 信頼性: REQ-004 より
      const privateAppSubnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: false,
          Tags: Match.arrayWith([
            Match.objectLike({
              Key: 'aws-cdk:subnet-name',
              Value: Match.stringLikeRegexp('PrivateApp'),
            }),
          ]),
        },
      });
      expect(Object.keys(privateAppSubnets).length).toBe(2); // 【確認内容】: Private App Subnet が 2 つ存在する
    });

    test('Private DB Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Private DB Subnet の数
      // 🔵 信頼性: REQ-005 より
      const privateDbSubnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: false,
          Tags: Match.arrayWith([
            Match.objectLike({
              Key: 'aws-cdk:subnet-name',
              Value: Match.stringLikeRegexp('PrivateDb'),
            }),
          ]),
        },
      });
      expect(Object.keys(privateDbSubnets).length).toBe(2); // 【確認内容】: Private DB Subnet が 2 つ存在する
    });
  });

  // ============================================================================
  // TC-VS-04: Internet Gateway の存在確認
  // 🔵 信頼性: 要件定義書 REQ-006 より
  // ============================================================================
  describe('TC-VS-04: Internet Gateway の存在確認', () => {
    // 【テスト目的】: Internet Gateway が正しく作成されることを確認
    // 【テスト内容】: VpcStack が IGW を 1 つ作成することを検証
    // 【期待される動作】: IGW リソースが 1 つ存在する
    // 🔵 信頼性: REQ-006 より

    test('Internet Gateway が 1 つ作成されること', () => {
      // 【検証項目】: IGW リソース数
      // 🔵 信頼性: REQ-006 より
      template.resourceCountIs('AWS::EC2::InternetGateway', 1); // 【確認内容】: Internet Gateway が 1 つ存在する
    });

    test('Internet Gateway が VPC にアタッチされること', () => {
      // 【検証項目】: VPC へのアタッチメント
      // 🔵 信頼性: REQ-006 より
      template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1); // 【確認内容】: VPCGatewayAttachment が存在する
    });
  });

  // ============================================================================
  // TC-VS-05: NAT Gateway の Multi-AZ 配置確認
  // 🔵 信頼性: 要件定義書 REQ-007 より
  // ============================================================================
  describe('TC-VS-05: NAT Gateway の Multi-AZ 配置確認', () => {
    // 【テスト目的】: NAT Gateway が Multi-AZ で配置されることを確認
    // 【テスト内容】: VpcStack が NAT Gateway を 2 つ作成することを検証
    // 【期待される動作】: NAT Gateway リソースが 2 つ存在する
    // 🔵 信頼性: REQ-007 より

    test('NAT Gateway が 2 つ作成されること', () => {
      // 【検証項目】: NAT Gateway リソース数
      // 🔵 信頼性: REQ-007 より
      template.resourceCountIs('AWS::EC2::NatGateway', 2); // 【確認内容】: 各 AZ に 1 つずつ、計 2 個の NAT Gateway
    });

    test('Elastic IP が NAT Gateway 用に 2 つ作成されること', () => {
      // 【検証項目】: Elastic IP の数
      // 🔵 信頼性: REQ-007 より（NAT Gateway には EIP が必要）
      template.resourceCountIs('AWS::EC2::EIP', 2); // 【確認内容】: NAT Gateway 用の EIP が 2 つ存在する
    });
  });

  // ============================================================================
  // TC-VS-06: VPC Endpoint の総数確認
  // 🔵 信頼性: 要件定義書 REQ-008〜011 より
  // ============================================================================
  describe('TC-VS-06: VPC Endpoint の総数確認', () => {
    // 【テスト目的】: 全 VPC Endpoint が正しく作成されることを確認
    // 【テスト内容】: VpcStack が 7 つの VPC Endpoint を作成することを検証
    // 【期待される動作】: VPC Endpoint リソースが 7 つ存在する
    // 🔵 信頼性: REQ-008〜011 より

    test('VPC Endpoint が 7 つ作成されること（SSM x3, ECR x2, Logs x1, S3 x1）', () => {
      // 【検証項目】: VPC Endpoint リソース総数
      // 🔵 信頼性: REQ-008〜011 より
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 7); // 【確認内容】: Interface x6 + Gateway x1 = 7
    });
  });

  // ============================================================================
  // TC-VS-07: vpc プロパティの公開確認
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ============================================================================
  describe('TC-VS-07: vpc プロパティの公開確認', () => {
    // 【テスト目的】: vpc プロパティが正しく公開されることを確認
    // 【テスト内容】: VpcStack.vpc が IVpc 型で定義されていることを検証
    // 【期待される動作】: vpc プロパティがアクセス可能
    // 🔵 信頼性: タスク定義書より

    test('vpc プロパティが正しく公開されること', () => {
      // 【検証項目】: vpc プロパティの存在
      // 🔵 信頼性: タスク定義書より
      expect(stack.vpc).toBeDefined(); // 【確認内容】: vpc プロパティが定義されている
    });

    test('vpc プロパティが vpcId を持つこと', () => {
      // 【検証項目】: vpc の vpcId プロパティ
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.vpc.vpcId).toBeDefined(); // 【確認内容】: vpcId が取得可能
    });
  });

  // ============================================================================
  // TC-VS-08: publicSubnets プロパティの公開確認
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ============================================================================
  describe('TC-VS-08: publicSubnets プロパティの公開確認', () => {
    // 【テスト目的】: publicSubnets プロパティが正しく公開されることを確認
    // 【テスト内容】: VpcStack.publicSubnets が 2 要素の配列であることを検証
    // 【期待される動作】: publicSubnets が 2 要素の配列
    // 🔵 信頼性: タスク定義書より

    test('publicSubnets プロパティが 2 要素の配列であること', () => {
      // 【検証項目】: publicSubnets プロパティの要素数
      // 🔵 信頼性: タスク定義書より
      expect(stack.publicSubnets).toHaveLength(2); // 【確認内容】: 2 AZ に対応する 2 要素
    });

    test('publicSubnets の各要素が subnetId を持つこと', () => {
      // 【検証項目】: 各 Subnet の subnetId
      // 🔵 信頼性: CDK ベストプラクティスより
      stack.publicSubnets.forEach((subnet) => {
        expect(subnet.subnetId).toBeDefined(); // 【確認内容】: 各 Subnet の subnetId が取得可能
      });
    });
  });

  // ============================================================================
  // TC-VS-09: privateAppSubnets プロパティの公開確認
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ============================================================================
  describe('TC-VS-09: privateAppSubnets プロパティの公開確認', () => {
    // 【テスト目的】: privateAppSubnets プロパティが正しく公開されることを確認
    // 【テスト内容】: VpcStack.privateAppSubnets が 2 要素の配列であることを検証
    // 【期待される動作】: privateAppSubnets が 2 要素の配列
    // 🔵 信頼性: タスク定義書より

    test('privateAppSubnets プロパティが 2 要素の配列であること', () => {
      // 【検証項目】: privateAppSubnets プロパティの要素数
      // 🔵 信頼性: タスク定義書より
      expect(stack.privateAppSubnets).toHaveLength(2); // 【確認内容】: 2 AZ に対応する 2 要素
    });

    test('privateAppSubnets の各要素が subnetId を持つこと', () => {
      // 【検証項目】: 各 Subnet の subnetId
      // 🔵 信頼性: CDK ベストプラクティスより
      stack.privateAppSubnets.forEach((subnet) => {
        expect(subnet.subnetId).toBeDefined(); // 【確認内容】: 各 Subnet の subnetId が取得可能
      });
    });
  });

  // ============================================================================
  // TC-VS-10: privateDbSubnets プロパティの公開確認
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ============================================================================
  describe('TC-VS-10: privateDbSubnets プロパティの公開確認', () => {
    // 【テスト目的】: privateDbSubnets プロパティが正しく公開されることを確認
    // 【テスト内容】: VpcStack.privateDbSubnets が 2 要素の配列であることを検証
    // 【期待される動作】: privateDbSubnets が 2 要素の配列
    // 🔵 信頼性: タスク定義書より

    test('privateDbSubnets プロパティが 2 要素の配列であること', () => {
      // 【検証項目】: privateDbSubnets プロパティの要素数
      // 🔵 信頼性: タスク定義書より
      expect(stack.privateDbSubnets).toHaveLength(2); // 【確認内容】: 2 AZ に対応する 2 要素
    });

    test('privateDbSubnets の各要素が subnetId を持つこと', () => {
      // 【検証項目】: 各 Subnet の subnetId
      // 🔵 信頼性: CDK ベストプラクティスより
      stack.privateDbSubnets.forEach((subnet) => {
        expect(subnet.subnetId).toBeDefined(); // 【確認内容】: 各 Subnet の subnetId が取得可能
      });
    });
  });

  // ============================================================================
  // TC-VS-11: VpcConstruct 統合確認
  // 🔵 信頼性: タスク定義書・要件定義書より
  // ============================================================================
  describe('TC-VS-11: VpcConstruct 統合確認', () => {
    // 【テスト目的】: VpcConstruct が正しく統合されることを確認
    // 【テスト内容】: VpcStack が config.vpcCidr を使用して VpcConstruct を作成することを検証
    // 【期待される動作】: VPC の CIDR Block が config.vpcCidr と一致
    // 🔵 信頼性: タスク定義書より

    test('VPC の CIDR Block が config.vpcCidr と一致すること', () => {
      // 【検証項目】: VPC リソースの CidrBlock
      // 🔵 信頼性: REQ-001 より
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16', // 【確認内容】: devConfig.vpcCidr の値
      });
    });

    test('VPC の DNS サポートが有効であること', () => {
      // 【検証項目】: VPC の DNS 設定
      // 🔵 信頼性: CDK ベストプラクティスより
      template.hasResourceProperties('AWS::EC2::VPC', {
        EnableDnsHostnames: true,
        EnableDnsSupport: true, // 【確認内容】: DNS サポートが有効
      });
    });
  });

  // ============================================================================
  // TC-VS-12: EndpointsConstruct 統合確認
  // 🔵 信頼性: 要件定義書 REQ-008〜011 より
  // ============================================================================
  describe('TC-VS-12: EndpointsConstruct 統合確認', () => {
    // 【テスト目的】: EndpointsConstruct が正しく統合されることを確認
    // 【テスト内容】: VpcStack が EndpointsConstruct を統合し、全 Endpoint が作成されることを検証
    // 【期待される動作】: Interface x6 + Gateway x1 の Endpoint が作成される
    // 🔵 信頼性: REQ-008〜011 より

    test('Interface Endpoint が 6 つ作成されること', () => {
      // 【検証項目】: Interface タイプの VPC Endpoint 数
      // 🔵 信頼性: REQ-008〜010 より
      const interfaceEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });
      expect(Object.keys(interfaceEndpoints).length).toBe(6); // 【確認内容】: SSM x3 + ECR x2 + Logs x1 = 6
    });

    test('Gateway Endpoint が 1 つ作成されること', () => {
      // 【検証項目】: Gateway タイプの VPC Endpoint 数
      // 🔵 信頼性: REQ-011 より
      const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      expect(Object.keys(gatewayEndpoints).length).toBe(1); // 【確認内容】: S3 Gateway Endpoint が 1 つ
    });

    test('SSM Endpoint が作成されること', () => {
      // 【検証項目】: SSM Interface Endpoint の存在
      // 🔵 信頼性: REQ-008 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ssm$'),
        VpcEndpointType: 'Interface', // 【確認内容】: SSM Endpoint が Interface タイプで作成
      });
    });

    test('ECR Endpoint が作成されること', () => {
      // 【検証項目】: ECR Interface Endpoint の存在
      // 🔵 信頼性: REQ-009 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ecr\\.api$'),
        VpcEndpointType: 'Interface', // 【確認内容】: ECR API Endpoint が Interface タイプで作成
      });
    });

    test('CloudWatch Logs Endpoint が作成されること', () => {
      // 【検証項目】: CloudWatch Logs Interface Endpoint の存在
      // 🔵 信頼性: REQ-010 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*logs$'),
        VpcEndpointType: 'Interface', // 【確認内容】: Logs Endpoint が Interface タイプで作成
      });
    });
  });

  // ============================================================================
  // TC-VS-14: 無効な CIDR 指定時のエラー
  // 🟡 信頼性: CDK の動作仕様から妥当な推測
  // ============================================================================
  describe('TC-VS-14: 無効な CIDR 指定時のエラー', () => {
    // 【テスト目的】: 無効な CIDR 形式が拒否されることを確認
    // 【テスト内容】: 不正な vpcCidr で VpcStack を作成し、エラーを検証
    // 【期待される動作】: CDK または CloudFormation レベルでエラーが発生
    // 🟡 信頼性: CDK 動作仕様から

    test('無効な CIDR 形式でエラーが発生すること', () => {
      // 【テストデータ準備】: 無効な CIDR を含む設定
      const invalidConfig: EnvironmentConfig = {
        ...devConfig,
        vpcCidr: 'invalid-cidr',
      };

      // 【実行と検証】: VpcStack 作成時にエラーが発生
      // 🟡 信頼性: CDK 動作仕様から
      expect(() => {
        new VpcStack(app, 'InvalidVpcStack', {
          config: invalidConfig,
        });
      }).toThrow(); // 【確認内容】: 無効な CIDR でエラーがスローされる
    });
  });

  // ============================================================================
  // TC-VS-15: 空文字の vpcCidr でデフォルト値が使用されることの確認
  // 🟡 信頼性: VpcConstruct の実装から妥当な推測
  // ============================================================================
  describe('TC-VS-15: 空文字の vpcCidr でデフォルト値使用', () => {
    // 【テスト目的】: 空文字の vpcCidr でデフォルト値が使用されることを確認
    // 【テスト内容】: vpcCidr が空文字の場合の VpcStack 動作を検証
    // 【期待される動作】: VpcConstruct のデフォルト CIDR が使用される
    // 🟡 信頼性: VpcConstruct 実装から

    test('vpcCidr が空文字の場合にデフォルト値が使用されること', () => {
      // 【テストデータ準備】: vpcCidr を空文字に設定
      const emptyConfig: EnvironmentConfig = {
        ...devConfig,
        vpcCidr: '',
      };

      // 【実際の処理実行】: VpcStack を作成
      const emptyApp = new cdk.App();
      const emptyStack = new VpcStack(emptyApp, 'EmptyVpcStack', {
        config: emptyConfig,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const emptyTemplate = Template.fromStack(emptyStack);

      // 【結果検証】: デフォルト CIDR が使用される
      // 🟡 信頼性: VpcConstruct 実装から
      emptyTemplate.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16', // 【確認内容】: デフォルト CIDR が適用される
      });
    });
  });

  // ============================================================================
  // TC-VS-16: 環境別設定（Dev/Prod）での動作確認
  // 🔵 信頼性: parameter.ts の実装より
  // ============================================================================
  describe('TC-VS-16: 環境別設定での動作確認', () => {
    // 【テスト目的】: 環境別設定で正しく動作することを確認
    // 【テスト内容】: devConfig と prodConfig の両方で VpcStack を作成
    // 【期待される動作】: 両環境で正常にリソースが作成される
    // 🔵 信頼性: parameter.ts より

    test('devConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: devConfig を使用
      const devApp = new cdk.App();
      const devStack = new VpcStack(devApp, 'DevVpcStack', {
        config: devConfig,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const devTemplate = Template.fromStack(devStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      devTemplate.resourceCountIs('AWS::EC2::VPC', 1); // 【確認内容】: VPC が作成される
      devTemplate.resourceCountIs('AWS::EC2::Subnet', 6); // 【確認内容】: Subnet が 6 つ作成される
    });

    test('prodConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: prodConfig を使用
      const prodApp = new cdk.App();
      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      prodTemplate.resourceCountIs('AWS::EC2::VPC', 1); // 【確認内容】: VPC が作成される
      prodTemplate.resourceCountIs('AWS::EC2::Subnet', 6); // 【確認内容】: Subnet が 6 つ作成される
    });
  });

  // ============================================================================
  // 追加テスト: Route Table の作成確認
  // 🟡 信頼性: CDK の動作仕様から妥当な推測
  // ============================================================================
  describe('追加テスト: Route Table の作成確認', () => {
    // 【テスト目的】: Route Table が正しく作成されることを確認
    // 【テスト内容】: 各サブネットタイプに対応する Route Table を検証
    // 【期待される動作】: Public / Private 用の Route Table が作成される
    // 🟡 信頼性: CDK 動作仕様から

    test('Public Subnet の Route Table に IGW へのルートがあること', () => {
      // 【検証項目】: Public Route の宛先
      // 🟡 信頼性: CDK 動作仕様から
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: Match.objectLike({
          Ref: Match.stringLikeRegexp('.*'), // 【確認内容】: IGW への参照が存在
        }),
      });
    });

    test('Private App Subnet の Route Table に NAT Gateway へのルートがあること', () => {
      // 【検証項目】: Private Route の宛先
      // 🟡 信頼性: CDK 動作仕様から
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: Match.objectLike({
          Ref: Match.stringLikeRegexp('.*'), // 【確認内容】: NAT Gateway への参照が存在
        }),
      });
    });
  });

  // ============================================================================
  // 追加テスト: タグ設定の確認
  // 🟡 信頼性: CDK ベストプラクティスから妥当な推測
  // ============================================================================
  describe('追加テスト: タグ設定の確認', () => {
    // 【テスト目的】: VPC リソースに適切なタグが設定されることを確認
    // 【テスト内容】: VPC の Name タグを検証
    // 【期待される動作】: VPC に識別可能な Name タグが付与される
    // 🟡 信頼性: CDK ベストプラクティスから

    test('VPC に Name タグが設定されること', () => {
      // 【検証項目】: VPC の Name タグ
      // 🟡 信頼性: CDK ベストプラクティスから
      template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Name',
            Value: Match.stringLikeRegexp('.*'), // 【確認内容】: Name タグが存在する
          }),
        ]),
      });
    });
  });
});
