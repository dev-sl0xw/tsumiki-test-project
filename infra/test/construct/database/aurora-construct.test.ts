/**
 * Aurora Construct テスト
 *
 * TASK-0008: Aurora Construct 実装
 * フェーズ: TDD Refactor Phase - テストコード品質改善
 *
 * 【テスト概要】:
 * Aurora Serverless v2 MySQL クラスターを構築する CDK Construct のテスト。
 * 要件定義書 REQ-022〜027 に基づき、機能要件・非機能要件を検証する。
 *
 * 【テストケース分類】:
 * - TC-AU-01 〜 TC-AU-13: 正常系テストケース（コア機能、セキュリティ機能）
 * - TC-AU-14 〜 TC-AU-17: バリエーションテストケース（パラメータカスタマイズ）
 * - TC-AU-18 〜 TC-AU-20: エッジケーステストケース（境界値テスト）
 * - TC-AU-21 〜 TC-AU-24: 公開プロパティテストケース（API 検証）
 *
 * 【改善内容】:
 * - ヘルパー関数の共通化（createTestVpc, createTestSecurityGroup）
 * - 定数の抽出（テスト用アカウント、リージョン）
 * - JSDoc コメントの強化
 * - セクション区切りコメントの統一
 *
 * 🔵 信頼性: 要件定義書 REQ-022〜027 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuroraConstruct } from '../../../lib/construct/database/aurora-construct';

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

/**
 * 【テスト用環境名】
 * 🔵 信頼性: 一般的な開発環境名
 */
const TEST_ENV_NAME = 'dev';

// ============================================================================
// 【テストヘルパー関数】
// ============================================================================

/**
 * 【VPC 作成ヘルパー】: テスト用の VPC を作成
 *
 * 【設計方針】: Aurora Construct が必要とするサブネット構成を提供
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
 * 【Security Group 作成ヘルパー】: テスト用の Aurora Security Group を作成
 *
 * 【設計方針】: Aurora 用の Security Group をシミュレート
 * 【設定内容】: アウトバウンド無効化（データ漏洩防止）
 *
 * 🔵 信頼性: REQ-024、REQ-025 より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された Security Group
 */
function createTestSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc): ec2.ISecurityGroup {
  return new ec2.SecurityGroup(stack, 'TestAuroraSg', {
    vpc,
    description: 'Test Aurora Security Group',
    allowAllOutbound: false,
  });
}

