# TASK-0017: Application Stack 統合 - TDD開発ノート

**タスクID**: TASK-0017
**タスクタイプ**: TDD
**推定工数**: 6時間
**フェーズ**: Phase 3 - アプリケーション
**作成日**: 2026-02-01

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 技術 | バージョン | 用途 |
|------|-----------|------|
| AWS CDK | v2 | IaC フレームワーク |
| TypeScript | - | 開発言語 (REQ-401) |
| Jest | - | テストフレームワーク |
| ECS Fargate | - | コンテナ実行環境 (REQ-012) |
| ALB | - | ロードバランサー (REQ-028) |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture + Sidecar Pattern
- **Stack 構成**: 6つの CDK Stack に機能別分割
  - VPC Stack → Security Stack → Database Stack → **Application Stack** → Distribution Stack → Ops Stack
- **Application Stack 責務**: ECS Cluster, Task Definition, Service, ALB の統合

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 2. 開発ルール

### プロジェクト固有のルール

1. **TDD サイクル**: Red → Green → Refactor の順序で開発
2. **信頼性レベル表記**: 要件の確実性を 🔵🟡🔴 で表記
3. **コメント規約**: JSDoc 形式で詳細なコメントを記載
4. **テスト対応**: 各 Construct は対応するテストケースを持つ

### コーディング規約

- **ファイル構成**: `lib/stack/` に Stack、`lib/construct/` に Construct を配置
- **Props インターフェース**: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
- **定数定義**: ファイル上部に定数を定義し、デフォルト値を明示
- **インターフェース型**: IVpc, ISecurityGroup 等のインターフェース型を使用して柔軟性を確保

### 参照元

- `infra/lib/stack/vpc-stack.ts` (Stack 実装パターン)
- `infra/lib/stack/security-stack.ts` (Stack 実装パターン)
- `infra/lib/stack/database-stack.ts` (Stack 実装パターン)

---

## 3. 関連実装

### 依存 Construct（統合対象）

#### EcsClusterConstruct

- **ファイル**: `infra/lib/construct/ecs/ecs-cluster-construct.ts`
- **責務**: Fargate 専用 ECS クラスター作成 (REQ-012, REQ-013)
- **Props**: `vpc`, `clusterName?`, `containerInsights?`
- **公開プロパティ**: `cluster: ecs.ICluster`

#### TaskDefinitionConstruct

- **ファイル**: `infra/lib/construct/ecs/task-definition-construct.ts`
- **責務**: App Container + Sidecar Container のマルチコンテナ構成 (REQ-014~018)
- **Props**: `appRepository`, `sidecarRepository`, `logGroup`, `auroraEndpoint`, `auroraPort?`, `taskRole?`, `executionRole?`, `cpu?`, `memoryMiB?`, `appContainerPort?`, `appEnvironment?`, `sidecarMode?`
- **公開プロパティ**: `taskDefinition`, `appContainer`, `sidecarContainer`

#### EcsServiceConstruct

- **ファイル**: `infra/lib/construct/ecs/ecs-service-construct.ts`
- **責務**: Fargate Service 作成 (REQ-019~021)
- **Props**: `cluster`, `taskDefinition`, `securityGroup`, `subnets`, `serviceName?`, `desiredCount?`, `enableExecuteCommand?`, `targetGroup?`, `assignPublicIp?`, `containerPort?`
- **公開プロパティ**: `service: ecs.FargateService`

#### AlbConstruct

- **ファイル**: `infra/lib/construct/alb/alb-construct.ts`
- **責務**: Internet-facing ALB, HTTPS 強制, TLS 終端 (REQ-028~030)
- **Props**: `vpc`, `securityGroup`, `certificateArn`, `loadBalancerName?`, `targetPort?`, `healthCheckPath?`, `healthCheck?`, `enableHttpToHttpsRedirect?`, `internetFacing?`
- **公開プロパティ**: `loadBalancer`, `targetGroup`, `httpsListener`, `httpListener`, `dnsName`

### 依存 Stack

#### VpcStack

