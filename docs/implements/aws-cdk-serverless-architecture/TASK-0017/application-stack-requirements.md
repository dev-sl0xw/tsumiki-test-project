# TASK-0017: Application Stack 統合 - TDD要件定義書

**タスクID**: TASK-0017
**機能名**: Application Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-01
**信頼性評価**: 🔵 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 何をする機能か 🔵

**信頼性**: 🔵 *TASK-0017.md・architecture.md より*

Application Stack は、ECS Fargate ベースのコンテナアプリケーション実行環境を提供する CDK Stack です。以下の4つの Construct を統合して、フロントエンド・バックエンドサービスを運用可能な状態にします：

1. **EcsClusterConstruct** - Fargate 専用 ECS クラスター
2. **TaskDefinitionConstruct** - App Container + Sidecar Container のマルチコンテナ構成（Frontend/Backend 各1つ）
3. **EcsServiceConstruct** - Fargate Service（Frontend/Backend 各1つ）
4. **AlbConstruct** - Internet-facing ALB（HTTPS 強制、TLS 終端）

### 1.2 どのような問題を解決するか 🔵

**信頼性**: 🔵 *user-stories.md・requirements.md より*

- **運用者**: コンテナベースのアプリケーションを高可用性かつセキュアに運用できる
- **開発者**: ECS Exec を使用したセキュアなデバッグ環境を利用できる
- **セキュリティ担当**: Sidecar パターンによる DB への安全な接続経路を確保できる

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **インフラエンジニア**: Stack のデプロイ・運用
- **開発者**: アプリケーションコンテナのデプロイ
- **SRE**: モニタリング・障害対応

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.md より*

```
VPC Stack → Security Stack → Database Stack → **Application Stack** → Distribution Stack → Ops Stack
```

- **前提 Stack**: VpcStack, SecurityStack, DatabaseStack
- **後続 Stack**: DistributionStack, OpsStack
- **責務**: ECS Cluster, Task Definition, Service, ALB の統合管理

### 参照したEARS要件

- REQ-012〜021（コンピューティング）
- REQ-028〜030（セキュリティ・ロードバランシング）

### 参照した設計文書

- `docs/design/aws-cdk-serverless-architecture/architecture.md` - CDK Stack 構成、Stack 依存関係
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0017.md` - タスク定義

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（ApplicationStackProps） 🔵

**信頼性**: 🔵 *interfaces.ts・architecture.md より*

```typescript
export interface ApplicationStackProps extends cdk.StackProps {
  // === VpcStack から ===
  /** VPC インスタンス */
  readonly vpc: ec2.IVpc;  // 必須

  // === SecurityStack から ===
  /** ECS タスク用セキュリティグループ */
  readonly ecsSecurityGroup: ec2.ISecurityGroup;  // 必須
  /** ALB 用セキュリティグループ */
  readonly albSecurityGroup: ec2.ISecurityGroup;  // 必須
  /** ECS タスクロール */
  readonly ecsTaskRole: iam.IRole;  // 必須
  /** ECS タスク実行ロール */
  readonly ecsTaskExecutionRole: iam.IRole;  // 必須

  // === DatabaseStack から ===
  /** Aurora エンドポイント */
  readonly dbEndpoint: string;  // 必須
  /** Aurora ポート番号 */
  readonly dbPort: number;  // 必須、デフォルト: 3306
  /** DB シークレット（Secrets Manager） */
  readonly dbSecret: secretsmanager.ISecret;  // 必須

  // === ECR リポジトリ ===
  /** アプリケーションコンテナの ECR リポジトリ ARN */
  readonly appRepositoryArn: string;  // 必須
  /** Sidecar コンテナの ECR リポジトリ ARN */
  readonly sidecarRepositoryArn: string;  // 必須

  // === ACM 証明書 ===
  /** SSL/TLS 証明書 ARN */
  readonly certificateArn: string;  // 必須

  // === 環境設定 ===
  /** 環境設定オブジェクト */
  readonly config: EnvironmentConfig;  // 必須
}
```

### 2.2 出力値（公開プロパティ） 🔵

**信頼性**: 🔵 *interfaces.ts・architecture.md より*

```typescript
// ECS Cluster
public readonly cluster: ecs.ICluster;

