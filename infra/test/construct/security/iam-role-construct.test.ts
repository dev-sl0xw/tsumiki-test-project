/**
 * IAM Role Construct テスト
 *
 * TASK-0006: IAM Role Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-IAM-01: ECS Task Role 作成確認
 * - TC-IAM-02: Task Role に ecs-tasks.amazonaws.com が AssumeRole できること
 * - TC-IAM-03: Task Role に AmazonSSMManagedInstanceCore がアタッチされていること
 * - TC-IAM-04: Task Role に secretsmanager:GetSecretValue 権限が含まれていること
 * - TC-IAM-05: ECS Task Execution Role 作成確認
 * - TC-IAM-06: Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること
 * - TC-IAM-07: Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること
 * - TC-IAM-08: 管理者権限 (AdministratorAccess 等) がアタッチされていないこと
 * - TC-IAM-09: 公開プロパティ (taskRole, executionRole) が定義されていること
 * - TC-IAM-10: 作成される IAM Role が 2 つであること
 * - TC-IAM-11: secretArns を指定した場合、特定の ARN のみにアクセス許可されること
 * - TC-IAM-12: secretArns が空配列の場合、デフォルト ['*'] が使用されること
 * - TC-IAM-13: Props が undefined の場合、デフォルト値で Role が作成されること
 * - TC-IAM-14: PowerUserAccess がアタッチされていないこと
 * - TC-IAM-15: IAMFullAccess がアタッチされていないこと
 *
 * 🔵 信頼性: 要件定義書 REQ-018, タスク定義 TASK-0006.md に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IamRoleConstruct } from '../../../lib/construct/security/iam-role-construct';

describe('IamRoleConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let iamRoleConstruct: IamRoleConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: デフォルト設定で IamRoleConstruct を作成
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
  // TC-IAM-01: ECS Task Role 作成確認
  // 🔵 信頼性: 要件定義書 REQ-018 より
  // ============================================================================
  describe('TC-IAM-01: ECS Task Role 作成確認', () => {
    // 【テスト目的】: ECS Task Role が正しく作成されることを確認
    // 【テスト内容】: IamRoleConstruct をデフォルト設定でインスタンス化し、Task Role を検証
    // 【期待される動作】: AWS::IAM::Role リソースが Task Role 用に作成される
    // 🔵 信頼性: 要件定義書 REQ-018、TASK-0006.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('ECS Task Role が作成されること', () => {
      // 【テスト目的】: ECS Task Role が正しく作成されることを確認
      // 【テスト内容】: IamRoleConstruct をデフォルト設定でインスタンス化し、Task Role を検証
      // 【期待される動作】: AWS::IAM::Role リソースが Task Role 用に作成される
      // 🔵 信頼性: 要件定義書 REQ-018、TASK-0006.md より

      // 【検証項目】: Task Role の存在確認
      // 🔵 信頼性: REQ-018 より
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      }); // 【確認内容】: ECS Task Role が ecs-tasks.amazonaws.com を信頼して作成されている
    });
  });

  // ============================================================================
  // TC-IAM-02: Task Role に ecs-tasks.amazonaws.com が AssumeRole できること
  // 🔵 信頼性: タスクノート note.md Trust Relationship 設計より
  // ============================================================================
  describe('TC-IAM-02: Task Role Trust Relationship 確認', () => {
    // 【テスト目的】: Task Role の AssumeRolePolicyDocument に ecs-tasks.amazonaws.com が信頼されたプリンシパルとして含まれることを確認
    // 【テスト内容】: Task Role の Trust Relationship を検証
    // 【期待される動作】: ECS サービスが Task Role を引き受け可能
    // 🔵 信頼性: タスクノート note.md Trust Relationship 設計より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Task Role に ecs-tasks.amazonaws.com が AssumeRole できること', () => {
      // 【テスト目的】: Task Role の Trust Relationship を確認
      // 【テスト内容】: AssumeRolePolicyDocument を検証
      // 【期待される動作】: ecs-tasks.amazonaws.com が Principal として含まれる
      // 🔵 信頼性: タスクノート note.md より

      // 【検証項目】: Trust Relationship の正確性確認
      // 🔵 信頼性: note.md より
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            }),
          ]),
        }),
      }); // 【確認内容】: ECS Task Role が ecs-tasks.amazonaws.com を信頼している
    });
  });

  // ============================================================================
  // TC-IAM-03: Task Role に AmazonSSMManagedInstanceCore がアタッチされていること
  // 🔵 信頼性: 要件定義書 REQ-018、タスク定義 TASK-0006.md より
  // ============================================================================
  describe('TC-IAM-03: Task Role SSM マネージドポリシー確認', () => {
    // 【テスト目的】: Task Role に AmazonSSMManagedInstanceCore マネージドポリシーがアタッチされていることを確認
    // 【テスト内容】: Task Role の ManagedPolicyArns を検証
    // 【期待される動作】: ECS Exec (SSM Session Manager) が使用可能
    // 🔵 信頼性: 要件定義書 REQ-018、TASK-0006.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Task Role に AmazonSSMManagedInstanceCore がアタッチされていること', () => {
      // 【テスト目的】: SSM マネージドポリシーの存在確認
      // 【テスト内容】: ManagedPolicyArns を検証
      // 【期待される動作】: AmazonSSMManagedInstanceCore への参照が含まれる
      // 🔵 信頼性: REQ-018、TASK-0006.md より

      // 【検証項目】: SSM マネージドポリシーのアタッチ確認
      // 🔵 信頼性: REQ-018 より
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              '',
              Match.arrayWith([
                Match.stringLikeRegexp('.*iam::aws:policy/AmazonSSMManagedInstanceCore.*'),
              ]),
            ]),
          }),
        ]),
      }); // 【確認内容】: Task Role に AmazonSSMManagedInstanceCore がアタッチされている
    });
  });

  // ============================================================================
  // TC-IAM-04: Task Role に secretsmanager:GetSecretValue 権限が含まれていること
  // 🔵 信頼性: タスク定義 TASK-0006.md Secrets Manager アクセス権限セクションより
  // ============================================================================
  describe('TC-IAM-04: Task Role Secrets Manager 権限確認', () => {
    // 【テスト目的】: Task Role に secretsmanager:GetSecretValue アクションを許可するインラインポリシーが含まれていることを確認
    // 【テスト内容】: Task Role に関連する IAM Policy の PolicyDocument を検証
    // 【期待される動作】: ECS タスクから Secrets Manager の DB 認証情報を取得可能
    // 🔵 信頼性: TASK-0006.md Secrets Manager アクセス権限セクションより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Task Role に secretsmanager:GetSecretValue 権限が含まれていること', () => {
      // 【テスト目的】: Secrets Manager アクセス権限の確認
      // 【テスト内容】: PolicyDocument を検証
      // 【期待される動作】: secretsmanager:GetSecretValue が許可されている
      // 🔵 信頼性: TASK-0006.md より

      // 【検証項目】: secretsmanager:GetSecretValue 権限の存在確認
      // 🔵 信頼性: TASK-0006.md より
      // 【注意】: CDK は単一アクションを文字列として出力するため、文字列でマッチング
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
            }),
          ]),
        },
      }); // 【確認内容】: Task Role に secretsmanager:GetSecretValue 権限がある
    });
  });

  // ============================================================================
  // TC-IAM-05: ECS Task Execution Role 作成確認
  // 🔵 信頼性: タスク定義 TASK-0006.md ECS Task Execution Role セクションより
  // ============================================================================
  describe('TC-IAM-05: ECS Task Execution Role 作成確認', () => {
    // 【テスト目的】: ECS Task Execution Role が正しく作成されることを確認
    // 【テスト内容】: IamRoleConstruct をインスタンス化し、2つ目の Role を検証
    // 【期待される動作】: AWS::IAM::Role リソースが Execution Role 用に作成される
    // 🔵 信頼性: TASK-0006.md ECS Task Execution Role セクションより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('ECS Task Execution Role が作成されること', () => {
      // 【テスト目的】: Execution Role が作成されることを確認
      // 【テスト内容】: AWS::IAM::Role リソースの存在を検証
      // 【期待される動作】: 2 つ目の Role が作成される
      // 🔵 信頼性: TASK-0006.md より

      // 【検証項目】: Execution Role の存在確認（2つのRoleが存在）
      // 🔵 信頼性: TASK-0006.md より
      template.resourceCountIs('AWS::IAM::Role', 2); // 【確認内容】: 2 つの IAM Role（Task Role + Execution Role）が作成される
    });
  });

  // ============================================================================
  // TC-IAM-06: Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること
  // 🔵 信頼性: タスクノート note.md Trust Relationship 設計より
  // ============================================================================
  describe('TC-IAM-06: Execution Role Trust Relationship 確認', () => {
    // 【テスト目的】: Execution Role の AssumeRolePolicyDocument に ecs-tasks.amazonaws.com が信頼されたプリンシパルとして含まれることを確認
    // 【テスト内容】: Execution Role の Trust Relationship を検証
    // 【期待される動作】: ECS エージェントが Execution Role を引き受け可能
    // 🔵 信頼性: タスクノート note.md Trust Relationship 設計より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること', () => {
      // 【テスト目的】: Execution Role の Trust Relationship を確認
      // 【テスト内容】: AssumeRolePolicyDocument を検証
      // 【期待される動作】: ecs-tasks.amazonaws.com が Principal として含まれる
      // 🔵 信頼性: note.md より

      // 【検証項目】: 両方の Role が同じ Trust Relationship を持つ
      // 🔵 信頼性: note.md より
      // すべての Role が ecs-tasks.amazonaws.com を信頼していることを確認
      const roles = template.findResources('AWS::IAM::Role');
      Object.values(roles).forEach((role: any) => {
        const statements = role.Properties.AssumeRolePolicyDocument?.Statement || [];
        const hasEcsTasksTrust = statements.some(
          (stmt: any) =>
            stmt.Principal?.Service === 'ecs-tasks.amazonaws.com' &&
            stmt.Effect === 'Allow' &&
            stmt.Action === 'sts:AssumeRole'
        );
        expect(hasEcsTasksTrust).toBe(true); // 【確認内容】: Role が ecs-tasks.amazonaws.com を信頼している
      });
    });
  });

  // ============================================================================
  // TC-IAM-07: Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること
  // 🔵 信頼性: タスク定義 TASK-0006.md ECS Task Execution Role セクションより
  // ============================================================================
  describe('TC-IAM-07: Execution Role ECS マネージドポリシー確認', () => {
    // 【テスト目的】: Execution Role に service-role/AmazonECSTaskExecutionRolePolicy マネージドポリシーがアタッチされていることを確認
    // 【テスト内容】: Execution Role の ManagedPolicyArns を検証
    // 【期待される動作】: ECR からのイメージ Pull と CloudWatch Logs への書き込みが可能
    // 🔵 信頼性: TASK-0006.md ECS Task Execution Role セクションより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること', () => {
      // 【テスト目的】: ECS マネージドポリシーの存在確認
      // 【テスト内容】: ManagedPolicyArns を検証
      // 【期待される動作】: AmazonECSTaskExecutionRolePolicy への参照が含まれる
      // 🔵 信頼性: TASK-0006.md より

      // 【検証項目】: ECS マネージドポリシーのアタッチ確認
      // 🔵 信頼性: TASK-0006.md より
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              '',
              Match.arrayWith([
                Match.stringLikeRegexp('.*iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy.*'),
              ]),
            ]),
          }),
        ]),
      }); // 【確認内容】: Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされている
    });
  });

  // ============================================================================
  // TC-IAM-08: 管理者権限 (AdministratorAccess 等) がアタッチされていないこと
  // 🔵 信頼性: タスクノート note.md セキュリティ考慮事項、TASK-0006.md より
  // ============================================================================
  describe('TC-IAM-08: AdministratorAccess 不在確認', () => {
    // 【テスト目的】: 広範な管理者権限が誤ってアタッチされていないことを確認
    // 【テスト内容】: ManagedPolicyArns に AdministratorAccess が含まれないことを検証
    // 【期待される動作】: セキュリティインシデントを防止、最小権限の原則を遵守
    // 🔵 信頼性: note.md セキュリティ考慮事項、TASK-0006.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('AdministratorAccess がアタッチされていないこと', () => {
      // 【テスト目的】: 過剰権限の排除確認
      // 【テスト内容】: ManagedPolicyArns を検証
      // 【期待される動作】: AdministratorAccess が含まれない
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【検証項目】: AdministratorAccess ポリシーの不在確認
      // 🔵 信頼性: note.md より
      const roles = template.findResources('AWS::IAM::Role');
      Object.values(roles).forEach((role: any) => {
        const managedPolicyArns = role.Properties.ManagedPolicyArns || [];
        const hasAdminAccess = managedPolicyArns.some((arn: any) => {
          // 文字列 ARN の場合
          if (typeof arn === 'string') {
            return arn.includes('AdministratorAccess');
          }
          // Fn::Join の場合
          if (arn['Fn::Join']) {
            const joinedArn = JSON.stringify(arn);
            return joinedArn.includes('AdministratorAccess');
          }
          return false;
        });
        expect(hasAdminAccess).toBe(false); // 【確認内容】: AdministratorAccess がアタッチされていない
      });
    });
  });

  // ============================================================================
  // TC-IAM-09: 公開プロパティ (taskRole, executionRole) が定義されていること
  // 🔵 信頼性: タスクノート note.md 型定義インターフェースより
  // ============================================================================
  describe('TC-IAM-09: 公開プロパティ存在確認', () => {
    // 【テスト目的】: IamRoleConstruct インスタンスの taskRole と executionRole プロパティが正しく定義されていることを確認
    // 【テスト内容】: 両プロパティが undefined でないことを検証
    // 【期待される動作】: 両プロパティが iam.IRole 型で定義される
    // 🔵 信頼性: note.md 型定義インターフェースより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('taskRole プロパティが定義されていること', () => {
      // 【テスト目的】: taskRole プロパティの存在確認
      // 【テスト内容】: プロパティが undefined でないことを検証
      // 【期待される動作】: taskRole が定義される
      // 🔵 信頼性: note.md 型定義インターフェースより

      // 【検証項目】: taskRole プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(iamRoleConstruct.taskRole).toBeDefined(); // 【確認内容】: taskRole プロパティが定義されている
    });

    test('executionRole プロパティが定義されていること', () => {
      // 【テスト目的】: executionRole プロパティの存在確認
      // 【テスト内容】: プロパティが undefined でないことを検証
      // 【期待される動作】: executionRole が定義される
      // 🔵 信頼性: note.md 型定義インターフェースより

      // 【検証項目】: executionRole プロパティの存在確認
      // 🔵 信頼性: note.md より
      expect(iamRoleConstruct.executionRole).toBeDefined(); // 【確認内容】: executionRole プロパティが定義されている
    });
  });

  // ============================================================================
  // TC-IAM-10: 作成される IAM Role が 2 つであること
  // 🔵 信頼性: タスクノート note.md テストケース概要 TC-IAM-10 より
  // ============================================================================
  describe('TC-IAM-10: IAM Role 総数確認', () => {
    // 【テスト目的】: IamRoleConstruct で作成される IAM Role の総数が 2 であることを確認
    // 【テスト内容】: 不要な Role が作成されていないことを検証
    // 【期待される動作】: Task Role と Execution Role の 2 つのみが作成される
    // 🔵 信頼性: note.md テストケース概要 TC-IAM-10 より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('作成される IAM Role が 2 つであること', () => {
      // 【テスト目的】: 不要リソースが作成されていないことを確認
      // 【テスト内容】: IAM Role の総数を検証
      // 【期待される動作】: 2 つ（Task Role + Execution Role）
      // 🔵 信頼性: note.md より

      // 【検証項目】: IAM Role 総数の確認
      // 🔵 信頼性: note.md より
      template.resourceCountIs('AWS::IAM::Role', 2); // 【確認内容】: IAM Role が正確に 2 つ作成される
    });
  });

  // ============================================================================
  // TC-IAM-11: secretArns を指定した場合、特定の ARN のみにアクセス許可されること
  // 🔵 信頼性: タスクノート note.md セキュリティ考慮事項より
  // ============================================================================
  describe('TC-IAM-11: secretArns パラメータ指定確認', () => {
    // 【テスト目的】: secretArns プロパティに特定の Secret ARN を指定した場合、その ARN のみにアクセスが制限されることを確認
    // 【テスト内容】: PolicyStatement の Resource が指定された ARN に制限されることを検証
    // 【期待される動作】: Resource が '*' ではなく指定された ARN になる
    // 🔵 信頼性: note.md セキュリティ考慮事項より

    const testSecretArn = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:my-db-secret-abc123';

    beforeEach(() => {
      // 【テストデータ準備】: secretArns を指定して IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {
        secretArns: [testSecretArn],
      });
      template = Template.fromStack(stack);
    });

    test('secretArns を指定した場合、特定の ARN のみにアクセス許可されること', () => {
      // 【テスト目的】: パラメータによる権限制限の確認
      // 【テスト内容】: PolicyDocument の Resource を検証
      // 【期待される動作】: Resource が指定された ARN に制限される
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【検証項目】: secretArns パラメータの反映確認
      // 🔵 信頼性: note.md より
      // 【注意】: CDK は単一要素の配列を文字列として出力するため、文字列でマッチング
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: testSecretArn,
            }),
          ]),
        },
      }); // 【確認内容】: 指定された Secret ARN のみにアクセスが制限される
    });
  });

  // ============================================================================
  // TC-IAM-12: secretArns が空配列の場合、デフォルト ['*'] が使用されること
  // 🟡 信頼性: 要件定義書 requirements.md エッジケース EC-01 より（妥当な推測を含む）
  // ============================================================================
  describe('TC-IAM-12: secretArns 空配列時のデフォルト動作確認', () => {
    // 【テスト目的】: secretArns に空配列を渡した場合、デフォルト値 ['*'] が使用されることを確認
    // 【テスト内容】: 空配列でも正常に動作し、デフォルト値が適用されることを検証
    // 【期待される動作】: Resource が '*' にフォールバック
    // 🟡 信頼性: requirements.md エッジケース EC-01 より（妥当な推測を含む）

    beforeEach(() => {
      // 【テストデータ準備】: secretArns を空配列で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {
        secretArns: [],
      });
      template = Template.fromStack(stack);
    });

    test('secretArns が空配列の場合、デフォルト [\'*\'] が使用されること', () => {
      // 【テスト目的】: エッジケースの動作確認
      // 【テスト内容】: PolicyDocument の Resource を検証
      // 【期待される動作】: Resource が '*' にフォールバック
      // 🟡 信頼性: requirements.md エッジケース EC-01 より

      // 【検証項目】: デフォルト値へのフォールバック確認
      // 🟡 信頼性: requirements.md より
      // 【注意】: CDK は単一アクションを文字列として出力するため、文字列でマッチング
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: '*',
            }),
          ]),
        },
      }); // 【確認内容】: 空配列の場合、デフォルト '*' が使用される
    });
  });

  // ============================================================================
  // TC-IAM-13: Props が undefined の場合、デフォルト値で Role が作成されること
  // 🔵 信頼性: 要件定義書 requirements.md エッジケース EC-03 より
  // ============================================================================
  describe('TC-IAM-13: Props 省略時のデフォルト動作確認', () => {
    // 【テスト目的】: Props オブジェクトを空で渡した場合（secretArns 未指定）の動作を確認
    // 【テスト内容】: Props 省略でも正常に動作することを検証
    // 【期待される動作】: デフォルト値で Role が作成される
    // 🔵 信頼性: requirements.md エッジケース EC-03 より

    beforeEach(() => {
      // 【テストデータ準備】: 空の Props で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('Props が空の場合、デフォルト値で Role が作成されること', () => {
      // 【テスト目的】: 最小設定での動作確認
      // 【テスト内容】: デフォルト値が正しく適用されることを検証
      // 【期待される動作】: Task Role と Execution Role が作成される
      // 🔵 信頼性: requirements.md エッジケース EC-03 より

      // 【検証項目】: デフォルト値での Role 作成確認
      // 🔵 信頼性: requirements.md より
      // Task Role が作成される
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      }); // 【確認内容】: Props 省略でも Task Role が作成される

      // secretsmanager:GetSecretValue の Resource が '*'
      // 【注意】: CDK は単一アクションを文字列として出力するため、文字列でマッチング
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: '*',
            }),
          ]),
        },
      }); // 【確認内容】: secretArns 未指定でデフォルト '*' が使用される
    });
  });

  // ============================================================================
  // TC-IAM-14: PowerUserAccess がアタッチされていないこと
  // 🔵 信頼性: セキュリティベストプラクティス、note.md セキュリティ考慮事項より
  // ============================================================================
  describe('TC-IAM-14: PowerUserAccess 不在確認', () => {
    // 【テスト目的】: PowerUserAccess ポリシーが誤ってアタッチされていないことを確認
    // 【テスト内容】: ManagedPolicyArns に PowerUserAccess が含まれないことを検証
    // 【期待される動作】: IAM 以外のほぼ全サービスへのアクセスを防止
    // 🔵 信頼性: セキュリティベストプラクティス、note.md より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('PowerUserAccess がアタッチされていないこと', () => {
      // 【テスト目的】: 過剰権限の排除確認
      // 【テスト内容】: ManagedPolicyArns を検証
      // 【期待される動作】: PowerUserAccess が含まれない
      // 🔵 信頼性: セキュリティベストプラクティスより

      // 【検証項目】: PowerUserAccess ポリシーの不在確認
      // 🔵 信頼性: セキュリティベストプラクティスより
      const roles = template.findResources('AWS::IAM::Role');
      Object.values(roles).forEach((role: any) => {
        const managedPolicyArns = role.Properties.ManagedPolicyArns || [];
        const hasPowerUser = managedPolicyArns.some((arn: any) => {
          if (typeof arn === 'string') {
            return arn.includes('PowerUserAccess');
          }
          if (arn['Fn::Join']) {
            const joinedArn = JSON.stringify(arn);
            return joinedArn.includes('PowerUserAccess');
          }
          return false;
        });
        expect(hasPowerUser).toBe(false); // 【確認内容】: PowerUserAccess がアタッチされていない
      });
    });
  });

  // ============================================================================
  // TC-IAM-15: IAMFullAccess がアタッチされていないこと
  // 🔵 信頼性: セキュリティベストプラクティスより
  // ============================================================================
  describe('TC-IAM-15: IAMFullAccess 不在確認', () => {
    // 【テスト目的】: IAMFullAccess ポリシーが誤ってアタッチされていないことを確認
    // 【テスト内容】: ManagedPolicyArns に IAMFullAccess が含まれないことを検証
    // 【期待される動作】: IAM 権限の不正な変更を防止、権限昇格攻撃を防止
    // 🔵 信頼性: セキュリティベストプラクティスより

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で IamRoleConstruct を作成
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);
    });

    test('IAMFullAccess がアタッチされていないこと', () => {
      // 【テスト目的】: 危険権限の排除確認
      // 【テスト内容】: ManagedPolicyArns を検証
      // 【期待される動作】: IAMFullAccess が含まれない
      // 🔵 信頼性: セキュリティベストプラクティスより

      // 【検証項目】: IAMFullAccess ポリシーの不在確認
      // 🔵 信頼性: セキュリティベストプラクティスより
      const roles = template.findResources('AWS::IAM::Role');
      Object.values(roles).forEach((role: any) => {
        const managedPolicyArns = role.Properties.ManagedPolicyArns || [];
        const hasIamFullAccess = managedPolicyArns.some((arn: any) => {
          if (typeof arn === 'string') {
            return arn.includes('IAMFullAccess');
          }
          if (arn['Fn::Join']) {
            const joinedArn = JSON.stringify(arn);
            return joinedArn.includes('IAMFullAccess');
          }
          return false;
        });
        expect(hasIamFullAccess).toBe(false); // 【確認内容】: IAMFullAccess がアタッチされていない
      });
    });
  });
});
