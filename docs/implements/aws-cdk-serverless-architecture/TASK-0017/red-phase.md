# TASK-0017: Application Stack 統合 - TDD Red Phase 完了レポート

**タスクID**: TASK-0017
**フェーズ**: TDD Red Phase
**実施日**: 2026-02-01
**ステータス**: ✅ 完了

---

## 1. Red Phase 概要

TDD Red フェーズでは、まだ実装されていない `ApplicationStack` に対する失敗するテストケースを作成しました。

### 作成したテストファイル

- **ファイルパス**: `infra/test/application-stack.test.ts`
- **テストケース数**: 36 テストケース（8 カテゴリ）

### テストカテゴリ

| カテゴリ | テストケース数 | 説明 |
|---------|---------------|------|
| TC-AS-01〜02 | 2 | スナップショットテスト |
| TC-AS-03〜08 | 6 | リソース存在確認テスト |
| TC-AS-09〜14 | 6 | コンポーネント統合テスト |
| TC-AS-15〜20 | 6 | 公開プロパティ確認テスト |
| TC-AS-21〜26 | 6 | CfnOutput 確認テスト |
| TC-AS-27〜30 | 4 | 依存関係テスト |
| TC-AS-31〜33 | 3 | セキュリティテスト |
| TC-AS-34〜36 | 3 | 異常系・境界値テスト |

---

## 2. テスト実行結果

```
FAIL test/application-stack.test.ts
  ● Test suite failed to run

    test/application-stack.test.ts:30:34 - error TS2307: Cannot find module '../lib/stack/application-stack' or its corresponding type declarations.

    30 import { ApplicationStack } from '../lib/stack/application-stack';

Test Suites: 1 failed, 1 total
Tests:       0 total
```

### 失敗の理由

テストは `ApplicationStack` クラスをインポートしようとしていますが、まだ実装ファイル（`lib/stack/application-stack.ts`）が存在しないため、TypeScript コンパイルエラーで失敗しています。

**これは TDD Red フェーズにおいて期待通りの動作です。**

---

## 3. テストで検証する主な要件

### 3.1 リソース作成要件

| 要件ID | 説明 | テストケース |
|--------|------|-------------|
| REQ-012 | ECS Cluster 作成 | TC-AS-03 |
| REQ-013 | Container Insights 有効化 | TC-AS-09 |
| REQ-014 | Task Definition CPU/Memory | TC-AS-04, TC-AS-10 |
| REQ-019 | ECS Exec 有効化 | TC-AS-12 |
| REQ-020 | Desired Count 2以上 | TC-AS-11 |
| REQ-028 | ALB Internet-facing | TC-AS-06, TC-AS-13 |
| REQ-029 | HTTP→HTTPS リダイレクト | TC-AS-14, TC-AS-31 |
| REQ-030 | ACM 証明書 TLS 終端 | TC-AS-32 |

### 3.2 公開プロパティ要件

| プロパティ | 型 | テストケース |
|-----------|-----|-------------|
| cluster | ICluster | TC-AS-15 |
| frontendTaskDefinition | FargateTaskDefinition | TC-AS-16 |
| backendTaskDefinition | FargateTaskDefinition | TC-AS-17 |
| frontendService | FargateService | TC-AS-18 |
| backendService | FargateService | TC-AS-19 |
| loadBalancer | IApplicationLoadBalancer | TC-AS-20 |
| dnsName | string | TC-AS-20 |

### 3.3 CfnOutput 要件

| Output 名 | Export 名 | テストケース |
|----------|----------|-------------|
| AlbDnsName | `${envName}-AlbDnsName` | TC-AS-21 |
| AlbArn | `${envName}-AlbArn` | TC-AS-22 |
| EcsClusterArn | `${envName}-EcsClusterArn` | TC-AS-23 |
| FrontendServiceArn | `${envName}-FrontendServiceArn` | TC-AS-24 |
| BackendServiceArn | `${envName}-BackendServiceArn` | TC-AS-25 |

---

## 4. テストヘルパー関数

テストファイルには以下のヘルパー関数が含まれています：

| 関数名 | 用途 |
|--------|------|
| `createTestVpc` | 3層サブネット構成の VPC を作成 |
| `createTestEcsSecurityGroup` | ECS 用 Security Group を作成 |
| `createTestAlbSecurityGroup` | ALB 用 Security Group を作成 |
| `createTestEcsTaskRole` | ECS Task Role を作成 |
| `createTestEcsTaskExecutionRole` | ECS Task Execution Role を作成 |
| `createTestEcrRepository` | ECR Repository を作成 |
| `createTestLogGroup` | CloudWatch Log Group を作成 |

---

## 5. ApplicationStackProps 要件（テストから推測）

テストファイルから、実装が必要な Props インターフェースは以下の通りです：

```typescript
interface ApplicationStackProps extends cdk.StackProps {
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

  // ECR リポジトリ
  readonly appRepository: ecr.IRepository;
  readonly sidecarRepository: ecr.IRepository;

  // CloudWatch Logs
  readonly logGroup: logs.ILogGroup;

  // ACM 証明書
  readonly certificateArn: string;

  // 環境設定
  readonly config: EnvironmentConfig;
}
```

---

## 6. 次のステップ（Green Phase）

Green フェーズでは、上記のテストをすべて通過する最小限の `ApplicationStack` 実装を行います：

1. `infra/lib/stack/application-stack.ts` ファイルを作成
2. `ApplicationStackProps` インターフェースを定義
3. 既存の Construct を統合:
   - EcsClusterConstruct
   - TaskDefinitionConstruct (Frontend + Backend)
   - EcsServiceConstruct (Frontend + Backend)
   - AlbConstruct
4. 公開プロパティを定義
5. CfnOutput を作成
6. テストを実行して全件通過を確認

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 33 | 92% |
| 🟡 黄信号 | 3 | 8% |
| 🔴 赤信号 | 0 | 0% |

---

## 8. 関連ファイル

| ファイルパス | 説明 |
|-------------|------|
| `infra/test/application-stack.test.ts` | テストファイル（Red Phase で作成） |
| `docs/implements/aws-cdk-serverless-architecture/TASK-0017/note.md` | 開発ノート |
| `docs/implements/aws-cdk-serverless-architecture/TASK-0017/application-stack-requirements.md` | 要件定義 |
| `docs/implements/aws-cdk-serverless-architecture/TASK-0017/application-stack-testcases.md` | テストケース定義 |

---

**Red Phase 完了**: 2026-02-01
**次フェーズ**: Green Phase（`/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0017`）