// Task Definitions
public readonly frontendTaskDefinition: ecs.FargateTaskDefinition;
public readonly backendTaskDefinition: ecs.FargateTaskDefinition;

// ECS Services
public readonly frontendService: ecs.FargateService;
public readonly backendService: ecs.FargateService;

// ALB
public readonly loadBalancer: elb.IApplicationLoadBalancer;
public readonly targetGroup: elb.IApplicationTargetGroup;
public readonly dnsName: string;
```

### 2.3 CloudFormation 出力 🔵

**信頼性**: 🔵 *TASK-0017.md・note.md より*

| 出力名 | 値 | Export名 |
|--------|-----|----------|
| AlbDnsName | ALB の DNS 名 | `${envName}-AlbDnsName` |
| AlbArn | ALB の ARN | `${envName}-AlbArn` |
| EcsClusterArn | ECS Cluster の ARN | `${envName}-EcsClusterArn` |
| FrontendServiceArn | Frontend Service の ARN | `${envName}-FrontendServiceArn` |
| BackendServiceArn | Backend Service の ARN | `${envName}-BackendServiceArn` |

### 2.4 データフロー 🔵

**信頼性**: 🔵 *dataflow.md・architecture.md より*

```
[User] → [CloudFront] → [ALB (HTTPS:443)]
                              ↓
                    [Frontend Service]
                              ↓
                    [Backend Service]
                              ↓
                    [Sidecar Container]
                              ↓
                    [Aurora MySQL]
```

### 参照したEARS要件

- REQ-012〜021（ECS 構成）
- REQ-028〜030（ALB 構成）

### 参照した設計文書

- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件 🔵

**信頼性**: 🔵 *requirements.md NFR-001〜004 より*

| 項目 | 要件 | 参照 |
|------|------|------|
| 可用性 | Multi-AZ 構成 | NFR-001 |
| レイテンシ | VPC Endpoint 経由通信 | NFR-002 |
| NAT 冗長性 | 各 AZ に NAT Gateway | NFR-003 |
| サービス冗長性 | Desired Count 2 以上 | NFR-004 |

### 3.2 セキュリティ要件 🔵

**信頼性**: 🔵 *requirements.md NFR-101〜105 より*

| 項目 | 要件 | 参照 |
|------|------|------|
| 通信経路 | VPC Endpoint 使用 | NFR-101 |
| データ暗号化 | Storage Encryption 有効 | NFR-102 |
| Web 保護 | WAF 適用（CloudFront） | NFR-103 |
| S3 保護 | OAC 使用 | NFR-104 |
| HTTPS | 強制（HTTP→HTTPS リダイレクト） | NFR-105 |

### 3.3 技術的制約 🔵

**信頼性**: 🔵 *requirements.md REQ-401〜405 より*

| 項目 | 制約内容 | 参照 |
|------|----------|------|
| IaC | AWS CDK v2 (TypeScript) | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | REQ-403 |
| ECS タスク | 0.5 vCPU / 1 GB Memory | REQ-014 |
| Desired Count | 2 以上 | REQ-020 |
| ECS Exec | 有効化必須 | REQ-019 |

### 3.4 アーキテクチャ制約 🔵

**信頼性**: 🔵 *architecture.md より*

| 項目 | 制約内容 |
|------|----------|
| Stack 依存関係 | VpcStack → SecurityStack → DatabaseStack → ApplicationStack |
| Construct 統合 | EcsClusterConstruct, TaskDefinitionConstruct, EcsServiceConstruct, AlbConstruct |
| サービス構成 | Frontend Service + Backend Service（別々の ECS Service） |
| コンテナ構成 | App Container + Sidecar Container（各 Task Definition） |

### 参照したEARS要件

- NFR-001〜004（パフォーマンス）
- NFR-101〜105（セキュリティ）
- REQ-401〜405（制約）
- REQ-012〜021（コンピューティング）

### 参照した設計文書

- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ制約
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 非機能要件

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *TASK-0017.md・architecture.md より*

#### パターン1: Stack のデプロイ

```typescript
// bin/app.ts
const vpcStack = new VpcStack(app, 'VpcStack', { config });
const securityStack = new SecurityStack(app, 'SecurityStack', {
  config,
  vpc: vpcStack.vpc,
});
const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  config,
  vpc: vpcStack.vpc,
  ecsSecurityGroup: securityStack.ecsSecurityGroup,
});