- **ファイル**: `infra/lib/stack/vpc-stack.ts`
- **提供プロパティ**: `vpc`, `publicSubnets`, `privateAppSubnets`, `privateDbSubnets`

#### SecurityStack

- **ファイル**: `infra/lib/stack/security-stack.ts`
- **提供プロパティ**: `albSecurityGroup`, `ecsSecurityGroup`, `auroraSecurityGroup`, `ecsTaskRole`, `ecsTaskExecutionRole`

#### DatabaseStack

- **ファイル**: `infra/lib/stack/database-stack.ts`
- **提供プロパティ**: `auroraCluster`, `dbSecret`, `dbEndpoint`, `dbPort`

### 参照パターン

既存 Stack (VpcStack, SecurityStack, DatabaseStack) の実装パターンを参考に Application Stack を実装する。

---

## 4. 設計文書

### アーキテクチャ・API仕様

#### Application Stack 構成

```
Application Stack
├── EcsClusterConstruct (ECS Cluster)
├── TaskDefinitionConstruct x 2 (Frontend, Backend)
│   ├── App Container
│   └── Sidecar Container
├── EcsServiceConstruct x 2 (Frontend, Backend)
└── AlbConstruct (ALB)
```

#### Stack Props インターフェース

```typescript
export interface ApplicationStackProps extends cdk.StackProps {
  // VpcStack から
  readonly vpc: ec2.IVpc;

  // SecurityStack から
  readonly ecsSecurityGroup: ec2.ISecurityGroup;
  readonly albSecurityGroup: ec2.ISecurityGroup;
  readonly ecsTaskRole: iam.IRole;
  readonly ecsTaskExecutionRole: iam.IRole;

  // DatabaseStack から
  readonly dbEndpoint: string;
  readonly dbPort: number;
  readonly dbSecret: secretsmanager.ISecret;

  // 環境設定
  readonly config: EnvironmentConfig;

  // ECR リポジトリ ARN
  readonly appRepositoryArn: string;
  readonly sidecarRepositoryArn: string;

  // ACM 証明書 ARN
  readonly certificateArn: string;
}
```

#### 公開プロパティ

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

### 環境別パラメータ

```typescript
// infra/parameter.ts
export interface EnvironmentConfig {
  envName: string;
  account: string;
  region: string;
  vpcCidr: string;
  taskCpu: number;        // 512 (0.5 vCPU)
  taskMemory: number;     // 1024 (1 GB)
  desiredCount: number;   // 2
  auroraMinCapacity: number;
  auroraMaxCapacity: number;
  logRetentionDays: number;
  slackWorkspaceId: string;
  slackChannelId: string;
}
```

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0017.md`
- `infra/parameter.ts`

---

## 5. テスト要件

### 必須テストケース

#### Stack 作成テスト

- [ ] Application Stack が正常にシンセサイズされること
- [ ] 必要なリソースがすべて含まれていること

#### コンポーネント統合テスト

- [ ] ECS Cluster が作成されていること (REQ-012)
- [ ] Container Insights が有効化されていること (REQ-013)
- [ ] Task Definition が作成されていること (REQ-014~018)
- [ ] Frontend/Backend Service が作成されていること (REQ-019~021)
- [ ] ALB が作成されていること (REQ-028~030)
- [ ] 各コンポーネントが正しく接続されていること

#### 依存関係テスト

- [ ] Service が Cluster に依存していること
- [ ] Service が Task Definition に依存していること
- [ ] ALB Target Group が Service に依存していること

#### スナップショットテスト

- [ ] CloudFormation テンプレートが期待通りに生成されること
- [ ] リグレッションが検出できること

#### セキュリティテスト

- [ ] セキュリティグループが適切に設定されていること
- [ ] IAM ロールが最小権限の原則に従っていること

### 参照元

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0017.md`
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`

---

## 6. 注意事項

### 技術的制約

| 項目 | 制約内容 | 参照元 |
|------|----------|--------|
| IaC | AWS CDK v2 (TypeScript) | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | REQ-403 |
| ECS タスク | 0.5 vCPU / 1 GB Memory | REQ-014 |
| Desired Count | 2 以上 | REQ-020 |
| ECS Exec | 有効化必須 | REQ-019 |

### セキュリティ要件

- **HTTPS 強制**: ALB で HTTP→HTTPS リダイレクト (REQ-029)
- **TLS 終端**: ACM 証明書使用 (REQ-030)
- **Security Group**: 最小権限の原則に基づくルール設定

### パフォーマンス要件

- **高可用性**: Multi-AZ 構成、Desired Count 2 以上 (NFR-001, NFR-004)
- **レイテンシ最適化**: VPC Endpoint 使用 (NFR-002)

### Stack 依存関係

```
VPC Stack → Security Stack → Database Stack → Application Stack
```

Application Stack は VpcStack, SecurityStack, DatabaseStack に依存するため、`addDependency()` で明示的に依存関係を設定すること。

### CfnOutput 生成

以下の値を CloudFormation Output として公開する:

- ALB DNS Name (`${envName}-AlbDnsName`)
- ALB ARN (`${envName}-AlbArn`)
- ECS Cluster ARN (`${envName}-EcsClusterArn`)
- Frontend Service ARN (`${envName}-FrontendServiceArn`)
- Backend Service ARN (`${envName}-BackendServiceArn`)

### 参照元

- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 7. 実装手順（TDD）

1. `/tsumiki:tdd-requirements TASK-0017` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース作成
3. `/tsumiki:tdd-red` - テスト実装（失敗）
4. `/tsumiki:tdd-green` - 最小実装
5. `/tsumiki:tdd-refactor` - リファクタリング
6. `/tsumiki:tdd-verify-complete` - 品質確認

---

## 8. 関連ファイル一覧

### 仕様書

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0017.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`
- `docs/spec/aws-cdk-serverless-architecture/user-stories.md`

