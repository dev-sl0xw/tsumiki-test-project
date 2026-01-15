/**
 * VPC Construct テスト
 *
 * TASK-0002: VPC Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-VPC-01: VPC CIDR Block 確認 (10.0.0.0/16)
 * - TC-VPC-02: Public Subnet 確認 (/24 x 2)
 * - TC-VPC-03: Private App Subnet 確認 (/23 x 2)
 * - TC-VPC-04: Private DB Subnet 確認 (/24 x 2)
 * - TC-VPC-05: NAT Gateway 確認 (2個)
 * - TC-VPC-06: Internet Gateway 確認 (1個)
 * - TC-VPC-07: Multi-AZ 確認 (2 AZ)
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../../../lib/construct/vpc/vpc-construct';

describe('VpcConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpcConstruct: VpcConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成し、テスト対象の VpcConstruct をインスタンス化
    // 【初期条件設定】: デフォルト Props で VPC を作成（CIDR: 10.0.0.0/16, maxAzs: 2, natGateways: 2）
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpcConstruct = new VpcConstruct(stack, 'TestVpc');
    // 【実際の処理実行】: Template.fromStack(stack) で CloudFormation テンプレートを生成
    // 【処理内容】: VpcConstruct が作成するリソースを CloudFormation テンプレート形式で取得
    template = Template.fromStack(stack);
  });

  // ============================================================================
  // TC-VPC-01: VPC CIDR Block 確認 (10.0.0.0/16)
  // ============================================================================
  describe('TC-VPC-01: VPC CIDR 10.0.0.0/16 での作成確認', () => {
    // 【テスト目的】: VPC が CIDR 10.0.0.0/16 で正しく作成されることを確認
    // 【テスト内容】: VpcConstruct をデフォルト設定でインスタンス化し、生成される CloudFormation テンプレートを検証
    // 【期待される動作】: AWS::EC2::VPC リソースの CidrBlock プロパティが '10.0.0.0/16' であること
    // 🔵 信頼性: REQ-001 より（要件定義書に明記）

    test('VPC が作成されること', () => {
      // 【検証項目】: VPC リソースの存在確認
      // 🔵 信頼性: REQ-001 より
      template.resourceCountIs('AWS::EC2::VPC', 1);
    });

    test('VPC の CIDR Block が 10.0.0.0/16 であること', () => {
      // 【検証項目】: VPC CIDR Block の値
      // 🔵 信頼性: REQ-001 より
      // 【確認内容】: 要件定義書 REQ-001 で指定された CIDR Block
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
    });

    test('vpcConstruct.vpc プロパティが定義されていること', () => {
      // 【検証項目】: vpc プロパティの存在確認
      // 🔵 信頼性: interfaces.ts より
      expect(vpcConstruct.vpc).toBeDefined();
    });
  });

  // ============================================================================
  // TC-VPC-02: Public Subnet 確認 (/24 x 2)
  // ============================================================================
  describe('TC-VPC-02: Public Subnet の CIDR マスク /24 での作成確認', () => {
    // 【テスト目的】: Public Subnet が CIDR マスク /24 で 2つの AZ にそれぞれ作成されることを確認
    // 【テスト内容】: SubnetConfiguration で PUBLIC タイプ、cidrMask: 24 が適用されることを検証
    // 🔵 信頼性: REQ-003 より（要件定義書に明記）

    test('Public Subnet が MapPublicIpOnLaunch=true で作成されること', () => {
      // 【検証項目】: Public Subnet の設定確認
      // 🔵 信頼性: REQ-003 より
      // 【確認内容】: MapPublicIpOnLaunch が true であること（Public Subnet の特性）
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
      });
    });

    test('Public Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Public Subnet の数
      // 🔵 信頼性: REQ-003 より
      // MapPublicIpOnLaunch=true のサブネットが 2 つあること
      const subnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: true,
        },
      });
      expect(Object.keys(subnets).length).toBe(2);
    });

    test('Public Subnet の CIDR が /24 であること', () => {
      // 【検証項目】: Public Subnet CIDR マスク
      // 🔵 信頼性: REQ-003 より
      // 【確認内容】: /24 = 256 IP アドレス
      const subnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: true,
        },
      });

      // サブネットが存在することを確認（空配列の場合はテスト失敗）
      const subnetValues = Object.values(subnets);
      expect(subnetValues.length).toBeGreaterThan(0);

      // 各サブネットの CIDR が /24 であることを確認
      subnetValues.forEach((subnet: any) => {
        const cidrBlock = subnet.Properties.CidrBlock;
        expect(cidrBlock).toMatch(/\/24$/);
      });
    });

    test('vpcConstruct.publicSubnets が 2 要素の配列であること', () => {
      // 【検証項目】: publicSubnets プロパティの要素数
      // 🔵 信頼性: interfaces.ts より
      expect(vpcConstruct.publicSubnets).toHaveLength(2);
    });
  });

  // ============================================================================
  // TC-VPC-03: Private App Subnet 確認 (/23 x 2)
  // ============================================================================
  describe('TC-VPC-03: Private App Subnet の CIDR マスク /23 での作成確認', () => {
    // 【テスト目的】: Private App Subnet が CIDR マスク /23 で 2つの AZ にそれぞれ作成されることを確認
    // 【テスト内容】: SubnetConfiguration で PRIVATE_WITH_EGRESS タイプ、cidrMask: 23 が適用されることを検証
    // 🔵 信頼性: REQ-004 より（要件定義書に明記）

    test('Private App Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Private App Subnet の数
      // 🔵 信頼性: REQ-004 より
      // Private with NAT (PRIVATE_WITH_EGRESS) のサブネットを確認
      // CDK は 'aws-cdk:subnet-type' タグで識別
      const subnets = template.findResources('AWS::EC2::Subnet', {
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
      expect(Object.keys(subnets).length).toBe(2);
    });

    test('Private App Subnet の CIDR が /23 であること', () => {
      // 【検証項目】: Private App Subnet CIDR マスク
      // 🔵 信頼性: REQ-004 より
      // 【確認内容】: /23 = 512 IP アドレス
      const subnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          Tags: Match.arrayWith([
            Match.objectLike({
              Key: 'aws-cdk:subnet-name',
              Value: Match.stringLikeRegexp('PrivateApp'),
            }),
          ]),
        },
      });

      // サブネットが存在することを確認（空配列の場合はテスト失敗）
      const subnetValues = Object.values(subnets);
      expect(subnetValues.length).toBeGreaterThan(0);

      subnetValues.forEach((subnet: any) => {
        const cidrBlock = subnet.Properties.CidrBlock;
        expect(cidrBlock).toMatch(/\/23$/);
      });
    });

    test('vpcConstruct.privateAppSubnets が 2 要素の配列であること', () => {
      // 【検証項目】: privateAppSubnets プロパティの要素数
      // 🔵 信頼性: interfaces.ts より
      expect(vpcConstruct.privateAppSubnets).toHaveLength(2);
    });
  });

  // ============================================================================
  // TC-VPC-04: Private DB Subnet 確認 (/24 x 2)
  // ============================================================================
  describe('TC-VPC-04: Private DB Subnet の CIDR マスク /24 での作成確認', () => {
    // 【テスト目的】: Private DB Subnet が CIDR マスク /24 で 2つの AZ にそれぞれ作成されることを確認
    // 【テスト内容】: SubnetConfiguration で PRIVATE_ISOLATED タイプ、cidrMask: 24 が適用されることを検証
    // 🔵 信頼性: REQ-005 より（要件定義書に明記）

    test('Private DB Subnet が 2 つ作成されること', () => {
      // 【検証項目】: Private DB Subnet の数
      // 🔵 信頼性: REQ-005 より
      // Private Isolated (PRIVATE_ISOLATED) のサブネットを確認
      const subnets = template.findResources('AWS::EC2::Subnet', {
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
      expect(Object.keys(subnets).length).toBe(2);
    });

    test('Private DB Subnet の CIDR が /24 であること', () => {
      // 【検証項目】: Private DB Subnet CIDR マスク
      // 🔵 信頼性: REQ-005 より
      // 【確認内容】: /24 = 256 IP アドレス
      const subnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
          Tags: Match.arrayWith([
            Match.objectLike({
              Key: 'aws-cdk:subnet-name',
              Value: Match.stringLikeRegexp('PrivateDb'),
            }),
          ]),
        },
      });

      // サブネットが存在することを確認（空配列の場合はテスト失敗）
      const subnetValues = Object.values(subnets);
      expect(subnetValues.length).toBeGreaterThan(0);

      subnetValues.forEach((subnet: any) => {
        const cidrBlock = subnet.Properties.CidrBlock;
        expect(cidrBlock).toMatch(/\/24$/);
      });
    });

    test('vpcConstruct.privateDbSubnets が 2 要素の配列であること', () => {
      // 【検証項目】: privateDbSubnets プロパティの要素数
      // 🔵 信頼性: interfaces.ts より
      expect(vpcConstruct.privateDbSubnets).toHaveLength(2);
    });
  });

  // ============================================================================
  // TC-VPC-05: NAT Gateway 確認 (2個)
  // ============================================================================
  describe('TC-VPC-05: NAT Gateway の Multi-AZ 配置確認', () => {
    // 【テスト目的】: NAT Gateway が 2つの AZ にそれぞれ 1 つずつ配置されることを確認
    // 【テスト内容】: natGateways: 2 の設定により、各 Public Subnet に NAT Gateway が作成されることを検証
    // 🔵 信頼性: REQ-007 より（要件定義書に明記）

    test('NAT Gateway が 2 つ作成されること', () => {
      // 【検証項目】: NAT Gateway の数
      // 🔵 信頼性: REQ-007 より
      // 【確認内容】: 各 AZ に 1 つずつ、計 2 個の NAT Gateway
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });

    test('Elastic IP が NAT Gateway 用に 2 つ作成されること', () => {
      // 【検証項目】: Elastic IP の数
      // 🔵 信頼性: REQ-007 より（NAT Gateway には EIP が必要）
      template.resourceCountIs('AWS::EC2::EIP', 2);
    });

    test('NAT Gateway が異なる Public Subnet に配置されること', () => {
      // 【検証項目】: NAT Gateway の配置サブネット
      // 🔵 信頼性: REQ-007 より
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      const subnetIds = Object.values(natGateways).map(
        (nat: any) => nat.Properties.SubnetId.Ref
      );

      // 重複がないこと（異なるサブネットに配置）
      const uniqueSubnetIds = new Set(subnetIds);
      expect(uniqueSubnetIds.size).toBe(2);
    });
  });

  // ============================================================================
  // TC-VPC-06: Internet Gateway 確認 (1個)
  // ============================================================================
  describe('TC-VPC-06: Internet Gateway の作成確認', () => {
    // 【テスト目的】: Internet Gateway が 1 つ作成され、VPC にアタッチされることを確認
    // 【テスト内容】: PUBLIC サブネットタイプを指定することで CDK が自動的に Internet Gateway を作成することを検証
    // 🔵 信頼性: REQ-006 より（要件定義書に明記）

    test('Internet Gateway が 1 つ作成されること', () => {
      // 【検証項目】: Internet Gateway の数
      // 🔵 信頼性: REQ-006 より
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });

    test('VPCGatewayAttachment で VPC にアタッチされること', () => {
      // 【検証項目】: VPC へのアタッチメント
      // 🔵 信頼性: REQ-006 より
      template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
    });

    test('VPCGatewayAttachment が Internet Gateway を参照すること', () => {
      // 【検証項目】: Attachment の参照関係
      // 🔵 信頼性: REQ-006 より
      template.hasResourceProperties('AWS::EC2::VPCGatewayAttachment', {
        InternetGatewayId: Match.objectLike({
          Ref: Match.stringLikeRegexp('.*'),
        }),
      });
    });
  });

  // ============================================================================
  // TC-VPC-07: Multi-AZ 確認 (2 AZ)
  // ============================================================================
  describe('TC-VPC-07: サブネット総数の確認 (3層 x 2 AZ = 6)', () => {
    // 【テスト目的】: 3層サブネット x 2 AZ = 合計 6 つのサブネットが作成されることを確認
    // 【テスト内容】: subnetConfiguration で指定した 3 タイプ x maxAzs: 2 = 6 サブネットを検証
    // 🔵 信頼性: REQ-002〜005 より（要件定義書に明記）

    test('合計 6 つのサブネットが作成されること', () => {
      // 【検証項目】: サブネット総数
      // 🔵 信頼性: REQ-002〜005 より
      // 【確認内容】: 3層 x 2 AZ = 6 サブネット
      template.resourceCountIs('AWS::EC2::Subnet', 6);
    });

    test('サブネットが 2 つの異なる AZ に分散されること', () => {
      // 【検証項目】: AZ の分散
      // 🔵 信頼性: REQ-002 より
      const subnets = template.findResources('AWS::EC2::Subnet');
      const azs = new Set(
        Object.values(subnets).map((subnet: any) => subnet.Properties.AvailabilityZone)
      );

      // 2 つの異なる AZ に配置
      expect(azs.size).toBe(2);
    });

    test('各 AZ に 3 つずつサブネットが配置されること', () => {
      // 【検証項目】: 各 AZ のサブネット数
      // 🔵 信頼性: REQ-002〜005 より
      const subnets = template.findResources('AWS::EC2::Subnet');

      // サブネットが存在することを確認（空の場合はテスト失敗）
      const subnetValues = Object.values(subnets);
      expect(subnetValues.length).toBeGreaterThan(0);

      const azCounts: Record<string, number> = {};

      subnetValues.forEach((subnet: any) => {
        const az = JSON.stringify(subnet.Properties.AvailabilityZone);
        azCounts[az] = (azCounts[az] || 0) + 1;
      });

      // 2つの AZ が存在することを確認
      expect(Object.keys(azCounts).length).toBe(2);

      // 各 AZ に 3 つのサブネット（Public, Private App, Private DB）
      Object.values(azCounts).forEach((count) => {
        expect(count).toBe(3);
      });
    });
  });

  // ============================================================================
  // 追加テスト: Route Table 確認
  // ============================================================================
  describe('Route Table の作成確認', () => {
    // 【テスト目的】: 各サブネットタイプに対応する Route Table が作成されることを確認
    // 🟡 信頼性: CDK の動作仕様から妥当な推測

    test('Public Subnet の Route Table に IGW へのルートがあること', () => {
      // 【検証項目】: Public Route の宛先
      // 🟡 信頼性: CDK 動作仕様から
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: Match.objectLike({
          Ref: Match.stringLikeRegexp('.*'),
        }),
      });
    });

    test('Private App Subnet の Route Table に NAT Gateway へのルートがあること', () => {
      // 【検証項目】: Private Route の宛先
      // 🟡 信頼性: CDK 動作仕様から
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: Match.objectLike({
          Ref: Match.stringLikeRegexp('.*'),
        }),
      });
    });
  });
});