describe('AuroraConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let auroraSg: ec2.ISecurityGroup;
  let auroraConstruct: AuroraConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App、Stack、VPC、Security Group を作成
    // 【初期条件設定】: テスト用の環境を構築
    // 🔵 信頼性: CDK テストのベストプラクティスより
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      },
    });

    // 【VPC 作成】: ヘルパー関数を使用して VPC を作成
    vpc = createTestVpc(stack);

    // 【Security Group 作成】: ヘルパー関数を使用して SG を作成
    auroraSg = createTestSecurityGroup(stack, vpc);
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // 正常系テストケース
  // ============================================================================
  describe('正常系テストケース', () => {
    // ========================================================================
    // TC-AU-01: Aurora Serverless v2 クラスターリソース作成確認
    // 🔵 信頼性: REQ-022、TASK-0008.md より
    // ========================================================================
    describe('TC-AU-01: Aurora Serverless v2 クラスターリソース作成確認', () => {
      // 【テスト目的】: AuroraConstruct インスタンス化時に AWS::RDS::DBCluster リソースが作成される
      // 【テスト内容】: デフォルト設定でインスタンス化し、DBCluster の存在を検証
      // 【期待される動作】: 1 つの Aurora クラスターが作成される
      // 🔵 信頼性: REQ-022、TASK-0008.md より

      beforeEach(() => {
        // 【テストデータ準備】: 最小必須パラメータで AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('AWS::RDS::DBCluster リソースが 1 つ作成されること', () => {
        // 【テスト目的】: Aurora クラスターリソースの存在確認
        // 【テスト内容】: CloudFormation テンプレートに DBCluster が含まれる
        // 【期待される動作】: 1 つの DBCluster リソースが作成される
        // 🔵 信頼性: REQ-022 より

        // 【検証項目】: DBCluster リソースの数
        // 🔵 信頼性: REQ-022 より
        template.resourceCountIs('AWS::RDS::DBCluster', 1); // 【確認内容】: Aurora クラスターが 1 つ作成される
      });
    });

    // ========================================================================
    // TC-AU-02: エンジンバージョン MySQL 8.0 確認
    // 🔵 信頼性: REQ-022、architecture.md より
    // ========================================================================
    describe('TC-AU-02: エンジンバージョン MySQL 8.0 確認', () => {
      // 【テスト目的】: DBCluster の Engine プロパティが Aurora MySQL である
      // 【テスト内容】: エンジンが aurora-mysql で MySQL 8.0 互換バージョン
      // 【期待される動作】: Engine が aurora-mysql でエンジンバージョンが 8.0 系
      // 🔵 信頼性: REQ-022、architecture.md より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('Engine が aurora-mysql であること', () => {
        // 【テスト目的】: エンジンタイプの確認
        // 【テスト内容】: Engine プロパティが aurora-mysql
        // 【期待される動作】: Aurora MySQL エンジンが使用される
        // 🔵 信頼性: REQ-022 より

        // 【検証項目】: Engine プロパティ
        // 🔵 信頼性: REQ-022 より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          Engine: 'aurora-mysql',
        }); // 【確認内容】: Aurora MySQL エンジンが使用されている
      });

      test('EngineVersion が MySQL 8.0 互換であること', () => {
        // 【テスト目的】: エンジンバージョンの確認
        // 【テスト内容】: EngineVersion が 8.0 系のバージョンである
        // 【期待される動作】: Aurora MySQL 3.x (MySQL 8.0 互換) が使用される
        // 🟡 信頼性: architecture.md からの妥当な推測

        // 【検証項目】: EngineVersion プロパティ
        // 🟡 信頼性: 妥当な推測
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          EngineVersion: Match.stringLikeRegexp('8\\.0.*'),
        }); // 【確認内容】: MySQL 8.0 互換バージョンが使用されている
      });
    });

    // ========================================================================
    // TC-AU-03: ACU 設定（デフォルト min=0.5, max=2）確認
    // 🔵 信頼性: architecture.md データベース層、REQ-022 より
    // ========================================================================
    describe('TC-AU-03: ACU 設定（デフォルト min=0.5, max=2）確認', () => {
      // 【テスト目的】: ServerlessV2ScalingConfiguration の MinCapacity/MaxCapacity が正しい
      // 【テスト内容】: デフォルト値での ACU 設定を検証
      // 【期待される動作】: MinCapacity=0.5, MaxCapacity=2 で設定される
      // 🔵 信頼性: architecture.md データベース層より

      beforeEach(() => {
        // 【テストデータ準備】: minCapacity/maxCapacity 未指定で AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('ServerlessV2ScalingConfiguration が設定されていること', () => {
        // 【テスト目的】: Serverless v2 スケーリング設定の存在確認
        // 【テスト内容】: ServerlessV2ScalingConfiguration プロパティが存在する
        // 【期待される動作】: スケーリング設定が適用される
        // 🔵 信頼性: REQ-022 より

        // 【検証項目】: ServerlessV2ScalingConfiguration の存在
        // 🔵 信頼性: REQ-022 より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: Match.objectLike({}),
        }); // 【確認内容】: Serverless v2 スケーリング設定が存在する
      });

      test('MinCapacity が 0.5 であること', () => {
        // 【テスト目的】: 最小 ACU の確認
        // 【テスト内容】: MinCapacity が 0.5 に設定されている
        // 【期待される動作】: コスト優先のデフォルト値が適用される
        // 🔵 信頼性: architecture.md より

        // 【検証項目】: MinCapacity の値
        // 🔵 信頼性: architecture.md データベース層より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MinCapacity: 0.5,
          },
        }); // 【確認内容】: MinCapacity が 0.5 ACU に設定されている
      });

      test('MaxCapacity が 2 であること', () => {
        // 【テスト目的】: 最大 ACU の確認
        // 【テスト内容】: MaxCapacity が 2 に設定されている
        // 【期待される動作】: コスト優先のデフォルト値が適用される
        // 🔵 信頼性: architecture.md より

        // 【検証項目】: MaxCapacity の値
        // 🔵 信頼性: architecture.md データベース層より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MaxCapacity: 2,
          },
        }); // 【確認内容】: MaxCapacity が 2 ACU に設定されている
      });
    });

    // ========================================================================
    // TC-AU-04: ストレージ暗号化有効確認
    // 🔵 信頼性: REQ-026、NFR-102 より
    // ========================================================================
    describe('TC-AU-04: ストレージ暗号化有効確認', () => {
      // 【テスト目的】: DBCluster の StorageEncrypted プロパティが true である
      // 【テスト内容】: ストレージ暗号化がデフォルトで有効であることを検証
      // 【期待される動作】: StorageEncrypted: true が設定される
      // 🔵 信頼性: REQ-026、NFR-102 より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('StorageEncrypted が true であること', () => {
        // 【テスト目的】: ストレージ暗号化の有効確認
        // 【テスト内容】: StorageEncrypted プロパティが true
        // 【期待される動作】: データが保存時に暗号化される
        // 🔵 信頼性: REQ-026 より

        // 【検証項目】: StorageEncrypted の値
        // 🔵 信頼性: REQ-026、NFR-102 より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          StorageEncrypted: true,
        }); // 【確認内容】: ストレージ暗号化が有効である
      });
    });

    // ========================================================================
    // TC-AU-05: KMS キー関連付け確認
    // 🟡 信頼性: REQ-026 からの妥当な推測
    // ========================================================================
    describe('TC-AU-05: KMS キー関連付け確認', () => {
      // 【テスト目的】: DBCluster の KmsKeyId プロパティが設定されている
      // 【テスト内容】: 暗号化に KMS キーが使用されていることを検証
      // 【期待される動作】: AWS マネージドまたはカスタマーマネージドキーで暗号化
      // 🟡 信頼性: REQ-026 からの妥当な推測

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('KmsKeyId が設定されていること', () => {
        // 【テスト目的】: 暗号化キーの関連付け確認
        // 【テスト内容】: KmsKeyId プロパティが存在する
        // 【期待される動作】: KMS キーでデータが暗号化される
        // 🟡 信頼性: REQ-026 からの妥当な推測

        // 【検証項目】: KmsKeyId の存在
        // 🟡 信頼性: REQ-026 からの推測
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          KmsKeyId: Match.anyValue(),
        }); // 【確認内容】: KMS キーが関連付けられている
      });
    });

    // ========================================================================
    // TC-AU-06: 自動バックアップ有効確認
    // 🔵 信頼性: REQ-027 より
    // ========================================================================
    describe('TC-AU-06: 自動バックアップ有効確認', () => {
      // 【テスト目的】: DBCluster の BackupRetentionPeriod が 1 以上である
      // 【テスト内容】: 自動バックアップがデフォルトで有効であることを検証
      // 【期待される動作】: BackupRetentionPeriod >= 1
      // 🔵 信頼性: REQ-027 より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('BackupRetentionPeriod が設定されていること', () => {
        // 【テスト目的】: 自動バックアップの有効確認
        // 【テスト内容】: BackupRetentionPeriod プロパティが存在する
        // 【期待される動作】: 自動バックアップが有効になる
        // 🔵 信頼性: REQ-027 より

        // 【検証項目】: BackupRetentionPeriod の存在
        // 🔵 信頼性: REQ-027 より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          BackupRetentionPeriod: Match.anyValue(),
        }); // 【確認内容】: バックアップ保持期間が設定されている
      });
    });

    // ========================================================================
    // TC-AU-07: バックアップ保持期間 7 日間確認
    // 🟡 信頼性: architecture.md（7日）より妥当な推測
    // ========================================================================
    describe('TC-AU-07: バックアップ保持期間 7 日間確認', () => {
      // 【テスト目的】: DBCluster の BackupRetentionPeriod が 7 である
      // 【テスト内容】: デフォルトバックアップ保持期間が 7 日であることを検証
      // 【期待される動作】: BackupRetentionPeriod: 7
      // 🟡 信頼性: architecture.md（7日）より妥当な推測

      beforeEach(() => {
        // 【テストデータ準備】: backupRetentionDays 未指定で AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('BackupRetentionPeriod が 7 であること', () => {
        // 【テスト目的】: デフォルトバックアップ保持期間の確認
        // 【テスト内容】: BackupRetentionPeriod が 7 に設定されている
        // 【期待される動作】: バックアップが 7 日間保持される
        // 🟡 信頼性: architecture.md より妥当な推測

        // 【検証項目】: BackupRetentionPeriod の値
        // 🟡 信頼性: architecture.md（7日）より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          BackupRetentionPeriod: 7,
        }); // 【確認内容】: バックアップ保持期間が 7 日間である
      });
    });

    // ========================================================================
    // TC-AU-08: Security Group 関連付け確認
    // 🔵 信頼性: REQ-024, REQ-025、TASK-0008.md より
    // ========================================================================
    describe('TC-AU-08: Security Group 関連付け確認', () => {
      // 【テスト目的】: DBCluster の VpcSecurityGroupIds に Props で渡した SG が含まれる
      // 【テスト内容】: Security Group が正しく関連付けられることを検証
      // 【期待される動作】: Aurora 用 Security Group が設定される
      // 🔵 信頼性: REQ-024, REQ-025 より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('VpcSecurityGroupIds が設定されていること', () => {
        // 【テスト目的】: Security Group 関連付けの確認
        // 【テスト内容】: VpcSecurityGroupIds プロパティが存在する
        // 【期待される動作】: Security Group がクラスターに関連付けられる
        // 🔵 信頼性: REQ-024, REQ-025 より

        // 【検証項目】: VpcSecurityGroupIds の存在
        // 🔵 信頼性: REQ-024, REQ-025 より
        // Note: Match.anyValue() は arrayWith() 内でネストできないため、配列の存在と長さを検証
        const clusters = template.findResources('AWS::RDS::DBCluster');
        const clusterValues = Object.values(clusters);
        expect(clusterValues.length).toBe(1); // 🔵 DBCluster が 1 つ存在する
        const vpcSecurityGroupIds = clusterValues[0].Properties.VpcSecurityGroupIds;
        expect(vpcSecurityGroupIds).toBeDefined(); // 🔵 VpcSecurityGroupIds が存在する
        expect(Array.isArray(vpcSecurityGroupIds)).toBe(true); // 🔵 配列である
        expect(vpcSecurityGroupIds.length).toBeGreaterThan(0); // 【確認内容】: Security Group が関連付けられている
      });
    });

    // ========================================================================
    // TC-AU-09: Private Isolated Subnet 配置確認
    // 🔵 信頼性: REQ-023、architecture.md より
    // ========================================================================
    describe('TC-AU-09: Private Isolated Subnet 配置確認', () => {
      // 【テスト目的】: DBCluster が Private Isolated Subnet に配置される
      // 【テスト内容】: DB サブネットグループが適切に設定されることを検証
      // 【期待される動作】: DBSubnetGroupName が設定される
      // 🔵 信頼性: REQ-023 より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('AWS::RDS::DBSubnetGroup が作成されること', () => {
        // 【テスト目的】: DBSubnetGroup リソースの存在確認
        // 【テスト内容】: DBSubnetGroup が作成される
        // 【期待される動作】: Aurora 用のサブネットグループが作成される
        // 🔵 信頼性: REQ-023 より

        // 【検証項目】: DBSubnetGroup リソースの存在
        // 🔵 信頼性: REQ-023 より
        template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1); // 【確認内容】: DBSubnetGroup が 1 つ作成される
      });

      test('DBSubnetGroup に SubnetIds が設定されていること', () => {
        // 【テスト目的】: サブネット設定の確認
        // 【テスト内容】: SubnetIds が配列で設定されている
        // 【期待される動作】: 複数のサブネットがグループに含まれる
        // 🔵 信頼性: REQ-023 より

        // 【検証項目】: SubnetIds の存在
        // 🔵 信頼性: REQ-023 より
        // Note: Match.anyValue() は arrayWith() 内でネストできないため、配列の存在と長さを検証
        const subnetGroups = template.findResources('AWS::RDS::DBSubnetGroup');
        const subnetGroupValues = Object.values(subnetGroups);
        expect(subnetGroupValues.length).toBeGreaterThan(0); // 🔵 DBSubnetGroup が存在する
        const subnetIds = subnetGroupValues[0].Properties.SubnetIds;
        expect(subnetIds).toBeDefined(); // 🔵 SubnetIds が存在する
        expect(Array.isArray(subnetIds)).toBe(true); // 🔵 配列である
        expect(subnetIds.length).toBeGreaterThan(0); // 【確認内容】: サブネット ID が設定されている
      });
    });

    // ========================================================================
    // TC-AU-10: Secrets Manager シークレット作成確認
    // 🔵 信頼性: note.md CDK 実装制約、BLEA datastore.ts より
    // ========================================================================
    describe('TC-AU-10: Secrets Manager シークレット作成確認', () => {
      // 【テスト目的】: AWS::SecretsManager::Secret リソースが作成される
      // 【テスト内容】: DB 認証情報が Secrets Manager で自動管理されることを検証
      // 【期待される動作】: Secret リソースが作成される
      // 🔵 信頼性: note.md CDK 実装制約より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('AWS::SecretsManager::Secret が作成されること', () => {
        // 【テスト目的】: Secrets Manager シークレットの存在確認
        // 【テスト内容】: Secret リソースが作成される
        // 【期待される動作】: DB 認証情報が安全に管理される
        // 🔵 信頼性: note.md CDK 実装制約より

        // 【検証項目】: Secret リソースの存在
        // 🔵 信頼性: note.md より
        template.resourceCountIs('AWS::SecretsManager::Secret', 1); // 【確認内容】: Secrets Manager シークレットが 1 つ作成される
      });
    });

    // ========================================================================
    // TC-AU-11: クラスターエンドポイント公開確認
    // 🔵 信頼性: dataflow.md、requirements.md 出力プロパティより
    // ========================================================================
    describe('TC-AU-11: クラスターエンドポイント公開確認', () => {
      // 【テスト目的】: AuroraConstruct の clusterEndpoint プロパティが定義されている
      // 【テスト内容】: Writer エンドポイントが後続リソースから参照可能
      // 【期待される動作】: clusterEndpoint が定義される
      // 🔵 信頼性: dataflow.md より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('clusterEndpoint プロパティが定義されていること', () => {
        // 【テスト目的】: エンドポイントプロパティの存在確認
        // 【テスト内容】: clusterEndpoint が undefined でない
        // 【期待される動作】: 接続先エンドポイントが取得可能
        // 🔵 信頼性: dataflow.md より

        // 【検証項目】: clusterEndpoint の存在
        // 🔵 信頼性: dataflow.md、requirements.md より
        expect(auroraConstruct.clusterEndpoint).toBeDefined(); // 【確認内容】: clusterEndpoint プロパティが定義されている
      });

      test('clusterEndpoint.hostname が定義されていること', () => {
        // 【テスト目的】: ホスト名の存在確認
        // 【テスト内容】: hostname が undefined でない
        // 【期待される動作】: 接続先ホスト名が取得可能
        // 🔵 信頼性: dataflow.md より

        // 【検証項目】: hostname の存在
        // 🔵 信頼性: dataflow.md より
        expect(auroraConstruct.clusterEndpoint.hostname).toBeDefined(); // 【確認内容】: hostname が定義されている
      });
    });

    // ========================================================================
    // TC-AU-12: パブリックアクセス無効確認
    // 🔵 信頼性: REQ-024, REQ-404 より
    // ========================================================================
    describe('TC-AU-12: パブリックアクセス無効確認', () => {
      // 【テスト目的】: DBCluster が PubliclyAccessible: false である
      // 【テスト内容】: インターネットからの直接アクセスが不可能であることを検証
      // 【期待される動作】: パブリックアクセスが無効
      // 🔵 信頼性: REQ-024, REQ-404 より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('DBInstance が PubliclyAccessible: false であること', () => {
        // 【テスト目的】: パブリックアクセス無効の確認
        // 【テスト内容】: Writer インスタンスがパブリックアクセス不可
        // 【期待される動作】: 外部からの直接接続が不可能
        // 🔵 信頼性: REQ-024, REQ-404 より

        // 【検証項目】: PubliclyAccessible の値
        // 🔵 信頼性: REQ-024, REQ-404 より
        // Aurora の場合、DBInstance に PubliclyAccessible が設定される
        template.hasResourceProperties('AWS::RDS::DBInstance', {
          PubliclyAccessible: false,
        }); // 【確認内容】: パブリックアクセスが無効である
      });
    });

    // ========================================================================
    // TC-AU-13: マルチ AZ 構成確認
    // 🔵 信頼性: architecture.md、VPC Construct 実装より
    // ========================================================================
    describe('TC-AU-13: マルチ AZ 構成確認', () => {
      // 【テスト目的】: DBSubnetGroup が複数の AZ にまたがるサブネットを含む
      // 【テスト内容】: 高可用性のためのマルチ AZ 配置が実現されることを検証
      // 【期待される動作】: 2 つ以上の AZ のサブネットが含まれる
      // 🔵 信頼性: architecture.md より

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('DBSubnetGroup に複数のサブネットが含まれること', () => {
        // 【テスト目的】: マルチ AZ 構成の確認
        // 【テスト内容】: SubnetIds に複数のサブネットが含まれる
        // 【期待される動作】: 2 つ以上の AZ にサブネットが配置される
        // 🔵 信頼性: architecture.md より

        // 【検証項目】: SubnetIds の要素数
        // 🔵 信頼性: architecture.md、VPC Construct より
        const subnetGroups = template.findResources('AWS::RDS::DBSubnetGroup');
        const subnetGroupValues = Object.values(subnetGroups);
        expect(subnetGroupValues.length).toBeGreaterThan(0); // 🔵 DBSubnetGroup が存在する

        // SubnetIds が 2 つ以上のサブネットを含むことを確認
        subnetGroupValues.forEach((sg: any) => {
          const subnetIds = sg.Properties.SubnetIds;
          expect(subnetIds.length).toBeGreaterThanOrEqual(2); // 【確認内容】: 複数のサブネットが含まれる（マルチ AZ）
        });
      });
    });
  });

  // ============================================================================
  // バリエーションテストケース
  // ============================================================================
  describe('バリエーションテストケース', () => {
    // ========================================================================
    // TC-AU-14: カスタム ACU 設定反映確認
    // 🟡 信頼性: requirements.md Props 定義からの妥当な推測
    // ========================================================================
    describe('TC-AU-14: カスタム ACU 設定反映確認', () => {
      // 【テスト目的】: Props で指定した minCapacity/maxCapacity が適用される
      // 【テスト内容】: カスタム ACU 値でクラスターが作成されることを検証
      // 【期待される動作】: 指定した ACU 範囲が設定される
      // 🟡 信頼性: requirements.md Props 定義からの妥当な推測

      beforeEach(() => {
        // 【テストデータ準備】: カスタム ACU 値を指定して AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
          minCapacity: 1,
          maxCapacity: 4,
        });
        template = Template.fromStack(stack);
      });

      test('カスタム MinCapacity が反映されること', () => {
        // 【テスト目的】: カスタム最小 ACU の反映確認
        // 【テスト内容】: MinCapacity が指定値に設定される
        // 【期待される動作】: MinCapacity: 1 が設定される
        // 🟡 信頼性: requirements.md Props 定義より

        // 【検証項目】: MinCapacity の値
        // 🟡 信頼性: requirements.md より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MinCapacity: 1,
          },
        }); // 【確認内容】: カスタム MinCapacity が反映されている
      });

      test('カスタム MaxCapacity が反映されること', () => {
        // 【テスト目的】: カスタム最大 ACU の反映確認
        // 【テスト内容】: MaxCapacity が指定値に設定される
        // 【期待される動作】: MaxCapacity: 4 が設定される
        // 🟡 信頼性: requirements.md Props 定義より

        // 【検証項目】: MaxCapacity の値
        // 🟡 信頼性: requirements.md より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MaxCapacity: 4,
          },
        }); // 【確認内容】: カスタム MaxCapacity が反映されている
      });
    });

    // ========================================================================
    // TC-AU-15: カスタムデータベース名設定確認
    // 🟡 信頼性: requirements.md Props 定義からの妥当な推測
    // ========================================================================
    describe('TC-AU-15: カスタムデータベース名設定確認', () => {
      // 【テスト目的】: Props で指定した databaseName が適用される
      // 【テスト内容】: カスタムデータベース名でクラスターが作成されることを検証
      // 【期待される動作】: 指定したデータベース名が設定される
      // 🟡 信頼性: requirements.md Props 定義からの妥当な推測

      beforeEach(() => {
        // 【テストデータ準備】: カスタムデータベース名を指定して AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
          databaseName: 'customdb',
        });
        template = Template.fromStack(stack);
      });

      test('カスタム DatabaseName が反映されること', () => {
        // 【テスト目的】: カスタムデータベース名の反映確認
        // 【テスト内容】: DatabaseName が指定値に設定される
        // 【期待される動作】: DatabaseName: 'customdb' が設定される
        // 🟡 信頼性: requirements.md Props 定義より

        // 【検証項目】: DatabaseName の値
        // 🟡 信頼性: requirements.md より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          DatabaseName: 'customdb',
        }); // 【確認内容】: カスタム DatabaseName が反映されている
      });
    });

    // ========================================================================
    // TC-AU-16: カスタムバックアップ保持期間設定確認
    // 🟡 信頼性: requirements.md Props 定義からの妥当な推測
    // ========================================================================
    describe('TC-AU-16: カスタムバックアップ保持期間設定確認', () => {
      // 【テスト目的】: Props で指定した backupRetentionDays が適用される
      // 【テスト内容】: カスタムバックアップ保持期間でクラスターが作成されることを検証
      // 【期待される動作】: 指定した保持期間が設定される
      // 🟡 信頼性: requirements.md Props 定義からの妥当な推測

      beforeEach(() => {
        // 【テストデータ準備】: カスタムバックアップ保持期間を指定して AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
          backupRetentionDays: 14,
        });
        template = Template.fromStack(stack);
      });

      test('カスタム BackupRetentionPeriod が反映されること', () => {
        // 【テスト目的】: カスタムバックアップ保持期間の反映確認
        // 【テスト内容】: BackupRetentionPeriod が指定値に設定される
        // 【期待される動作】: BackupRetentionPeriod: 14 が設定される
        // 🟡 信頼性: requirements.md Props 定義より

        // 【検証項目】: BackupRetentionPeriod の値
        // 🟡 信頼性: requirements.md より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          BackupRetentionPeriod: 14,
        }); // 【確認内容】: カスタム BackupRetentionPeriod が反映されている
      });
    });

    // ========================================================================
    // TC-AU-17: デフォルト値動作確認
    // 🔵 信頼性: requirements.md Props 定義より
    // ========================================================================
    describe('TC-AU-17: デフォルト値動作確認', () => {
      // 【テスト目的】: オプションパラメータ未指定時にデフォルト値が適用される
      // 【テスト内容】: 最小必須パラメータのみでの動作を検証
      // 【期待される動作】: requirements.md で定義されたデフォルト値が適用される
      // 🔵 信頼性: requirements.md Props 定義より

      beforeEach(() => {
        // 【テストデータ準備】: 最小必須パラメータのみで AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('デフォルト databaseName が appdb であること', () => {
        // 【テスト目的】: デフォルトデータベース名の確認
        // 【テスト内容】: DatabaseName がデフォルト値に設定される
        // 【期待される動作】: DatabaseName: 'appdb' が設定される
        // 🟡 信頼性: interfaces.ts から妥当な推測（'appdb'）

        // 【検証項目】: DatabaseName のデフォルト値
        // 🟡 信頼性: interfaces.ts より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          DatabaseName: 'appdb',
        }); // 【確認内容】: デフォルト DatabaseName が 'appdb' である
      });
    });
  });

  // ============================================================================
  // エッジケーステストケース
  // ============================================================================
  describe('エッジケーステストケース', () => {
    // ========================================================================
    // TC-AU-18: 最小 ACU 値（0.5）動作確認
    // 🟡 信頼性: note.md Aurora Serverless v2 制約からの妥当な推測
    // 【注意】: AWS CDK では serverlessV2MaxCapacity >= 1 の制約があるため、
    //          maxCapacity は最小でも 1 以上に設定する必要がある
    // ========================================================================
    describe('TC-AU-18: 最小 ACU 値（0.5）動作確認', () => {
      // 【テスト目的】: minCapacity: 0.5 が正常に設定される
      // 【テスト内容】: Aurora Serverless v2 の最小 ACU での動作を検証
      // 【期待される動作】: 0.5 ACU で正常に動作する
      // 🟡 信頼性: note.md Aurora Serverless v2 制約からの妥当な推測
      // 【CDK 制約】: serverlessV2MaxCapacity は 1 以上である必要があるため、
      //              maxCapacity は 1 に設定して minCapacity: 0.5 の動作を検証

      beforeEach(() => {
        // 【テストデータ準備】: 最小 ACU 値を指定して AuroraConstruct を作成
        // 【CDK 制約対応】: maxCapacity は 1 以上である必要があるため 1 を設定
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
          minCapacity: 0.5,
          maxCapacity: 1,
        });
        template = Template.fromStack(stack);
      });

      test('MinCapacity が 0.5 で設定されること', () => {
        // 【テスト目的】: 最小 ACU 値の動作確認
        // 【テスト内容】: minCapacity: 0.5 で正常にクラスターが作成される
        // 【期待される動作】: MinCapacity: 0.5 が設定される
        // 🟡 信頼性: note.md Aurora Serverless v2 制約より

        // 【検証項目】: 最小 ACU 値の設定
        // 🟡 信頼性: note.md より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MinCapacity: 0.5,
            MaxCapacity: 1,
          },
        }); // 【確認内容】: 最小 ACU 値（0.5）で設定されている
      });
    });

    // ========================================================================
    // TC-AU-19: 同一 ACU 値（min=max）動作確認
    // 🟡 信頼性: Aurora Serverless v2 仕様からの妥当な推測
    // ========================================================================
    describe('TC-AU-19: 同一 ACU 値（min=max）動作確認', () => {
      // 【テスト目的】: minCapacity と maxCapacity が同じ値で正常に設定される
      // 【テスト内容】: 固定キャパシティでクラスターが作成されることを検証
      // 【期待される動作】: スケーリングなし（固定キャパシティ）で動作する
      // 🟡 信頼性: Aurora Serverless v2 仕様からの妥当な推測

      beforeEach(() => {
        // 【テストデータ準備】: 同一 ACU 値を指定して AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
          minCapacity: 2,
          maxCapacity: 2,
        });
        template = Template.fromStack(stack);
      });

      test('MinCapacity と MaxCapacity が同じ値で設定されること', () => {
        // 【テスト目的】: 固定キャパシティの動作確認
        // 【テスト内容】: min=max で正常にクラスターが作成される
        // 【期待される動作】: MinCapacity: 2, MaxCapacity: 2
        // 🟡 信頼性: Aurora Serverless v2 仕様より

        // 【検証項目】: 同一 ACU 値の設定
        // 🟡 信頼性: Aurora Serverless v2 仕様より
        template.hasResourceProperties('AWS::RDS::DBCluster', {
          ServerlessV2ScalingConfiguration: {
            MinCapacity: 2,
            MaxCapacity: 2,
          },
        }); // 【確認内容】: 固定キャパシティ（min=max=2）で設定されている
      });
    });

    // ========================================================================
    // TC-AU-20: 長い環境名でのリソース名生成確認
    // 🔴 信頼性: 要件定義書にない推測（実装時に検討が必要）
    // ========================================================================
    describe('TC-AU-20: 長い環境名でのリソース名生成確認', () => {
      // 【テスト目的】: envName が長い場合でもリソースが正常に作成される
      // 【テスト内容】: 長い環境名での境界テスト
      // 【期待される動作】: リソースが正常に作成される（CloudFormation 制限内）
      // 🔴 信頼性: 要件定義書にない推測

      beforeEach(() => {
        // 【テストデータ準備】: 長い環境名を指定して AuroraConstruct を作成
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: 'very-long-environment-name-for-testing-purposes',
        });
        template = Template.fromStack(stack);
      });

      test('長い環境名でもリソースが作成されること', () => {
        // 【テスト目的】: 堅牢性の確認
        // 【テスト内容】: 長い環境名でリソースが作成される
        // 【期待される動作】: CloudFormation 制限を超えない範囲でリソース作成
        // 🔴 信頼性: 要件定義書にない推測

        // 【検証項目】: リソースの存在
        // 🔴 信頼性: 実装時に検討が必要
        template.resourceCountIs('AWS::RDS::DBCluster', 1); // 【確認内容】: 長い環境名でもクラスターが作成される
      });
    });
  });

  // ============================================================================
  // 公開プロパティテストケース
  // ============================================================================
  describe('公開プロパティテストケース', () => {
    // ========================================================================
    // TC-AU-21: cluster プロパティ存在確認
    // 🔵 信頼性: requirements.md 出力プロパティより
    // ========================================================================
    describe('TC-AU-21: cluster プロパティ存在確認', () => {
      // 【テスト目的】: AuroraConstruct.cluster が DatabaseCluster 型で定義される
      // 【テスト内容】: 公開プロパティの存在を検証
      // 【期待される動作】: cluster プロパティが定義される
      // 🔵 信頼性: requirements.md 出力プロパティより

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('cluster プロパティが定義されていること', () => {
        // 【テスト目的】: cluster プロパティの存在確認
        // 【テスト内容】: プロパティが undefined でない
        // 【期待される動作】: cluster が定義される
        // 🔵 信頼性: requirements.md 出力プロパティより

        // 【検証項目】: cluster プロパティの存在
        // 🔵 信頼性: requirements.md より
        expect(auroraConstruct.cluster).toBeDefined(); // 【確認内容】: cluster プロパティが定義されている
      });
    });

    // ========================================================================
    // TC-AU-22: clusterEndpoint プロパティ存在確認
    // 🔵 信頼性: requirements.md 出力プロパティより
    // ========================================================================
    describe('TC-AU-22: clusterEndpoint プロパティ存在確認', () => {
      // 【テスト目的】: AuroraConstruct.clusterEndpoint が Endpoint 型で定義される
      // 【テスト内容】: 公開プロパティの存在を検証
      // 【期待される動作】: clusterEndpoint プロパティが定義される
      // 🔵 信頼性: requirements.md 出力プロパティより

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('clusterEndpoint プロパティが定義されていること', () => {
        // 【テスト目的】: clusterEndpoint プロパティの存在確認
        // 【テスト内容】: プロパティが undefined でない
        // 【期待される動作】: clusterEndpoint が定義される
        // 🔵 信頼性: requirements.md 出力プロパティより

        // 【検証項目】: clusterEndpoint プロパティの存在
        // 🔵 信頼性: requirements.md より
        expect(auroraConstruct.clusterEndpoint).toBeDefined(); // 【確認内容】: clusterEndpoint プロパティが定義されている
      });
    });

    // ========================================================================
    // TC-AU-23: secret プロパティ存在確認
    // 🔵 信頼性: requirements.md 出力プロパティより
    // ========================================================================
    describe('TC-AU-23: secret プロパティ存在確認', () => {
      // 【テスト目的】: AuroraConstruct.secret が ISecret 型で定義される
      // 【テスト内容】: 公開プロパティの存在を検証
      // 【期待される動作】: secret プロパティが定義される
      // 🔵 信頼性: requirements.md 出力プロパティより

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('secret プロパティが定義されていること', () => {
        // 【テスト目的】: secret プロパティの存在確認
        // 【テスト内容】: プロパティが undefined でない
        // 【期待される動作】: secret が定義される
        // 🔵 信頼性: requirements.md 出力プロパティより

        // 【検証項目】: secret プロパティの存在
        // 🔵 信頼性: requirements.md より
        expect(auroraConstruct.secret).toBeDefined(); // 【確認内容】: secret プロパティが定義されている
      });
    });

    // ========================================================================
    // TC-AU-24: securityGroup プロパティ存在確認
    // 🔵 信頼性: requirements.md 出力プロパティより
    // ========================================================================
    describe('TC-AU-24: securityGroup プロパティ存在確認', () => {
      // 【テスト目的】: AuroraConstruct.securityGroup が ISecurityGroup 型で定義される
      // 【テスト内容】: 公開プロパティの存在を検証
      // 【期待される動作】: securityGroup プロパティが定義される
      // 🔵 信頼性: requirements.md 出力プロパティより

      beforeEach(() => {
        auroraConstruct = new AuroraConstruct(stack, 'TestAurora', {
          vpc,
          securityGroup: auroraSg,
          envName: TEST_ENV_NAME,
        });
        template = Template.fromStack(stack);
      });

      test('securityGroup プロパティが定義されていること', () => {
        // 【テスト目的】: securityGroup プロパティの存在確認
        // 【テスト内容】: プロパティが undefined でない
        // 【期待される動作】: securityGroup が定義される
        // 🔵 信頼性: requirements.md 出力プロパティより

        // 【検証項目】: securityGroup プロパティの存在
        // 🔵 信頼性: requirements.md より
        expect(auroraConstruct.securityGroup).toBeDefined(); // 【確認内容】: securityGroup プロパティが定義されている
      });
    });
  });
});