const applicationStack = new ApplicationStack(app, 'ApplicationStack', {
  config,
  vpc: vpcStack.vpc,
  ecsSecurityGroup: securityStack.ecsSecurityGroup,
  albSecurityGroup: securityStack.albSecurityGroup,
  ecsTaskRole: securityStack.ecsTaskRole,
  ecsTaskExecutionRole: securityStack.ecsTaskExecutionRole,
  dbEndpoint: databaseStack.dbEndpoint,
  dbPort: databaseStack.dbPort,
  dbSecret: databaseStack.dbSecret,
  appRepositoryArn: 'arn:aws:ecr:ap-northeast-1:123456789012:repository/app',
  sidecarRepositoryArn: 'arn:aws:ecr:ap-northeast-1:123456789012:repository/sidecar',
  certificateArn: 'arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx',
});

// 依存関係の明示
applicationStack.addDependency(vpcStack);
applicationStack.addDependency(securityStack);
applicationStack.addDependency(databaseStack);
```

#### パターン2: Stack 間の参照

```typescript
// Distribution Stack から Application Stack のプロパティを参照
const distributionStack = new DistributionStack(app, 'DistributionStack', {
  config,
  albDnsName: applicationStack.dnsName,
  loadBalancer: applicationStack.loadBalancer,
});
```

### 4.2 エッジケース 🟡

**信頼性**: 🟡 *requirements.md EDGE-001〜003 から妥当な推測*

| ケース | 対応 | 参照 |
|--------|------|------|
| ECS タスク失敗 | Service が自動で新タスクを起動 | EDGE-002 |
| ALB ヘルスチェック失敗 | Target Group からタスクを除外 | 推測 |
| コンテナ起動タイムアウト | Task Definition のタイムアウト設定 | 推測 |

### 4.3 エラーケース 🟡

**信頼性**: 🟡 *ECS/ALB 仕様から妥当な推測*

| ケース | 期待される動作 |
|--------|---------------|
| Props の必須パラメータ欠落 | CDK synth 時にエラー |
| 無効な ECR リポジトリ ARN | CloudFormation デプロイ時にエラー |
| 証明書 ARN が無効 | ALB リスナー作成時にエラー |
| Security Group が不正 | ECS Service 作成時にエラー |

### 参照したEARS要件

- EDGE-001〜003（エラー処理）
- REQ-012〜021（通常要件）

### 参照した設計文書

- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー 🔵

- US-004: ECS Fargate によるコンテナ実行
- US-005: ECS Exec による運用操作
- US-007: ALB による負荷分散

### 参照した機能要件 🔵

| 要件ID | 内容 | 対応実装 |
|--------|------|----------|
| REQ-012 | Fargate 専用 ECS クラスター | EcsClusterConstruct |
| REQ-013 | Container Insights 有効化 | EcsClusterConstruct |
| REQ-014 | 0.5 vCPU / 1GB Memory | TaskDefinitionConstruct |
| REQ-015 | Sidecar パターン | TaskDefinitionConstruct |
| REQ-016 | Sidecar 軽量イメージ | TaskDefinitionConstruct |
| REQ-017 | socat ポートフォワーディング | TaskDefinitionConstruct |
| REQ-018 | AmazonSSMManagedInstanceCore | SecurityStack (参照) |
| REQ-019 | ECS Exec 有効化 | EcsServiceConstruct |
| REQ-020 | Desired Count 2 以上 | EcsServiceConstruct |
| REQ-021 | Frontend/Backend 別 Service | ApplicationStack |
| REQ-028 | ALB Internet-facing | AlbConstruct |
| REQ-029 | HTTP→HTTPS リダイレクト | AlbConstruct |
| REQ-030 | ACM SSL 証明書 | AlbConstruct |

### 参照した非機能要件 🔵

| 要件ID | 内容 | 対応実装 |
|--------|------|----------|
| NFR-001 | Multi-AZ 高可用性 | Service の Subnet 配置 |
| NFR-004 | Desired Count 2 以上 | EcsServiceConstruct |
| NFR-105 | HTTPS 強制 | AlbConstruct |

### 参照したEdgeケース 🟡

| 要件ID | 内容 | 対応実装 |
|--------|------|----------|
| EDGE-002 | ECS タスク失敗時の自動起動 | ECS Service 標準動作 |

### 参照した受け入れ基準 🔵

- AC-012: ECS Cluster が作成されること
- AC-014: Task Definition が作成されること
- AC-019: ECS Service が作成されること
- AC-028: ALB が作成されること
- AC-スナップショット: CloudFormation テンプレートの一貫性

### 参照した設計文書 🔵

| 文書 | 該当セクション |
|------|---------------|
| architecture.md | CDK Stack 構成、Stack 依存関係、コンポーネント構成 |
| dataflow.md | リクエストフロー |
| interfaces.ts | ApplicationStackProps、EnvironmentConfig |
| note.md | 技術スタック、開発ルール |

---

## 6. テスト要件サマリー

### 6.1 Stack 作成テスト 🔵

**信頼性**: 🔵 *TASK-0017.md より*

- [ ] Application Stack が正常にシンセサイズされること
- [ ] 必要な全リソースが含まれていること

### 6.2 コンポーネント統合テスト 🔵

**信頼性**: 🔵 *REQ-012〜021, REQ-028〜030 より*

- [ ] ECS Cluster が作成されていること
- [ ] Container Insights が有効化されていること
- [ ] Frontend Task Definition が作成されていること
- [ ] Backend Task Definition が作成されていること
- [ ] Frontend Service が作成されていること
- [ ] Backend Service が作成されていること
- [ ] ALB が作成されていること
- [ ] HTTPS リスナーが設定されていること
- [ ] HTTP→HTTPS リダイレクトが設定されていること

### 6.3 依存関係テスト 🔵

**信頼性**: 🔵 *architecture.md より*

- [ ] Service が Cluster に依存していること
- [ ] Service が Task Definition に依存していること
- [ ] ALB Target Group が Service に接続されていること

### 6.4 スナップショットテスト 🔵

**信頼性**: 🔵 *TASK-0017.md より*

- [ ] CloudFormation テンプレートが期待通りに生成されること
- [ ] リグレッションが検出できること

### 6.5 セキュリティテスト 🔵

**信頼性**: 🔵 *requirements.md より*

- [ ] Security Group が適切に設定されていること
- [ ] IAM Role が最小権限の原則に従っていること

---

## 7. 実装ファイル一覧

### Stack 実装

| ファイルパス | 説明 |
|-------------|------|
| `infra/lib/stack/application-stack.ts` | Application Stack 本体 |

### テストファイル

| ファイルパス | 説明 |
|-------------|------|
| `infra/test/stack/application-stack.test.ts` | Application Stack テスト |

### 依存 Construct

| ファイルパス | 説明 |
|-------------|------|
| `infra/lib/construct/ecs/ecs-cluster-construct.ts` | ECS Cluster |
| `infra/lib/construct/ecs/task-definition-construct.ts` | Task Definition |
| `infra/lib/construct/ecs/ecs-service-construct.ts` | ECS Service |
| `infra/lib/construct/alb/alb-construct.ts` | ALB |

### 依存 Stack

| ファイルパス | 説明 |
|-------------|------|
| `infra/lib/stack/vpc-stack.ts` | VPC Stack |
| `infra/lib/stack/security-stack.ts` | Security Stack |
| `infra/lib/stack/database-stack.ts` | Database Stack |

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 32 | 91% | 要件定義書・設計文書より確認済み |
| 🟡 黄信号 | 3 | 9% | 妥当な推測 |
| 🔴 赤信号 | 0 | 0% | 推測なし |

**品質評価**: ✅ 高品質 - 要件の91%が要件定義書・設計文書により確認済み

---

## 次のステップ

テストケースの洗い出しを行います：

```
/tsumiki:tdd-testcases aws-cdk-serverless-architecture TASK-0017
```
