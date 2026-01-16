/**
 * VPC Endpoints Construct テスト
 *
 * TASK-0003: VPC Endpoints Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-VPCE-01: SSM Interface Endpoints 作成確認
 * - TC-VPCE-02: ECR Interface Endpoints 作成確認
 * - TC-VPCE-03: CloudWatch Logs Interface Endpoint 作成確認
 * - TC-VPCE-04: S3 Gateway Endpoint 作成確認
 * - TC-VPCE-05: Interface Endpoint の Subnet 配置確認
 * - TC-VPCE-06: Security Group 関連付け確認
 * - TC-VPCE-07: デフォルト Props での Endpoint 総数確認
 * - TC-VPCE-08〜11: 選択的 Endpoint 作成確認
 * - TC-VPCE-12〜15: 境界値テスト
 *
 * 🔵 信頼性: 要件定義書 REQ-008〜011 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../../../lib/construct/vpc/vpc-construct';
import { EndpointsConstruct } from '../../../lib/construct/vpc/endpoints-construct';

describe('EndpointsConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpcConstruct: VpcConstruct;
  let endpointsConstruct: EndpointsConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: デフォルト設定で VPC と Endpoints を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpcConstruct = new VpcConstruct(stack, 'TestVpc');
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // TC-VPCE-01: SSM Interface Endpoints 作成確認
  // 🔵 信頼性: 要件定義書 REQ-008 より
  // ============================================================================
  describe('TC-VPCE-01: SSM Interface Endpoints の作成確認', () => {
    // 【テスト目的】: SSM 用の Interface Endpoints が正しく作成されることを確認
    // 【テスト内容】: ssm, ssmmessages, ec2messages の 3 つの Interface Endpoint を検証
    // 【期待される動作】: 各 Endpoint が Interface タイプで作成され、Private DNS が有効化される
    // 🔵 信頼性: REQ-008 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ssm Interface Endpoint が作成されること', () => {
      // 【テスト目的】: SSM Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ssm Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-008 より

      // 【検証項目】: ssm Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-008 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ssm$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: ssm Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('ssmmessages Interface Endpoint が作成されること', () => {
      // 【テスト目的】: SSM Messages Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ssmmessages Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-008 より

      // 【検証項目】: ssmmessages Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-008 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ssmmessages$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: ssmmessages Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('ec2messages Interface Endpoint が作成されること', () => {
      // 【テスト目的】: EC2 Messages Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ec2messages Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-008 より

      // 【検証項目】: ec2messages Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-008 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ec2messages$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: ec2messages Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('SSM Endpoints の公開プロパティが定義されていること', () => {
      // 【テスト目的】: SSM Endpoints の公開プロパティが正しく定義されることを確認
      // 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
      // 【期待される動作】: ssmEndpoint, ssmMessagesEndpoint, ec2MessagesEndpoint が定義される
      // 🔵 信頼性: note.md より

      // 【検証項目】: 公開プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(endpointsConstruct.ssmEndpoint).toBeDefined(); // 【確認内容】: ssmEndpoint プロパティが定義されている
      expect(endpointsConstruct.ssmMessagesEndpoint).toBeDefined(); // 【確認内容】: ssmMessagesEndpoint プロパティが定義されている
      expect(endpointsConstruct.ec2MessagesEndpoint).toBeDefined(); // 【確認内容】: ec2MessagesEndpoint プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-VPCE-02: ECR Interface Endpoints 作成確認
  // 🔵 信頼性: 要件定義書 REQ-009 より
  // ============================================================================
  describe('TC-VPCE-02: ECR Interface Endpoints の作成確認', () => {
    // 【テスト目的】: ECR 用の Interface Endpoints が正しく作成されることを確認
    // 【テスト内容】: ecr.api, ecr.dkr の 2 つの Interface Endpoint を検証
    // 【期待される動作】: 各 Endpoint が Interface タイプで作成され、Private DNS が有効化される
    // 🔵 信頼性: REQ-009 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ecr.api Interface Endpoint が作成されること', () => {
      // 【テスト目的】: ECR API Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ecr.api Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-009 より

      // 【検証項目】: ecr.api Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-009 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ecr\\.api$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: ecr.api Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('ecr.dkr Interface Endpoint が作成されること', () => {
      // 【テスト目的】: ECR Docker Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、ecr.dkr Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-009 より

      // 【検証項目】: ecr.dkr Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-009 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*ecr\\.dkr$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: ecr.dkr Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('ECR Endpoints の公開プロパティが定義されていること', () => {
      // 【テスト目的】: ECR Endpoints の公開プロパティが正しく定義されることを確認
      // 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
      // 【期待される動作】: ecrApiEndpoint, ecrDkrEndpoint が定義される
      // 🔵 信頼性: note.md より

      // 【検証項目】: 公開プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(endpointsConstruct.ecrApiEndpoint).toBeDefined(); // 【確認内容】: ecrApiEndpoint プロパティが定義されている
      expect(endpointsConstruct.ecrDkrEndpoint).toBeDefined(); // 【確認内容】: ecrDkrEndpoint プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-VPCE-03: CloudWatch Logs Interface Endpoint 作成確認
  // 🔵 信頼性: 要件定義書 REQ-010 より
  // ============================================================================
  describe('TC-VPCE-03: CloudWatch Logs Interface Endpoint の作成確認', () => {
    // 【テスト目的】: CloudWatch Logs 用の Interface Endpoint が正しく作成されることを確認
    // 【テスト内容】: logs Interface Endpoint を検証
    // 【期待される動作】: Endpoint が Interface タイプで作成され、Private DNS が有効化される
    // 🔵 信頼性: REQ-010 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('logs Interface Endpoint が作成されること', () => {
      // 【テスト目的】: CloudWatch Logs Interface Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、logs Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Interface タイプで作成される
      // 🔵 信頼性: REQ-010 より

      // 【検証項目】: logs Interface Endpoint の存在確認
      // 🔵 信頼性: REQ-010 より
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('.*logs$'),
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      }); // 【確認内容】: logs Endpoint が Interface タイプで作成され、Private DNS が有効
    });

    test('CloudWatch Logs Endpoint の公開プロパティが定義されていること', () => {
      // 【テスト目的】: CloudWatch Logs Endpoint の公開プロパティが正しく定義されることを確認
      // 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
      // 【期待される動作】: logsEndpoint が定義される
      // 🔵 信頼性: note.md より

      // 【検証項目】: 公開プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(endpointsConstruct.logsEndpoint).toBeDefined(); // 【確認内容】: logsEndpoint プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-VPCE-04: S3 Gateway Endpoint 作成確認
  // 🔵 信頼性: 要件定義書 REQ-011 より
  // ============================================================================
  describe('TC-VPCE-04: S3 Gateway Endpoint の作成確認', () => {
    // 【テスト目的】: S3 用の Gateway Endpoint が正しく作成されることを確認
    // 【テスト内容】: S3 Gateway Endpoint と Route Table 関連付けを検証
    // 【期待される動作】: Endpoint が Gateway タイプで作成され、Route Table に関連付けられる
    // 🔵 信頼性: REQ-011 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('S3 Gateway Endpoint が作成されること', () => {
      // 【テスト目的】: S3 Gateway Endpoint が正しく作成されることを確認
      // 【テスト内容】: EndpointsConstruct をデフォルト設定でインスタンス化し、S3 Endpoint を検証
      // 【期待される動作】: AWS::EC2::VPCEndpoint リソースが Gateway タイプで作成される
      // 🔵 信頼性: REQ-011 より

      // 【検証項目】: S3 Gateway Endpoint の存在確認
      // 🔵 信頼性: REQ-011 より
      // 【注意】: Gateway Endpoint の ServiceName は Fn::Join で生成されるため、VpcEndpointType で検証
      const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      // 【確認内容】: Gateway タイプの Endpoint が 1 つ存在する
      expect(Object.keys(gatewayEndpoints).length).toBe(1);
      // 【確認内容】: ServiceName が s3 を含む（Fn::Join 内の配列を検証）
      const s3Endpoint = Object.values(gatewayEndpoints)[0] as any;
      const serviceName = s3Endpoint.Properties.ServiceName;
      // ServiceName は Fn::Join で生成されるため、配列内に 's3' が含まれることを確認
      expect(JSON.stringify(serviceName)).toContain('s3');
    });

    test('S3 Gateway Endpoint が RouteTableIds を持つこと', () => {
      // 【テスト目的】: S3 Gateway Endpoint が Route Table に正しく関連付けられることを確認
      // 【テスト内容】: Gateway Endpoint の RouteTableIds プロパティを検証
      // 【期待される動作】: RouteTableIds に Route Table の参照が含まれる
      // 🔵 信頼性: note.md より

      // 【検証項目】: Route Table 関連付けの存在確認
      // 🔵 信頼性: note.md より
      // 【注意】: Gateway Endpoint の ServiceName は Fn::Join で生成されるため、VpcEndpointType で検証
      const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      // 【確認内容】: Gateway タイプの Endpoint が存在する
      expect(Object.keys(gatewayEndpoints).length).toBeGreaterThan(0);
      const s3Endpoint = Object.values(gatewayEndpoints)[0] as any;
      // 【確認内容】: RouteTableIds が定義されている
      expect(s3Endpoint.Properties.RouteTableIds).toBeDefined();
      // 【確認内容】: RouteTableIds に複数の Route Table が含まれる
      expect(s3Endpoint.Properties.RouteTableIds.length).toBeGreaterThan(0);
    });

    test('S3 Gateway Endpoint の公開プロパティが定義されていること', () => {
      // 【テスト目的】: S3 Gateway Endpoint の公開プロパティが正しく定義されることを確認
      // 【テスト内容】: EndpointsConstruct のプロパティを直接アサート
      // 【期待される動作】: s3Endpoint が定義される
      // 🔵 信頼性: note.md より

      // 【検証項目】: 公開プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(endpointsConstruct.s3Endpoint).toBeDefined(); // 【確認内容】: s3Endpoint プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-VPCE-05: Interface Endpoint の Subnet 配置確認
  // 🔵 信頼性: note.md の配置設計より
  // ============================================================================
  describe('TC-VPCE-05: Interface Endpoint の Subnet 配置確認', () => {
    // 【テスト目的】: Interface Endpoint が Private App Subnet に正しく配置されることを確認
    // 【テスト内容】: SubnetIds プロパティに Private App Subnet の参照が含まれることを検証
    // 【期待される動作】: 全ての Interface Endpoint が SubnetIds を持ち、複数の Subnet に配置される
    // 🔵 信頼性: note.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Interface Endpoint が Private App Subnet に配置されること', () => {
      // 【テスト目的】: Interface Endpoint が Private App Subnet に配置されることを確認
      // 【テスト内容】: Interface Endpoint の SubnetIds プロパティを検証
      // 【期待される動作】: SubnetIds に Subnet の参照が含まれる
      // 🔵 信頼性: note.md より

      // 【検証項目】: Subnet 配置の確認
      // 🔵 信頼性: note.md より
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });

      // 【確認内容】: Interface Endpoint が存在し、SubnetIds が定義されている
      expect(Object.keys(endpoints).length).toBeGreaterThan(0); // 🔵 Interface Endpoint が存在すること
      Object.values(endpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.SubnetIds).toBeDefined(); // 【確認内容】: SubnetIds が定義されている
        expect(endpoint.Properties.SubnetIds.length).toBeGreaterThan(0); // 【確認内容】: SubnetIds に要素がある
      });
    });
  });

  // ============================================================================
  // TC-VPCE-06: Security Group 関連付け確認
  // 🔵 信頼性: note.md のセキュリティ考慮事項より
  // ============================================================================
  describe('TC-VPCE-06: Interface Endpoint の Security Group 関連付け確認', () => {
    // 【テスト目的】: Interface Endpoint に Security Group が関連付けられることを確認
    // 【テスト内容】: SecurityGroupIds プロパティに Security Group の参照が含まれることを検証
    // 【期待される動作】: 全ての Interface Endpoint が SecurityGroupIds を持つ
    // 🔵 信頼性: note.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Interface Endpoint に Security Group が関連付けられること', () => {
      // 【テスト目的】: Interface Endpoint に Security Group が関連付けられることを確認
      // 【テスト内容】: Interface Endpoint の SecurityGroupIds プロパティを検証
      // 【期待される動作】: SecurityGroupIds に Security Group の参照が含まれる
      // 🔵 信頼性: note.md より

      // 【検証項目】: Security Group 関連付けの確認
      // 🔵 信頼性: note.md より
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });

      // 【確認内容】: Interface Endpoint が存在し、SecurityGroupIds が定義されている
      expect(Object.keys(endpoints).length).toBeGreaterThan(0); // 🔵 Interface Endpoint が存在すること
      Object.values(endpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.SecurityGroupIds).toBeDefined(); // 【確認内容】: SecurityGroupIds が定義されている
        expect(endpoint.Properties.SecurityGroupIds.length).toBeGreaterThan(0); // 【確認内容】: SecurityGroupIds に要素がある
      });
    });
  });

  // ============================================================================
  // TC-VPCE-07: デフォルト Props での Endpoint 総数確認
  // 🔵 信頼性: note.md の設計文書より
  // ============================================================================
  describe('TC-VPCE-07: デフォルト Props での Endpoint 総数確認', () => {
    // 【テスト目的】: デフォルト設定で全ての Endpoint が作成されることを確認
    // 【テスト内容】: AWS::EC2::VPCEndpoint リソースの総数を検証
    // 【期待される動作】: SSM(3) + ECR(2) + Logs(1) + S3(1) = 7 個の Endpoint が作成される
    // 🔵 信頼性: note.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('デフォルト Props で 7 つの Endpoint が作成されること', () => {
      // 【テスト目的】: デフォルト設定で全ての Endpoint が作成されることを確認
      // 【テスト内容】: AWS::EC2::VPCEndpoint リソースの総数を検証
      // 【期待される動作】: 7 個の Endpoint が作成される
      // 🔵 信頼性: note.md より

      // 【検証項目】: Endpoint 総数の確認
      // 🔵 信頼性: note.md より
      // SSM(3) + ECR(2) + Logs(1) + S3(1) = 7
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 7); // 【確認内容】: 全 7 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-08: enableSsm=false での SSM Endpoint 無効化確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-08: enableSsm=false での SSM Endpoint 無効化確認', () => {
    // 【テスト目的】: enableSsm=false で SSM Endpoint が作成されないことを確認
    // 【テスト内容】: enableSsm=false で EndpointsConstruct を作成し、SSM Endpoint の不在を検証
    // 【期待される動作】: SSM 関連の Endpoint が 0 個
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: enableSsm=false で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
        enableSsm: false,
      });
      template = Template.fromStack(stack);
    });

    test('enableSsm=false で SSM Endpoint が作成されないこと', () => {
      // 【テスト目的】: enableSsm=false で SSM Endpoint が作成されないことを確認
      // 【テスト内容】: enableSsm=false で EndpointsConstruct を作成し、SSM Endpoint の不在を検証
      // 【期待される動作】: SSM 関連の Endpoint が 0 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: SSM Endpoint の不在確認
      // 🟡 信頼性: 実装設計から
      const ssmEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*ssm$'),
        },
      });
      const ssmMessagesEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*ssmmessages$'),
        },
      });
      const ec2MessagesEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*ec2messages$'),
        },
      });
      expect(Object.keys(ssmEndpoints).length).toBe(0); // 【確認内容】: ssm Endpoint が存在しない
      expect(Object.keys(ssmMessagesEndpoints).length).toBe(0); // 【確認内容】: ssmmessages Endpoint が存在しない
      expect(Object.keys(ec2MessagesEndpoints).length).toBe(0); // 【確認内容】: ec2messages Endpoint が存在しない
    });

    test('enableSsm=false で 4 つの Endpoint が作成されること (ECR + Logs + S3)', () => {
      // 【テスト目的】: enableSsm=false で残りの Endpoint のみ作成されることを確認
      // 【テスト内容】: Endpoint 総数を検証
      // 【期待される動作】: ECR(2) + Logs(1) + S3(1) = 4 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数の確認
      // 🟡 信頼性: 実装設計から
      // ECR(2) + Logs(1) + S3(1) = 4
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 4); // 【確認内容】: 4 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-09: enableEcr=false での ECR Endpoint 無効化確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-09: enableEcr=false での ECR Endpoint 無効化確認', () => {
    // 【テスト目的】: enableEcr=false で ECR Endpoint が作成されないことを確認
    // 【テスト内容】: enableEcr=false で EndpointsConstruct を作成し、ECR Endpoint の不在を検証
    // 【期待される動作】: ECR 関連の Endpoint が 0 個
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: enableEcr=false で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
        enableEcr: false,
      });
      template = Template.fromStack(stack);
    });

    test('enableEcr=false で ECR Endpoint が作成されないこと', () => {
      // 【テスト目的】: enableEcr=false で ECR Endpoint が作成されないことを確認
      // 【テスト内容】: enableEcr=false で EndpointsConstruct を作成し、ECR Endpoint の不在を検証
      // 【期待される動作】: ECR 関連の Endpoint が 0 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: ECR Endpoint の不在確認
      // 🟡 信頼性: 実装設計から
      const ecrApiEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*ecr\\.api$'),
        },
      });
      const ecrDkrEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*ecr\\.dkr$'),
        },
      });
      expect(Object.keys(ecrApiEndpoints).length).toBe(0); // 【確認内容】: ecr.api Endpoint が存在しない
      expect(Object.keys(ecrDkrEndpoints).length).toBe(0); // 【確認内容】: ecr.dkr Endpoint が存在しない
    });

    test('enableEcr=false で 5 つの Endpoint が作成されること (SSM + Logs + S3)', () => {
      // 【テスト目的】: enableEcr=false で残りの Endpoint のみ作成されることを確認
      // 【テスト内容】: Endpoint 総数を検証
      // 【期待される動作】: SSM(3) + Logs(1) + S3(1) = 5 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数の確認
      // 🟡 信頼性: 実装設計から
      // SSM(3) + Logs(1) + S3(1) = 5
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 5); // 【確認内容】: 5 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-10: enableLogs=false での CloudWatch Logs Endpoint 無効化確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-10: enableLogs=false での CloudWatch Logs Endpoint 無効化確認', () => {
    // 【テスト目的】: enableLogs=false で CloudWatch Logs Endpoint が作成されないことを確認
    // 【テスト内容】: enableLogs=false で EndpointsConstruct を作成し、logs Endpoint の不在を検証
    // 【期待される動作】: logs Endpoint が 0 個
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: enableLogs=false で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
        enableLogs: false,
      });
      template = Template.fromStack(stack);
    });

    test('enableLogs=false で CloudWatch Logs Endpoint が作成されないこと', () => {
      // 【テスト目的】: enableLogs=false で CloudWatch Logs Endpoint が作成されないことを確認
      // 【テスト内容】: enableLogs=false で EndpointsConstruct を作成し、logs Endpoint の不在を検証
      // 【期待される動作】: logs Endpoint が 0 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: logs Endpoint の不在確認
      // 🟡 信頼性: 実装設計から
      const logsEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*logs$'),
        },
      });
      expect(Object.keys(logsEndpoints).length).toBe(0); // 【確認内容】: logs Endpoint が存在しない
    });

    test('enableLogs=false で 6 つの Endpoint が作成されること (SSM + ECR + S3)', () => {
      // 【テスト目的】: enableLogs=false で残りの Endpoint のみ作成されることを確認
      // 【テスト内容】: Endpoint 総数を検証
      // 【期待される動作】: SSM(3) + ECR(2) + S3(1) = 6 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数の確認
      // 🟡 信頼性: 実装設計から
      // SSM(3) + ECR(2) + S3(1) = 6
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 6); // 【確認内容】: 6 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-11: enableS3=false での S3 Gateway Endpoint 無効化確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-11: enableS3=false での S3 Gateway Endpoint 無効化確認', () => {
    // 【テスト目的】: enableS3=false で S3 Gateway Endpoint が作成されないことを確認
    // 【テスト内容】: enableS3=false で EndpointsConstruct を作成し、S3 Endpoint の不在を検証
    // 【期待される動作】: S3 Endpoint が 0 個
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: enableS3=false で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
        enableS3: false,
      });
      template = Template.fromStack(stack);
    });

    test('enableS3=false で S3 Gateway Endpoint が作成されないこと', () => {
      // 【テスト目的】: enableS3=false で S3 Gateway Endpoint が作成されないことを確認
      // 【テスト内容】: enableS3=false で EndpointsConstruct を作成し、S3 Endpoint の不在を検証
      // 【期待される動作】: S3 Endpoint が 0 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: S3 Endpoint の不在確認
      // 🟡 信頼性: 実装設計から
      const s3Endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          ServiceName: Match.stringLikeRegexp('.*s3$'),
        },
      });
      expect(Object.keys(s3Endpoints).length).toBe(0); // 【確認内容】: S3 Endpoint が存在しない
    });

    test('enableS3=false で 6 つの Endpoint が作成されること (SSM + ECR + Logs)', () => {
      // 【テスト目的】: enableS3=false で残りの Endpoint のみ作成されることを確認
      // 【テスト内容】: Endpoint 総数を検証
      // 【期待される動作】: SSM(3) + ECR(2) + Logs(1) = 6 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数の確認
      // 🟡 信頼性: 実装設計から
      // SSM(3) + ECR(2) + Logs(1) = 6
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 6); // 【確認内容】: 6 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-12: 全フラグ false での Endpoint 作成確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-12: 全フラグ false での Endpoint 作成確認', () => {
    // 【テスト目的】: 全フラグ false で Endpoint が作成されないことを確認
    // 【テスト内容】: 全フラグを false に設定し、Endpoint 数を検証
    // 【期待される動作】: Endpoint が 0 個
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: 全フラグ false で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
        enableSsm: false,
        enableEcr: false,
        enableLogs: false,
        enableS3: false,
      });
      template = Template.fromStack(stack);
    });

    test('全フラグ false で Endpoint が 0 個であること', () => {
      // 【テスト目的】: 全フラグ false で Endpoint が作成されないことを確認
      // 【テスト内容】: 全フラグを false に設定し、Endpoint 数を検証
      // 【期待される動作】: Endpoint が 0 個
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数が 0
      // 🟡 信頼性: 実装設計から
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0); // 【確認内容】: Endpoint が作成されない
    });

    test('全フラグ false で全公開プロパティが undefined であること', () => {
      // 【テスト目的】: 全フラグ false で公開プロパティが undefined であることを確認
      // 【テスト内容】: 全フラグを false に設定し、プロパティを検証
      // 【期待される動作】: 全プロパティが undefined
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: 公開プロパティが undefined
      // 🟡 信頼性: 実装設計から
      expect(endpointsConstruct.ssmEndpoint).toBeUndefined(); // 【確認内容】: ssmEndpoint が undefined
      expect(endpointsConstruct.ssmMessagesEndpoint).toBeUndefined(); // 【確認内容】: ssmMessagesEndpoint が undefined
      expect(endpointsConstruct.ec2MessagesEndpoint).toBeUndefined(); // 【確認内容】: ec2MessagesEndpoint が undefined
      expect(endpointsConstruct.ecrApiEndpoint).toBeUndefined(); // 【確認内容】: ecrApiEndpoint が undefined
      expect(endpointsConstruct.ecrDkrEndpoint).toBeUndefined(); // 【確認内容】: ecrDkrEndpoint が undefined
      expect(endpointsConstruct.logsEndpoint).toBeUndefined(); // 【確認内容】: logsEndpoint が undefined
      expect(endpointsConstruct.s3Endpoint).toBeUndefined(); // 【確認内容】: s3Endpoint が undefined
    });
  });

  // ============================================================================
  // TC-VPCE-13: Props 未指定でのデフォルト動作確認
  // 🟡 信頼性: 実装設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-13: Props 未指定でのデフォルト動作確認', () => {
    // 【テスト目的】: vpc のみ指定でデフォルト動作することを確認
    // 【テスト内容】: vpc のみ指定で EndpointsConstruct を作成し、全 Endpoint の作成を検証
    // 【期待される動作】: 全 7 個の Endpoint が作成される
    // 🟡 信頼性: 実装設計から妥当な推測

    beforeEach(() => {
      // 【テストデータ準備】: vpc のみ指定で Construct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('vpc のみ指定でデフォルトで全 Endpoint が作成されること', () => {
      // 【テスト目的】: Props 未指定でデフォルト動作することを確認
      // 【テスト内容】: vpc のみ指定で EndpointsConstruct を作成し、全 Endpoint の作成を検証
      // 【期待される動作】: 全 7 個の Endpoint が作成される
      // 🟡 信頼性: 実装設計から

      // 【検証項目】: Endpoint 総数が 7
      // 🟡 信頼性: 実装設計から
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 7); // 【確認内容】: デフォルトで全 7 個の Endpoint が作成される
    });
  });

  // ============================================================================
  // TC-VPCE-14: Interface Endpoint の Subnet 数確認
  // 🟡 信頼性: VPC Construct の設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-14: Interface Endpoint の Subnet 数確認', () => {
    // 【テスト目的】: Interface Endpoint が 2 AZ に配置されることを確認
    // 【テスト内容】: Interface Endpoint の SubnetIds 要素数を検証
    // 【期待される動作】: 各 Endpoint が 2 つの Subnet に配置される
    // 🟡 信頼性: VPC Construct の設計から

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Interface Endpoint が 2 つの Subnet に配置されること (Multi-AZ)', () => {
      // 【テスト目的】: Interface Endpoint が 2 AZ に配置されることを確認
      // 【テスト内容】: Interface Endpoint の SubnetIds 要素数を検証
      // 【期待される動作】: 各 Endpoint が 2 つの Subnet に配置される
      // 🟡 信頼性: VPC Construct 設計から

      // 【検証項目】: Subnet 数の確認
      // 🟡 信頼性: VPC Construct 設計から
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });

      // 【確認内容】: Interface Endpoint が存在すること
      expect(Object.keys(endpoints).length).toBeGreaterThan(0); // 🟡 Interface Endpoint が存在すること
      Object.values(endpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.SubnetIds.length).toBe(2); // 【確認内容】: 各 Endpoint が 2 つの Subnet に配置される
      });
    });
  });

  // ============================================================================
  // TC-VPCE-15: Gateway Endpoint の Route Table 数確認
  // 🟡 信頼性: note.md の設計から妥当な推測
  // ============================================================================
  describe('TC-VPCE-15: S3 Gateway Endpoint の Route Table 数確認', () => {
    // 【テスト目的】: S3 Gateway Endpoint が複数の Route Table に関連付けられることを確認
    // 【テスト内容】: S3 Gateway Endpoint の RouteTableIds 要素数を検証
    // 【期待される動作】: 複数の Route Table に関連付けられる
    // 🟡 信頼性: note.md から

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で EndpointsConstruct を作成
      endpointsConstruct = new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });
      template = Template.fromStack(stack);
    });

    test('S3 Gateway Endpoint が複数の Route Table に関連付けられること', () => {
      // 【テスト目的】: S3 Gateway Endpoint が複数の Route Table に関連付けられることを確認
      // 【テスト内容】: S3 Gateway Endpoint の RouteTableIds 要素数を検証
      // 【期待される動作】: 複数の Route Table に関連付けられる
      // 🟡 信頼性: note.md から

      // 【検証項目】: Route Table 数の確認
      // 🟡 信頼性: note.md から
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });

      // 【確認内容】: Gateway Endpoint が存在すること
      expect(Object.keys(endpoints).length).toBeGreaterThan(0); // 🟡 Gateway Endpoint が存在すること
      const s3Endpoint = Object.values(endpoints)[0] as any;
      expect(s3Endpoint.Properties.RouteTableIds.length).toBeGreaterThan(1); // 【確認内容】: 複数の Route Table に関連付けられる
    });
  });

  // ============================================================================
  // TC-VPCE-18: 同名 Endpoint 重複時のエラー
  // 🔴 信頼性: CDK の動作から推測
  // ============================================================================
  describe('TC-VPCE-18: 同名 Endpoint 重複時のエラー', () => {
    // 【テスト目的】: 同じ ID で重複作成がエラーになることを確認
    // 【テスト内容】: 同じ Stack 内で同じ ID の Construct を 2 回作成
    // 【期待される動作】: エラーがスローされる
    // 🔴 信頼性: CDK 動作から推測

    test('同じ ID で重複作成がエラーになること', () => {
      // 【テスト目的】: 同じ ID で重複作成がエラーになることを確認
      // 【テスト内容】: 同じ Stack 内で同じ ID の Construct を 2 回作成
      // 【期待される動作】: エラーがスローされる
      // 🔴 信頼性: CDK 動作から推測

      // 【テストデータ準備】: 1 つ目の Construct を作成
      new EndpointsConstruct(stack, 'TestEndpoints', {
        vpc: vpcConstruct.vpc,
      });

      // 【実行と検証】: 同じ ID で 2 つ目を作成しようとするとエラー
      // 🔴 信頼性: CDK 動作から推測
      expect(() => {
        new EndpointsConstruct(stack, 'TestEndpoints', {
          vpc: vpcConstruct.vpc,
        });
      }).toThrow(/There is already a Construct with name/); // 【確認内容】: 重複 ID でエラーがスローされる
    });
  });
});
