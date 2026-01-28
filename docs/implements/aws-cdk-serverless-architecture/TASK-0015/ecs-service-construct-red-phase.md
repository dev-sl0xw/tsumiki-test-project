# ECS Service Construct Red Phase 記録

**タスクID**: TASK-0015
**機能名**: ECS Service Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD Red Phase - 失敗するテストケースの作成
**作成日**: 2026-01-28

---

## 1. 作成したテストケース一覧

### 1.1 基本テスト（4件）🔵

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-01 | ECS Service リソース作成確認 | 🔵 |
| TC-SERVICE-02 | Launch Type 確認（FARGATE） | 🔵 |
| TC-SERVICE-03 | Desired Count 確認（デフォルト値 2） | 🔵 |
| TC-SERVICE-04 | ECS Exec 有効化確認（デフォルト true） | 🔵 |

### 1.2 デプロイメント設定テスト（2件）🟡

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-05 | Minimum Healthy Percent 確認（50%） | 🟡 |
| TC-SERVICE-06 | Maximum Percent 確認（200%） | 🟡 |

### 1.3 ネットワーク設定テスト（4件）🔵

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-07 | Network Configuration 確認 | 🔵 |
| TC-SERVICE-08 | Security Group 確認 | 🔵 |
| TC-SERVICE-09 | Subnets 確認 | 🔵 |
| TC-SERVICE-10 | Public IP 無効確認（DISABLED） | 🔵 |

### 1.4 ALB 連携テスト（3件）🟡

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-11 | Target Group 連携確認 | 🟡 |
| TC-SERVICE-12 | Container Name 確認（app） | 🟡 |
| TC-SERVICE-13 | Container Port 確認（3000） | 🟡 |

### 1.5 オプションパラメータテスト（4件）🟡

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-14 | カスタム Desired Count 確認 | 🟡 |
| TC-SERVICE-15 | ECS Exec 無効化確認 | 🟡 |
| TC-SERVICE-16 | カスタム Service 名確認 | 🟡 |
| TC-SERVICE-17 | カスタム Rolling Update 設定確認 | 🟡 |

### 1.6 公開プロパティテスト（1件）🔵

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-18 | service プロパティ確認 | 🔵 |

### 1.7 スナップショットテスト（1件）🔵

| テストID | テスト名 | 信頼性 |
|----------|----------|--------|
| TC-SERVICE-19 | CloudFormation テンプレートスナップショット確認 | 🔵 |

---

## 2. テストコード

### 2.1 テストファイル

**ファイルパス**: `infra/test/construct/ecs/ecs-service-construct.test.ts`

テストコードは上記ファイルに完全に実装済み。19件のテストケースを含む。

### 2.2 テスト構成

```
describe('EcsServiceConstruct')
├── beforeEach: VPC, Cluster, TaskDefinition, SecurityGroup のモックセットアップ
├── describe('正常系 - 基本機能')
│   ├── TC-SERVICE-01: ECS Service リソース作成確認
│   ├── TC-SERVICE-02: Launch Type 確認
│   ├── TC-SERVICE-03: Desired Count 確認（デフォルト値）
│   └── TC-SERVICE-04: ECS Exec 有効化確認
├── describe('デプロイメント設定')
│   ├── TC-SERVICE-05: Minimum Healthy Percent 確認
│   └── TC-SERVICE-06: Maximum Percent 確認
├── describe('ネットワーク設定')
│   ├── TC-SERVICE-07: Network Configuration 確認
│   ├── TC-SERVICE-08: Security Group 確認
│   ├── TC-SERVICE-09: Subnets 確認
│   └── TC-SERVICE-10: Public IP 無効確認
├── describe('ALB 連携')
│   ├── TC-SERVICE-11: Target Group 連携確認
│   ├── TC-SERVICE-12: Container Name 確認
│   └── TC-SERVICE-13: Container Port 確認
├── describe('オプションパラメータ')
│   ├── TC-SERVICE-14: カスタム Desired Count 確認
│   ├── TC-SERVICE-15: ECS Exec 無効化確認
│   ├── TC-SERVICE-16: カスタム Service 名確認
│   └── TC-SERVICE-17: カスタム Rolling Update 設定確認
├── describe('公開プロパティ')
│   └── TC-SERVICE-18: service プロパティ確認
└── describe('スナップショット')
    └── TC-SERVICE-19: CloudFormation テンプレートスナップショット確認
```