### 設計書

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

### 実装ファイル（依存 Construct）

- `infra/lib/construct/ecs/ecs-cluster-construct.ts`
- `infra/lib/construct/ecs/task-definition-construct.ts`
- `infra/lib/construct/ecs/ecs-service-construct.ts`
- `infra/lib/construct/alb/alb-construct.ts`

### 実装ファイル（依存 Stack）

- `infra/lib/stack/vpc-stack.ts`
- `infra/lib/stack/security-stack.ts`
- `infra/lib/stack/database-stack.ts`

### テストファイル（依存 Construct）

- `infra/test/construct/ecs/ecs-cluster-construct.test.ts`
- `infra/test/construct/ecs/task-definition-construct.test.ts`
- `infra/test/construct/ecs/ecs-service-construct.test.ts`
- `infra/test/construct/alb/alb-construct.test.ts`

### 環境設定

- `infra/parameter.ts`

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 9 | 100% |
| 🟡 黄信号 | 0 | 0% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: 高品質 - 全ての実装項目が要件定義書・設計文書により確認済み

---

## 9. TDD 進捗状況

| フェーズ | ステータス | 完了日 | レポート |
|---------|----------|--------|----------|
| Requirements | ✅ 完了 | 2026-02-01 | `application-stack-requirements.md` |
| TestCases | ✅ 完了 | 2026-02-01 | `application-stack-testcases.md` |
| Red | ✅ 完了 | 2026-02-01 | `red-phase.md` |
| Green | ✅ 完了 | 2026-02-01 | `green-phase.md` |
| Refactor | ✅ 完了 | 2026-02-01 | `refactor-phase.md` |
| Verify | ⏳ 未実施 | - | - |

### Refactor Phase サマリー

**実施内容**:
- 型定義追加: `FargateCpuValue` 型
- 定数定義追加: `FRONTEND_CONTAINER_PORT`, `BACKEND_CONTAINER_PORT`, `HEALTH_CHECK_PATH`, `SIDECAR_MODE`
- マジックナンバー排除
- 重複コード削減

**テスト結果**: 50/50 通過

**次のステップ**: `/tsumiki:tdd-verify-complete aws-cdk-serverless-architecture TASK-0017`
