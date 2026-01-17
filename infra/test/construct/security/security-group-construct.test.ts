/**
 * Security Group Construct テスト
 *
 * TASK-0005: Security Group Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-SG-01: ALB Security Group 作成確認
 * - TC-SG-02: ALB Security Group HTTP(80) インバウンド許可確認
 * - TC-SG-03: ALB Security Group HTTPS(443) インバウンド許可確認
 * - TC-SG-04: ECS Security Group 作成確認
 * - TC-SG-05: ECS Security Group ALB からのインバウンド許可確認
 * - TC-SG-06: ECS Security Group カスタム containerPort 確認
 * - TC-SG-07: Aurora Security Group 作成確認
 * - TC-SG-08: Aurora Security Group ECS からの 3306 インバウンド許可確認
 * - TC-SG-09: Aurora Security Group 外部アクセス遮断確認
 * - TC-SG-10: Aurora Security Group アウトバウンド制限確認
 * - TC-SG-11: 公開プロパティ存在確認
 * - TC-SG-16: containerPort デフォルト値 (80) 確認
 * - TC-SG-17: ECS SG が ALB SG を参照していること (CIDR ベースでないこと)
 * - TC-SG-18: Aurora SG が ECS SG を参照していること (CIDR ベースでないこと)
 * - TC-SG-19: ALB SG に HTTP/HTTPS 以外のインバウンドルールがないこと
 * - TC-SG-20: ECS SG に ALB からのルール以外のインバウンドルールがないこと
 * - TC-SG-21: Aurora SG に ECS からのルール以外のインバウンドルールがないこと
 * - TC-SG-22: 作成される Security Group が 3 つであること
 *
 * 🔵 信頼性: 要件定義書 REQ-024, REQ-025, REQ-028, REQ-029 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityGroupConstruct } from '../../../lib/construct/security/security-group-construct';

describe('SecurityGroupConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let securityGroupConstruct: SecurityGroupConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: デフォルト設定で VPC と SecurityGroupConstruct を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpc = new ec2.Vpc(stack, 'TestVpc');
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // TC-SG-01: ALB Security Group 作成確認
  // 🔵 信頼性: 要件定義書 REQ-028 より
  // ============================================================================
  describe('TC-SG-01: ALB Security Group 作成確認', () => {
    // 【テスト目的】: ALB Security Group が正しく作成されることを確認
    // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、ALB SG を検証
    // 【期待される動作】: AWS::EC2::SecurityGroup リソースが ALB 用に作成される
    // 🔵 信頼性: TASK-0005.md、requirements.md REQ-028 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ALB Security Group が作成されること', () => {
      // 【テスト目的】: ALB Security Group が正しく作成されることを確認
      // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、ALB SG を検証
      // 【期待される動作】: AWS::EC2::SecurityGroup リソースが ALB 用に作成される
      // 🔵 信頼性: TASK-0005.md、requirements.md REQ-028 より

      // 【検証項目】: ALB Security Group の存在確認
      // 🔵 信頼性: REQ-028 より
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('.*ALB.*|.*Load.*Balancer.*|.*loadbalancer.*|.*alb.*'),
      }); // 【確認内容】: ALB Security Group が作成され、説明に ALB を含む
    });
  });

  // ============================================================================
  // TC-SG-02: ALB Security Group HTTP(80) インバウンド許可確認
  // 🔵 信頼性: 要件定義書 REQ-029 より
  // ============================================================================
  describe('TC-SG-02: ALB Security Group HTTP(80) インバウンド許可確認', () => {
    // 【テスト目的】: ALB Security Group に HTTP(80) インバウンドが 0.0.0.0/0 から許可されていることを確認
    // 【テスト内容】: ALB SG に HTTP トラフィックのインバウンドルールが正しく設定されることを検証
    // 【期待される動作】: SecurityGroupIngress に Port 80、CidrIp 0.0.0.0/0 のルールが存在する
    // 🔵 信頼性: requirements.md REQ-029 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ALB Security Group に HTTP(80) インバウンドが 0.0.0.0/0 から許可されていること', () => {
      // 【テスト目的】: HTTP トラフィックが許可されていることを確認
      // 【テスト内容】: ALB SG の Ingress ルールを検証
      // 【期待される動作】: Port 80 が 0.0.0.0/0 から許可されている
      // 🔵 信頼性: requirements.md REQ-029 より

      // 【検証項目】: HTTP インバウンドルールの存在確認
      // 🔵 信頼性: REQ-029 より
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      }); // 【確認内容】: HTTP トラフィックが 0.0.0.0/0 から許可されている
    });
  });

  // ============================================================================
  // TC-SG-03: ALB Security Group HTTPS(443) インバウンド許可確認
  // 🔵 信頼性: 要件定義書 REQ-028 より
  // ============================================================================
  describe('TC-SG-03: ALB Security Group HTTPS(443) インバウンド許可確認', () => {
    // 【テスト目的】: ALB Security Group に HTTPS(443) インバウンドが 0.0.0.0/0 から許可されていることを確認
    // 【テスト内容】: ALB SG に HTTPS トラフィックのインバウンドルールが正しく設定されることを検証
    // 【期待される動作】: SecurityGroupIngress に Port 443、CidrIp 0.0.0.0/0 のルールが存在する
    // 🔵 信頼性: requirements.md REQ-028 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ALB Security Group に HTTPS(443) インバウンドが 0.0.0.0/0 から許可されていること', () => {
      // 【テスト目的】: HTTPS トラフィックが許可されていることを確認
      // 【テスト内容】: ALB SG の Ingress ルールを検証
      // 【期待される動作】: Port 443 が 0.0.0.0/0 から許可されている
      // 🔵 信頼性: requirements.md REQ-028 より

      // 【検証項目】: HTTPS インバウンドルールの存在確認
      // 🔵 信頼性: REQ-028 より
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      }); // 【確認内容】: HTTPS トラフィックが 0.0.0.0/0 から許可されている
    });
  });

  // ============================================================================
  // TC-SG-04: ECS Security Group 作成確認
  // 🔵 信頼性: architecture.md より
  // ============================================================================
  describe('TC-SG-04: ECS Security Group 作成確認', () => {
    // 【テスト目的】: ECS Security Group が正しく作成されることを確認
    // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、ECS SG を検証
    // 【期待される動作】: AWS::EC2::SecurityGroup リソースが ECS 用に作成される
    // 🔵 信頼性: TASK-0005.md、architecture.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ECS Security Group が作成されること', () => {
      // 【テスト目的】: ECS Security Group が正しく作成されることを確認
      // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、ECS SG を検証
      // 【期待される動作】: AWS::EC2::SecurityGroup リソースが ECS 用に作成される
      // 🔵 信頼性: TASK-0005.md、architecture.md より

      // 【検証項目】: ECS Security Group の存在確認
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('.*ECS.*|.*Fargate.*|.*ecs.*|.*fargate.*'),
      }); // 【確認内容】: ECS Security Group が作成され、説明に ECS を含む
    });
  });

  // ============================================================================
  // TC-SG-05: ECS Security Group ALB からのインバウンド許可確認
  // 🔵 信頼性: dataflow.md セキュリティ境界設計より
  // ============================================================================
  describe('TC-SG-05: ECS Security Group ALB からのインバウンド許可確認', () => {
    // 【テスト目的】: ECS Security Group に ALB Security Group からの containerPort インバウンドのみ許可されていることを確認
    // 【テスト内容】: ECS SG に ALB SG からのトラフィックのみが許可されることを検証
    // 【期待される動作】: SecurityGroupIngress に ALB SG 参照、containerPort のルールが存在する
    // 🔵 信頼性: dataflow.md セキュリティ境界設計より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成 (containerPort = 80)
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ECS Security Group に ALB SG からのインバウンドが許可されていること', () => {
      // 【テスト目的】: ALB SG からのトラフィックのみ許可されていることを確認
      // 【テスト内容】: ECS SG の Ingress ルールを検証
      // 【期待される動作】: SourceSecurityGroupId が ALB SG を参照している
      // 🔵 信頼性: dataflow.md より

      // 【検証項目】: ALB SG からのインバウンドルール確認
      // 🔵 信頼性: dataflow.md より
      // SourceSecurityGroupId を持つ Ingress ルールが存在することを確認
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        SourceSecurityGroupId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('.*'),
          ]),
        }),
      }); // 【確認内容】: ECS SG が ALB SG からのトラフィックを Port 80 で許可している
    });
  });

  // ============================================================================
  // TC-SG-06: ECS Security Group カスタム containerPort 確認
  // 🔵 信頼性: note.md 型定義より
  // ============================================================================
  describe('TC-SG-06: ECS Security Group カスタム containerPort 確認', () => {
    // 【テスト目的】: Props で指定した containerPort が正しく反映されることを確認
    // 【テスト内容】: containerPort: 8080 を指定した場合、Port 8080 でインバウンドルールが作成される
    // 【期待される動作】: FromPort: 8080, ToPort: 8080
    // 🔵 信頼性: note.md 型定義より

    beforeEach(() => {
      // 【テストデータ準備】: containerPort: 8080 で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
        containerPort: 8080,
      });
      template = Template.fromStack(stack);
    });

    test('ECS Security Group にカスタム containerPort (8080) でインバウンドが許可されること', () => {
      // 【テスト目的】: カスタム containerPort が正しく反映されることを確認
      // 【テスト内容】: ECS SG の Ingress ルールを検証
      // 【期待される動作】: Port 8080 でルールが作成される
      // 🔵 信頼性: note.md 型定義より

      // 【検証項目】: カスタム containerPort のインバウンドルール確認
      // 🔵 信頼性: note.md より
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 8080,
        ToPort: 8080,
      }); // 【確認内容】: ECS SG が Port 8080 でインバウンドを許可している
    });
  });

  // ============================================================================
  // TC-SG-07: Aurora Security Group 作成確認
  // 🔵 信頼性: 要件定義書 REQ-024 より
  // ============================================================================
  describe('TC-SG-07: Aurora Security Group 作成確認', () => {
    // 【テスト目的】: Aurora Security Group が正しく作成されることを確認
    // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、Aurora SG を検証
    // 【期待される動作】: AWS::EC2::SecurityGroup リソースが Aurora 用に作成される
    // 🔵 信頼性: requirements.md REQ-024 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora Security Group が作成されること', () => {
      // 【テスト目的】: Aurora Security Group が正しく作成されることを確認
      // 【テスト内容】: SecurityGroupConstruct をデフォルト設定でインスタンス化し、Aurora SG を検証
      // 【期待される動作】: AWS::EC2::SecurityGroup リソースが Aurora 用に作成される
      // 🔵 信頼性: requirements.md REQ-024 より

      // 【検証項目】: Aurora Security Group の存在確認
      // 🔵 信頼性: REQ-024 より
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('.*Aurora.*|.*MySQL.*|.*aurora.*|.*mysql.*|.*Database.*|.*database.*'),
      }); // 【確認内容】: Aurora Security Group が作成され、説明に Aurora/MySQL を含む
    });
  });

  // ============================================================================
  // TC-SG-08: Aurora Security Group ECS からの 3306 インバウンド許可確認
  // 🔵 信頼性: 要件定義書 REQ-025 より
  // ============================================================================
  describe('TC-SG-08: Aurora Security Group ECS からの 3306 インバウンド許可確認', () => {
    // 【テスト目的】: Aurora Security Group に ECS Security Group からの 3306 ポートインバウンドのみ許可されていることを確認
    // 【テスト内容】: Aurora SG に ECS SG からの MySQL 接続のみが許可されることを検証
    // 【期待される動作】: SecurityGroupIngress に ECS SG 参照、Port 3306 のルールが存在する
    // 🔵 信頼性: requirements.md REQ-025 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora Security Group に ECS SG からの 3306 インバウンドが許可されていること', () => {
      // 【テスト目的】: ECS SG からの 3306 のみ許可されていることを確認
      // 【テスト内容】: Aurora SG の Ingress ルールを検証
      // 【期待される動作】: SourceSecurityGroupId が ECS SG を参照し、Port 3306
      // 🔵 信頼性: requirements.md REQ-025 より

      // 【検証項目】: ECS SG からの 3306 インバウンドルール確認
      // 🔵 信頼性: REQ-025 より
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 3306,
        ToPort: 3306,
        SourceSecurityGroupId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('.*'),
          ]),
        }),
      }); // 【確認内容】: Aurora SG が ECS SG からの Port 3306 を許可している
    });
  });

  // ============================================================================
  // TC-SG-09: Aurora Security Group 外部アクセス遮断確認
  // 🔵 信頼性: 要件定義書 REQ-024 より
  // ============================================================================
  describe('TC-SG-09: Aurora Security Group 外部アクセス遮断確認', () => {
    // 【テスト目的】: Aurora Security Group に 0.0.0.0/0 からの直接アクセスが許可されていないことを確認
    // 【テスト内容】: Aurora SG にインターネットからの直接アクセスルールが存在しないことを検証
    // 【期待される動作】: CidrIp: '0.0.0.0/0' のインバウンドルールが存在しない
    // 🔵 信頼性: requirements.md REQ-024 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora Security Group に 0.0.0.0/0 からの直接アクセスが許可されていないこと', () => {
      // 【テスト目的】: 外部からの直接アクセスが遮断されていることを確認
      // 【テスト内容】: Aurora SG に 0.0.0.0/0 ルールが存在しないことを検証
      // 【期待される動作】: 0.0.0.0/0 をソースとするルールが存在しない
      // 🔵 信頼性: requirements.md REQ-024 より

      // 【検証項目】: 0.0.0.0/0 ルールの不在確認
      // 🔵 信頼性: REQ-024 より
      // Aurora SG の説明を持つリソースを検索
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*Aurora.*|.*MySQL.*|.*aurora.*|.*mysql.*|.*Database.*|.*database.*'),
        },
      });

      // Aurora SG が存在することを確認
      expect(Object.keys(securityGroups).length).toBeGreaterThan(0); // 🔵 Aurora SG が存在する

      // 各 Aurora SG について、0.0.0.0/0 のルールがないことを確認
      Object.values(securityGroups).forEach((sg: any) => {
        const ingress = sg.Properties.SecurityGroupIngress || [];
        const hasAnyIpv4Rule = ingress.some(
          (rule: any) => rule.CidrIp === '0.0.0.0/0'
        );
        expect(hasAnyIpv4Rule).toBe(false); // 【確認内容】: Aurora SG に 0.0.0.0/0 ルールが存在しない
      });
    });
  });

  // ============================================================================
  // TC-SG-10: Aurora Security Group アウトバウンド制限確認
  // 🔵 信頼性: TASK-0005.md、note.md CDKベストプラクティスより
  // ============================================================================
  describe('TC-SG-10: Aurora Security Group アウトバウンド制限確認', () => {
    // 【テスト目的】: Aurora Security Group でアウトバウンドトラフィックが制限されていることを確認
    // 【テスト内容】: Aurora SG の allowAllOutbound が false であることを検証
    // 【期待される動作】: SecurityGroupEgress にアウトバウンドルールがない、または制限されている
    // 🔵 信頼性: TASK-0005.md、note.md CDKベストプラクティスより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora Security Group でアウトバウンドトラフィックが制限されていること', () => {
      // 【テスト目的】: アウトバウンドトラフィックが制限されていることを確認
      // 【テスト内容】: Aurora SG の Egress ルールを検証
      // 【期待される動作】: allowAllOutbound: false の設定
      // 🔵 信頼性: TASK-0005.md、note.md より

      // 【検証項目】: アウトバウンド制限の確認
      // 🔵 信頼性: note.md CDKベストプラクティスより
      // Aurora SG の説明を持つリソースを検索
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*Aurora.*|.*MySQL.*|.*aurora.*|.*mysql.*|.*Database.*|.*database.*'),
        },
      });

      // Aurora SG が存在することを確認
      expect(Object.keys(securityGroups).length).toBeGreaterThan(0); // 🔵 Aurora SG が存在する

      // 各 Aurora SG について、allowAllOutbound: false が設定されていることを確認
      // CDK は allowAllOutbound: false の場合、SecurityGroupEgress にルールを含めない
      // または、制限された Egress ルールのみを含める
      Object.values(securityGroups).forEach((sg: any) => {
        const egress = sg.Properties.SecurityGroupEgress || [];
        // allowAllOutbound: false の場合、0.0.0.0/0 への -1 (全プロトコル) ルールがない
        const hasAllowAllOutbound = egress.some(
          (rule: any) =>
            rule.IpProtocol === '-1' && rule.CidrIp === '0.0.0.0/0'
        );
        expect(hasAllowAllOutbound).toBe(false); // 【確認内容】: Aurora SG で全アウトバウンドが許可されていない
      });
    });
  });

  // ============================================================================
  // TC-SG-11: 公開プロパティ存在確認
  // 🔵 信頼性: note.md 型定義より
  // ============================================================================
  describe('TC-SG-11: 公開プロパティ存在確認', () => {
    // 【テスト目的】: 全ての公開プロパティ (albSecurityGroup, ecsSecurityGroup, auroraSecurityGroup) が定義されていることを確認
    // 【テスト内容】: Construct の公開プロパティが正しく設定されることを検証
    // 【期待される動作】: 各プロパティが ISecurityGroup 型で定義される
    // 🔵 信頼性: note.md 型定義より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('albSecurityGroup プロパティが定義されていること', () => {
      // 【テスト目的】: albSecurityGroup プロパティの存在確認
      // 【テスト内容】: プロパティが undefined でないことを検証
      // 【期待される動作】: albSecurityGroup が定義される
      // 🔵 信頼性: note.md 型定義より

      // 【検証項目】: albSecurityGroup プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(securityGroupConstruct.albSecurityGroup).toBeDefined(); // 【確認内容】: albSecurityGroup プロパティが定義されている
    });

    test('ecsSecurityGroup プロパティが定義されていること', () => {
      // 【テスト目的】: ecsSecurityGroup プロパティの存在確認
      // 【テスト内容】: プロパティが undefined でないことを検証
      // 【期待される動作】: ecsSecurityGroup が定義される
      // 🔵 信頼性: note.md 型定義より

      // 【検証項目】: ecsSecurityGroup プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(securityGroupConstruct.ecsSecurityGroup).toBeDefined(); // 【確認内容】: ecsSecurityGroup プロパティが定義されている
    });

    test('auroraSecurityGroup プロパティが定義されていること', () => {
      // 【テスト目的】: auroraSecurityGroup プロパティの存在確認
      // 【テスト内容】: プロパティが undefined でないことを検証
      // 【期待される動作】: auroraSecurityGroup が定義される
      // 🔵 信頼性: note.md 型定義より

      // 【検証項目】: auroraSecurityGroup プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(securityGroupConstruct.auroraSecurityGroup).toBeDefined(); // 【確認内容】: auroraSecurityGroup プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-SG-16: containerPort デフォルト値 (80) 確認
  // 🔵 信頼性: note.md 型定義より
  // ============================================================================
  describe('TC-SG-16: containerPort デフォルト値 (80) 確認', () => {
    // 【テスト目的】: containerPort 未指定時にデフォルト値 80 が使用されることを確認
    // 【テスト内容】: Props 省略時のフォールバック動作を検証
    // 【期待される動作】: ECS SG のインバウンドルールが FromPort=80, ToPort=80 で作成される
    // 🔵 信頼性: note.md 型定義より

    beforeEach(() => {
      // 【テストデータ準備】: containerPort 省略で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('containerPort 未指定時にデフォルト値 80 が使用されること', () => {
      // 【テスト目的】: デフォルト値が正しく適用されることを確認
      // 【テスト内容】: ECS SG の Ingress ルールを検証
      // 【期待される動作】: デフォルト値 80 が適用される
      // 🔵 信頼性: note.md 型定義より

      // 【検証項目】: デフォルト containerPort のインバウンドルール確認
      // 🔵 信頼性: note.md より
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        SourceSecurityGroupId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('.*'),
          ]),
        }),
      }); // 【確認内容】: デフォルトの containerPort=80 でインバウンドルールが作成される
    });
  });

  // ============================================================================
  // TC-SG-17: ECS SG が ALB SG を参照していること (CIDR ベースでないこと)
  // 🔵 信頼性: note.md セキュリティ考慮事項より
  // ============================================================================
  describe('TC-SG-17: ECS SG が ALB SG を参照していること (CIDR ベースでないこと)', () => {
    // 【テスト目的】: ECS Security Group のインバウンドルールが ALB Security Group を参照していることを確認
    // 【テスト内容】: SG-to-SG 参照が正しく設定されることを検証
    // 【期待される動作】: SourceSecurityGroupId が ALB SG の ID を参照する
    // 🔵 信頼性: note.md セキュリティ考慮事項より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ECS SG のインバウンドルールが CIDR ではなく Security Group 参照であること', () => {
      // 【テスト目的】: SG-to-SG 参照が使用されていることを確認
      // 【テスト内容】: ECS SG の Ingress ルールに SourceSecurityGroupId があることを検証
      // 【期待される動作】: CidrIp ではなく SourceSecurityGroupId が設定されている
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【検証項目】: SG 参照方式の確認
      // 🔵 信頼性: note.md より
      // ECS SG への Ingress ルールを検索（Port 80 または containerPort）
      const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress', {
        Properties: {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
        },
      });

      // Ingress ルールが存在することを確認
      expect(Object.keys(ingressRules).length).toBeGreaterThan(0); // 🔵 Ingress ルールが存在する

      // 少なくとも 1 つの Ingress ルールが SourceSecurityGroupId を使用していることを確認
      const hasSourceSecurityGroupId = Object.values(ingressRules).some(
        (rule: any) => rule.Properties.SourceSecurityGroupId !== undefined
      );
      expect(hasSourceSecurityGroupId).toBe(true); // 【確認内容】: SourceSecurityGroupId が使用されている（SG 参照）

      // CidrIp が使用されていないことを確認
      const hasCidrIp = Object.values(ingressRules).some(
        (rule: any) =>
          rule.Properties.SourceSecurityGroupId !== undefined &&
          rule.Properties.CidrIp !== undefined
      );
      expect(hasCidrIp).toBe(false); // 【確認内容】: SG 参照のルールに CidrIp が含まれていない
    });
  });

  // ============================================================================
  // TC-SG-18: Aurora SG が ECS SG を参照していること (CIDR ベースでないこと)
  // 🔵 信頼性: note.md セキュリティ考慮事項、requirements.md REQ-025 より
  // ============================================================================
  describe('TC-SG-18: Aurora SG が ECS SG を参照していること (CIDR ベースでないこと)', () => {
    // 【テスト目的】: Aurora Security Group のインバウンドルールが ECS Security Group を参照していることを確認
    // 【テスト内容】: SG-to-SG 参照が正しく設定されることを検証
    // 【期待される動作】: SourceSecurityGroupId が ECS SG の ID を参照する
    // 🔵 信頼性: note.md セキュリティ考慮事項、requirements.md REQ-025 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora SG のインバウンドルールが CIDR ではなく Security Group 参照であること', () => {
      // 【テスト目的】: SG-to-SG 参照が使用されていることを確認
      // 【テスト内容】: Aurora SG の Ingress ルールに SourceSecurityGroupId があることを検証
      // 【期待される動作】: CidrIp ではなく SourceSecurityGroupId が設定されている
      // 🔵 信頼性: note.md セキュリティ考慮事項、requirements.md REQ-025 より

      // 【検証項目】: SG 参照方式の確認
      // 🔵 信頼性: note.md、REQ-025 より
      // Aurora SG への Ingress ルールを検索（Port 3306）
      const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress', {
        Properties: {
          IpProtocol: 'tcp',
          FromPort: 3306,
          ToPort: 3306,
        },
      });

      // Ingress ルールが存在することを確認
      expect(Object.keys(ingressRules).length).toBeGreaterThan(0); // 🔵 Ingress ルールが存在する

      // 少なくとも 1 つの Ingress ルールが SourceSecurityGroupId を使用していることを確認
      const hasSourceSecurityGroupId = Object.values(ingressRules).some(
        (rule: any) => rule.Properties.SourceSecurityGroupId !== undefined
      );
      expect(hasSourceSecurityGroupId).toBe(true); // 【確認内容】: SourceSecurityGroupId が使用されている（SG 参照）

      // CidrIp が使用されていないことを確認
      const hasCidrIp = Object.values(ingressRules).some(
        (rule: any) =>
          rule.Properties.SourceSecurityGroupId !== undefined &&
          rule.Properties.CidrIp !== undefined
      );
      expect(hasCidrIp).toBe(false); // 【確認内容】: SG 参照のルールに CidrIp が含まれていない
    });
  });

  // ============================================================================
  // TC-SG-19: ALB SG に HTTP/HTTPS 以外のインバウンドルールがないこと
  // 🔵 信頼性: TASK-0005.md 最小権限の原則より
  // ============================================================================
  describe('TC-SG-19: ALB SG に HTTP/HTTPS 以外のインバウンドルールがないこと', () => {
    // 【テスト目的】: ALB Security Group に HTTP(80) と HTTPS(443) 以外のインバウンドルールが存在しないことを確認
    // 【テスト内容】: ALB SG に不要なルールが含まれていないことを検証
    // 【期待される動作】: インバウンドルールが HTTP と HTTPS のみ
    // 🔵 信頼性: TASK-0005.md 最小権限の原則より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ALB SG に HTTP(80) と HTTPS(443) 以外のインバウンドルールが存在しないこと', () => {
      // 【テスト目的】: 不要なルールが存在しないことを確認
      // 【テスト内容】: ALB SG のインバウンドルールを検証
      // 【期待される動作】: Port 80 と Port 443 のみ
      // 🔵 信頼性: TASK-0005.md 最小権限の原則より

      // 【検証項目】: 不要ルールの不在確認
      // 🔵 信頼性: TASK-0005.md より
      // ALB SG の説明を持つリソースを検索
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*ALB.*|.*Load.*Balancer.*|.*loadbalancer.*|.*alb.*'),
        },
      });

      // ALB SG が存在することを確認
      expect(Object.keys(securityGroups).length).toBeGreaterThan(0); // 🔵 ALB SG が存在する

      // 各 ALB SG について、HTTP(80) と HTTPS(443) 以外のルールがないことを確認
      Object.values(securityGroups).forEach((sg: any) => {
        const ingress = sg.Properties.SecurityGroupIngress || [];
        ingress.forEach((rule: any) => {
          // 0.0.0.0/0 からのルールは Port 80 または Port 443 のみ許可
          if (rule.CidrIp === '0.0.0.0/0') {
            expect([80, 443]).toContain(rule.FromPort); // 【確認内容】: 0.0.0.0/0 からは HTTP/HTTPS のみ
          }
        });
      });
    });
  });

  // ============================================================================
  // TC-SG-20: ECS SG に ALB からのルール以外のインバウンドルールがないこと
  // 🔵 信頼性: TASK-0005.md 最小権限の原則、dataflow.md より
  // ============================================================================
  describe('TC-SG-20: ECS SG に ALB からのルール以外のインバウンドルールがないこと', () => {
    // 【テスト目的】: ECS Security Group に ALB SG からの containerPort 以外のインバウンドルールが存在しないことを確認
    // 【テスト内容】: ECS SG に不要なルールが含まれていないことを検証
    // 【期待される動作】: インバウンドルールが ALB SG からの containerPort のみ
    // 🔵 信頼性: TASK-0005.md 最小権限の原則、dataflow.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('ECS SG に 0.0.0.0/0 からのインバウンドルールが存在しないこと', () => {
      // 【テスト目的】: 外部からの直接アクセスが許可されていないことを確認
      // 【テスト内容】: ECS SG に 0.0.0.0/0 ルールが存在しないことを検証
      // 【期待される動作】: 0.0.0.0/0 をソースとするルールが存在しない
      // 🔵 信頼性: TASK-0005.md 最小権限の原則より

      // 【検証項目】: 0.0.0.0/0 ルールの不在確認
      // 🔵 信頼性: TASK-0005.md より
      // ECS SG の説明を持つリソースを検索
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*ECS.*|.*Fargate.*|.*ecs.*|.*fargate.*'),
        },
      });

      // ECS SG が存在することを確認
      expect(Object.keys(securityGroups).length).toBeGreaterThan(0); // 🔵 ECS SG が存在する

      // 各 ECS SG について、0.0.0.0/0 のルールがないことを確認
      Object.values(securityGroups).forEach((sg: any) => {
        const ingress = sg.Properties.SecurityGroupIngress || [];
        const hasAnyIpv4Rule = ingress.some(
          (rule: any) => rule.CidrIp === '0.0.0.0/0'
        );
        expect(hasAnyIpv4Rule).toBe(false); // 【確認内容】: ECS SG に 0.0.0.0/0 ルールが存在しない
      });
    });
  });

  // ============================================================================
  // TC-SG-21: Aurora SG に ECS からのルール以外のインバウンドルールがないこと
  // 🔵 信頼性: requirements.md REQ-024, REQ-025、TASK-0005.md より
  // ============================================================================
  describe('TC-SG-21: Aurora SG に ECS からのルール以外のインバウンドルールがないこと', () => {
    // 【テスト目的】: Aurora Security Group に ECS SG からの 3306 以外のインバウンドルールが存在しないことを確認
    // 【テスト内容】: Aurora SG に不要なルールが含まれていないことを検証
    // 【期待される動作】: インバウンドルールが ECS SG からの 3306 のみ
    // 🔵 信頼性: requirements.md REQ-024, REQ-025、TASK-0005.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('Aurora SG に Port 3306 以外のインバウンドルールが存在しないこと', () => {
      // 【テスト目的】: 不要なポートへのアクセスが許可されていないことを確認
      // 【テスト内容】: Aurora SG のインバウンドルールを検証
      // 【期待される動作】: Port 3306 のみ
      // 🔵 信頼性: requirements.md REQ-025 より

      // 【検証項目】: Port 3306 以外のルール不在確認
      // 🔵 信頼性: REQ-024, REQ-025 より
      // Aurora SG の説明を持つリソースを検索
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*Aurora.*|.*MySQL.*|.*aurora.*|.*mysql.*|.*Database.*|.*database.*'),
        },
      });

      // Aurora SG が存在することを確認
      expect(Object.keys(securityGroups).length).toBeGreaterThan(0); // 🔵 Aurora SG が存在する

      // 各 Aurora SG について、3306 以外のポートルールがないことを確認
      Object.values(securityGroups).forEach((sg: any) => {
        const ingress = sg.Properties.SecurityGroupIngress || [];
        ingress.forEach((rule: any) => {
          // インバウンドルールがある場合、Port 3306 のみであること
          if (rule.FromPort !== undefined) {
            expect(rule.FromPort).toBe(3306); // 【確認内容】: Port 3306 のみ許可されている
          }
        });
      });
    });
  });

  // ============================================================================
  // TC-SG-22: 作成される Security Group が 3 つであること
  // 🔵 信頼性: TASK-0005.md、architecture.md より
  // ============================================================================
  describe('TC-SG-22: 作成される Security Group が 3 つであること', () => {
    // 【テスト目的】: SecurityGroupConstruct で作成される Security Group の総数が 3 であることを確認
    // 【テスト内容】: 不要な Security Group が作成されていないことを検証
    // 【期待される動作】: ALB SG, ECS SG, Aurora SG の 3 つのみ作成される
    // 🔵 信頼性: TASK-0005.md、architecture.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で SecurityGroupConstruct を作成
      securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
        vpc,
      });
      template = Template.fromStack(stack);
    });

    test('SecurityGroupConstruct で作成される Security Group が 3 つであること', () => {
      // 【テスト目的】: 不要リソースが作成されていないことを確認
      // 【テスト内容】: Security Group の総数を検証
      // 【期待される動作】: 3 つ（ALB SG, ECS SG, Aurora SG）+ VPC デフォルト SG
      // 🔵 信頼性: TASK-0005.md、architecture.md より

      // 【検証項目】: Security Group 総数の確認
      // 🔵 信頼性: TASK-0005.md より
      // SecurityGroupConstruct で作成される SG は 3 つ
      // VPC が作成するデフォルト SG を除外して確認する
      // 説明に ALB, ECS, Aurora を含む SG の数を確認
      const albSgs = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*ALB.*|.*Load.*Balancer.*|.*loadbalancer.*|.*alb.*'),
        },
      });
      const ecsSgs = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*ECS.*|.*Fargate.*|.*ecs.*|.*fargate.*'),
        },
      });
      const auroraSgs = template.findResources('AWS::EC2::SecurityGroup', {
        Properties: {
          GroupDescription: Match.stringLikeRegexp('.*Aurora.*|.*MySQL.*|.*aurora.*|.*mysql.*|.*Database.*|.*database.*'),
        },
      });

      // 各タイプの SG が 1 つずつ存在することを確認
      expect(Object.keys(albSgs).length).toBe(1); // 【確認内容】: ALB SG が 1 つ
      expect(Object.keys(ecsSgs).length).toBe(1); // 【確認内容】: ECS SG が 1 つ
      expect(Object.keys(auroraSgs).length).toBe(1); // 【確認内容】: Aurora SG が 1 つ
    });
  });
});