---

## 3. 期待される失敗

### 3.1 失敗の種類

**モジュール未発見エラー**

```
TS2307: Cannot find module '../../../lib/construct/ecs/ecs-service-construct' or its corresponding type declarations.
```

### 3.2 失敗の理由

- `EcsServiceConstruct` クラスがまだ実装されていない
- `infra/lib/construct/ecs/ecs-service-construct.ts` ファイルが存在しない

### 3.3 テスト実行結果

```
FAIL test/construct/ecs/ecs-service-construct.test.ts
  ● Test suite failed to run

    test/construct/ecs/ecs-service-construct.test.ts:38:37 - error TS2307:
    Cannot find module '../../../lib/construct/ecs/ecs-service-construct'
    or its corresponding type declarations.

    38 import { EcsServiceConstruct } from '../../../lib/construct/ecs/ecs-service-construct';
                                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Test Suites: 1 failed, 1 total
Tests:       0 total
```

---

## 4. Green フェーズで実装すべき内容

### 4.1 作成するファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/ecs/ecs-service-construct.ts` | EcsServiceConstruct クラス実装 |

### 4.2 実装すべき機能

#### 4.2.1 Props インターフェース

```typescript
export interface EcsServiceConstructProps {
  readonly cluster: ecs.ICluster;                              // 必須
  readonly taskDefinition: ecs.FargateTaskDefinition;          // 必須
  readonly securityGroup: ec2.ISecurityGroup;                  // 必須
  readonly subnets: ec2.SubnetSelection;                       // 必須
  readonly serviceName?: string;                               // オプション
  readonly desiredCount?: number;                              // デフォルト: 2
  readonly enableExecuteCommand?: boolean;                     // デフォルト: true
  readonly minimumHealthyPercent?: number;                     // デフォルト: 50
  readonly maximumPercent?: number;                            // デフォルト: 200
  readonly targetGroup?: elb.IApplicationTargetGroup;          // オプション
  readonly assignPublicIp?: boolean;                           // デフォルト: false
}
```

#### 4.2.2 クラス構造

```typescript
export class EcsServiceConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsServiceConstructProps) {
    // FargateService の作成
    // - LaunchType: FARGATE
    // - enableExecuteCommand: true (デフォルト)
    // - desiredCount: 2 (デフォルト)
    // - DeploymentConfiguration: minHealthy 50%, max 200%
    // - NetworkConfiguration: awsvpc, Private Subnet, Security Group
    // - targetGroup 指定時は LoadBalancers 設定
  }
}
```

#### 4.2.3 定数定義

```typescript
const DEFAULT_DESIRED_COUNT = 2;
const DEFAULT_ENABLE_EXECUTE_COMMAND = true;
const DEFAULT_MIN_HEALTHY_PERCENT = 50;
const DEFAULT_MAX_PERCENT = 200;
const DEFAULT_ASSIGN_PUBLIC_IP = false;
const APP_CONTAINER_NAME = 'app';
const DEFAULT_CONTAINER_PORT = 3000;
```

### 4.3 参照すべき既存実装

| ファイル | 参照ポイント |
|----------|-------------|
| `infra/lib/construct/ecs/ecs-cluster-construct.ts` | デフォルト値外出し、JSDoc パターン |
| `infra/lib/construct/ecs/task-definition-construct.ts` | Props パターン、出力プロパティ |

---

## 5. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 10 | 53% |
| 🟡 黄信号 | 9 | 47% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - テストケースの過半数が要件定義書・設計文書により確認済み

---

## 6. 次のステップ

Red フェーズ完了後、以下のコマンドで Green フェーズ（最小実装）を開始します：

```
/tsumiki:tdd-green
```
