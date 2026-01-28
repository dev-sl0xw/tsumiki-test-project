# ECS Service Construct テストケース定義書

**タスクID**: TASK-0015
**機能名**: ECS Service Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション
**作成日**: 2026-01-28

---

## 1. テストケース概要

### 1.1 テスト対象

- **対象ファイル**: `infra/lib/construct/ecs/ecs-service-construct.ts`
- **テストファイル**: `infra/test/construct/ecs/ecs-service-construct.test.ts`

### 1.2 テスト分類

| 分類 | テストケース数 | 説明 |
|------|---------------|------|
| 基本テスト | 4件 | Service、Launch Type、Desired Count、ECS Exec |
| デプロイメント設定 | 2件 | MinimumHealthyPercent、MaximumPercent |
| ネットワーク設定 | 4件 | Network Config、Security Group、Subnets、Public IP |
| ALB 連携 | 3件 | Target Group、Container Name、Container Port |
| オプションパラメータ | 4件 | カスタム設定 |
| 公開プロパティ | 1件 | service プロパティ |
| スナップショット | 1件 | CloudFormation テンプレート |
| **合計** | **19件** | |

---

## 2. テストケース詳細

### 2.1 基本テストケース

#### TC-SERVICE-01: ECS Service リソース作成確認 🔵

**信頼性**: 🔵 *REQ-019〜021 より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-01 |
| テスト名 | ECS Service リソース作成確認 |
| テスト目的 | EcsServiceConstruct がデフォルト設定で正常に ECS Service を作成することを確認 |
| 入力値 | cluster, taskDefinition, securityGroup, subnets（必須パラメータのみ） |
| 期待結果 | `AWS::ECS::Service` リソースが 1 つ作成される |
| 検証方法 | `template.resourceCountIs('AWS::ECS::Service', 1)` |
| 参照要件 | REQ-019, REQ-020, REQ-021 |

```typescript
// テストコード概要
template.resourceCountIs('AWS::ECS::Service', 1);
```

---

#### TC-SERVICE-02: Launch Type 確認 🔵

**信頼性**: 🔵 *Fargate 必須要件より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-02 |
| テスト名 | Launch Type 確認 |
| テスト目的 | ECS Service が Fargate Launch Type で作成されることを確認 |
| 入力値 | 必須パラメータのみ |
| 期待結果 | `LaunchType: 'FARGATE'` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { LaunchType: 'FARGATE' })` |
| 参照要件 | REQ-019（Fargate 前提） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  LaunchType: 'FARGATE',
});
```

---

#### TC-SERVICE-03: Desired Count 確認（デフォルト値）🔵

**信頼性**: 🔵 *REQ-020、NFR-004 より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-03 |
| テスト名 | Desired Count 確認（デフォルト値） |
| テスト目的 | desiredCount を指定しない場合、デフォルト値 2 が設定されることを確認 |
| 入力値 | desiredCount 指定なし |
| 期待結果 | `DesiredCount: 2` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { DesiredCount: 2 })` |
| 参照要件 | REQ-020（高可用性）, NFR-004 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  DesiredCount: 2,
});
```

---

#### TC-SERVICE-04: ECS Exec 有効化確認 🔵

**信頼性**: 🔵 *REQ-019 より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-04 |
| テスト名 | ECS Exec 有効化確認 |
| テスト目的 | enableExecuteCommand がデフォルトで true に設定されることを確認 |
| 入力値 | enableExecuteCommand 指定なし |
| 期待結果 | `EnableExecuteCommand: true` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { EnableExecuteCommand: true })` |
| 参照要件 | REQ-019（ECS Exec 有効化） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  EnableExecuteCommand: true,
});
```

---

### 2.2 デプロイメント設定テストケース

#### TC-SERVICE-05: Minimum Healthy Percent 確認 🟡

**信頼性**: 🟡 *設計文書から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-05 |
| テスト名 | Minimum Healthy Percent 確認 |
| テスト目的 | Rolling Update のデフォルト MinimumHealthyPercent が 50 に設定されることを確認 |
| 入力値 | minimumHealthyPercent 指定なし |
| 期待結果 | `DeploymentConfiguration.MinimumHealthyPercent: 50` が設定される |
| 検証方法 | `template.hasResourceProperties` で DeploymentConfiguration を検証 |
| 参照要件 | Rolling Update 設計 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  DeploymentConfiguration: Match.objectLike({
    MinimumHealthyPercent: 50,
  }),
});
```

---

#### TC-SERVICE-06: Maximum Percent 確認 🟡

**信頼性**: 🟡 *設計文書から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-06 |
| テスト名 | Maximum Percent 確認 |
| テスト目的 | Rolling Update のデフォルト MaximumPercent が 200 に設定されることを確認 |
| 入力値 | maximumPercent 指定なし |
| 期待結果 | `DeploymentConfiguration.MaximumPercent: 200` が設定される |
| 検証方法 | `template.hasResourceProperties` で DeploymentConfiguration を検証 |
| 参照要件 | Rolling Update 設計 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  DeploymentConfiguration: Match.objectLike({
    MaximumPercent: 200,
  }),
});
```

---

### 2.3 ネットワーク設定テストケース

#### TC-SERVICE-07: Network Configuration 確認 🔵

**信頼性**: 🔵 *architecture.md より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-07 |
| テスト名 | Network Configuration 確認 |
| テスト目的 | ECS Service に NetworkConfiguration が設定されることを確認 |
| 入力値 | securityGroup, subnets |
| 期待結果 | `NetworkConfiguration.AwsvpcConfiguration` が設定される |
| 検証方法 | `template.hasResourceProperties` で NetworkConfiguration を検証 |
| 参照要件 | NFR-101（セキュリティ要件） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  NetworkConfiguration: Match.objectLike({
    AwsvpcConfiguration: Match.anyValue(),
  }),
});
```

---

#### TC-SERVICE-08: Security Group 確認 🔵

**信頼性**: 🔵 *architecture.md より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-08 |
| テスト名 | Security Group 確認 |
| テスト目的 | 指定した Security Group が Service に関連付けられることを確認 |
| 入力値 | securityGroup |
| 期待結果 | `AwsvpcConfiguration.SecurityGroups` に Security Group ID が含まれる |
| 検証方法 | `template.hasResourceProperties` で SecurityGroups を検証 |
| 参照要件 | NFR-101（最小権限の原則） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  NetworkConfiguration: Match.objectLike({
    AwsvpcConfiguration: Match.objectLike({
      SecurityGroups: Match.anyValue(),
    }),
  }),
});
```

---

#### TC-SERVICE-09: Subnets 確認 🔵

**信頼性**: 🔵 *architecture.md より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-09 |
| テスト名 | Subnets 確認 |
| テスト目的 | 指定した Subnet が Service に関連付けられることを確認 |
| 入力値 | subnets |
| 期待結果 | `AwsvpcConfiguration.Subnets` に Subnet ID が含まれる |
| 検証方法 | `template.hasResourceProperties` で Subnets を検証 |
| 参照要件 | Private Subnet 配置要件 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  NetworkConfiguration: Match.objectLike({
    AwsvpcConfiguration: Match.objectLike({
      Subnets: Match.anyValue(),
    }),
  }),
});
```

---

#### TC-SERVICE-10: Public IP 無効確認 🔵

**信頼性**: 🔵 *architecture.md より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-10 |
| テスト名 | Public IP 無効確認 |
| テスト目的 | デフォルトで Public IP が割り当てられないことを確認 |
| 入力値 | assignPublicIp 指定なし |
| 期待結果 | `AssignPublicIp: 'DISABLED'` が設定される |
| 検証方法 | `template.hasResourceProperties` で AssignPublicIp を検証 |
| 参照要件 | セキュリティ要件（Private Subnet 配置） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  NetworkConfiguration: Match.objectLike({
    AwsvpcConfiguration: Match.objectLike({
      AssignPublicIp: 'DISABLED',
    }),
  }),
});
```

---

### 2.4 ALB 連携テストケース

#### TC-SERVICE-11: Target Group 連携確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-11 |
| テスト名 | Target Group 連携確認 |
| テスト目的 | targetGroup を指定した場合、LoadBalancers 設定が追加されることを確認 |
| 入力値 | targetGroup（ALB Target Group） |
| 期待結果 | `LoadBalancers` 配列に Target Group が含まれる |
| 検証方法 | `template.hasResourceProperties` で LoadBalancers を検証 |
| 参照要件 | ALB 連携要件 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  LoadBalancers: Match.arrayWith([
    Match.objectLike({
      TargetGroupArn: Match.anyValue(),
    }),
  ]),
});
```

---

#### TC-SERVICE-12: Container Name 確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-12 |
| テスト名 | Container Name 確認 |
| テスト目的 | LoadBalancers 設定で正しい Container Name が指定されることを確認 |
| 入力値 | targetGroup |
| 期待結果 | `ContainerName: 'app'` が設定される |
| 検証方法 | `template.hasResourceProperties` で ContainerName を検証 |
| 参照要件 | ALB → app Container 連携 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  LoadBalancers: Match.arrayWith([
    Match.objectLike({
      ContainerName: 'app',
    }),
  ]),
});
```

---

#### TC-SERVICE-13: Container Port 確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-13 |
| テスト名 | Container Port 確認 |
| テスト目的 | LoadBalancers 設定で正しい Container Port が指定されることを確認 |
| 入力値 | targetGroup |
| 期待結果 | `ContainerPort: 3000`（デフォルト）が設定される |
| 検証方法 | `template.hasResourceProperties` で ContainerPort を検証 |
| 参照要件 | ALB → app Container:3000 連携 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  LoadBalancers: Match.arrayWith([
    Match.objectLike({
      ContainerPort: 3000,
    }),
  ]),
});
```

---

### 2.5 オプションパラメータテストケース

#### TC-SERVICE-14: カスタム Desired Count 確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-14 |
| テスト名 | カスタム Desired Count 確認 |
| テスト目的 | desiredCount を指定した場合、その値が設定されることを確認 |
| 入力値 | desiredCount: 4 |
| 期待結果 | `DesiredCount: 4` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { DesiredCount: 4 })` |
| 参照要件 | カスタム設定対応 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  DesiredCount: 4,
});
```

---

#### TC-SERVICE-15: ECS Exec 無効化確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-15 |
| テスト名 | ECS Exec 無効化確認 |
| テスト目的 | enableExecuteCommand: false を指定した場合の動作確認 |
| 入力値 | enableExecuteCommand: false |
| 期待結果 | `EnableExecuteCommand: false` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { EnableExecuteCommand: false })` |
| 参照要件 | セキュリティ要件（必要に応じて無効化可能） |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  EnableExecuteCommand: false,
});
```

---

#### TC-SERVICE-16: カスタム Service 名確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-16 |
| テスト名 | カスタム Service 名確認 |
| テスト目的 | serviceName を指定した場合、その名前が設定されることを確認 |
| 入力値 | serviceName: 'my-backend-service' |
| 期待結果 | `ServiceName: 'my-backend-service'` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'my-backend-service' })` |
| 参照要件 | カスタム設定対応 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  ServiceName: 'my-backend-service',
});
```

---

#### TC-SERVICE-17: カスタム Rolling Update 設定確認 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-17 |
| テスト名 | カスタム Rolling Update 設定確認 |
| テスト目的 | minimumHealthyPercent と maximumPercent をカスタム値で指定した場合の動作確認 |
| 入力値 | minimumHealthyPercent: 100, maximumPercent: 150 |
| 期待結果 | 指定した値が DeploymentConfiguration に設定される |
| 検証方法 | `template.hasResourceProperties` で DeploymentConfiguration を検証 |
| 参照要件 | カスタムデプロイ設定対応 |

```typescript
// テストコード概要
template.hasResourceProperties('AWS::ECS::Service', {
  DeploymentConfiguration: Match.objectLike({
    MinimumHealthyPercent: 100,
    MaximumPercent: 150,
  }),
});
```

---

### 2.6 公開プロパティテストケース

#### TC-SERVICE-18: service プロパティ確認 🔵

**信頼性**: 🔵 *note.md より*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-18 |
| テスト名 | service プロパティ確認 |
| テスト目的 | 公開プロパティ service が正しく定義されていることを確認 |
| 入力値 | 必須パラメータのみ |
| 期待結果 | `construct.service` が undefined でないこと |
| 検証方法 | `expect(construct.service).toBeDefined()` |
| 参照要件 | 出力プロパティ定義 |

```typescript
// テストコード概要
const construct = new EcsServiceConstruct(stack, 'Service', { ... });
expect(construct.service).toBeDefined();
```

---

### 2.7 スナップショットテストケース

#### TC-SERVICE-19: CloudFormation テンプレートスナップショット確認 🔵

**信頼性**: 🔵 *品質保証のため*

| 項目 | 内容 |
|------|------|
| テストID | TC-SERVICE-19 |
| テスト名 | CloudFormation テンプレートスナップショット確認 |
| テスト目的 | 生成される CloudFormation テンプレートが期待通りであることを確認 |
| 入力値 | 固定の設定（cluster, taskDefinition, securityGroup, subnets） |
| 期待結果 | スナップショットと一致すること |
| 検証方法 | `expect(template.toJSON()).toMatchSnapshot()` |
| 参照要件 | 品質保証 |

```typescript
// テストコード概要
expect(template.toJSON()).toMatchSnapshot();
```

---

## 3. テスト実装パターン

### 3.1 テストファイル構成

```typescript
// infra/test/construct/ecs/ecs-service-construct.test.ts

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EcsServiceConstruct } from '../../../lib/construct/ecs/ecs-service-construct';

describe('EcsServiceConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let cluster: ecs.ICluster;
  let taskDefinition: ecs.FargateTaskDefinition;
  let securityGroup: ec2.ISecurityGroup;
  let subnets: ec2.SubnetSelection;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-northeast-1' },
    });
    // モックリソースのセットアップ
    vpc = ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: 'vpc-12345' });
    cluster = ecs.Cluster.fromClusterAttributes(stack, 'Cluster', {
      clusterName: 'test-cluster',
      vpc,
    });
    taskDefinition = new ecs.FargateTaskDefinition(stack, 'TaskDef');
    securityGroup = ec2.SecurityGroup.fromSecurityGroupId(stack, 'SG', 'sg-12345');
    subnets = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
  });

  // テストケース実装...
});
```

### 3.2 モックリソース設計

| モックリソース | 作成方法 | 用途 |
|---------------|---------|------|
| VPC | `Vpc.fromLookup` または VPC 作成 | Cluster, Subnets |
| Cluster | `Cluster.fromClusterAttributes` | Service の親クラスター |
| TaskDefinition | `new FargateTaskDefinition` | Service のタスク定義 |
| SecurityGroup | `SecurityGroup.fromSecurityGroupId` | Network 設定 |
| Subnets | `SubnetSelection` | Network 設定 |
| TargetGroup | `ApplicationTargetGroup` | ALB 連携テスト |

---

## 4. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 10 | 53% | EARS要件定義書・設計文書を参考にした確実なテスト |
| 🟡 黄信号 | 9 | 47% | EARS要件定義書・設計文書から妥当な推測によるテスト |
| 🔴 赤信号 | 0 | 0% | 推測によるテスト（なし） |

**品質評価**: ✅ 高品質 - テストケースの過半数が要件定義書・設計文書により確認済み

---

## 5. 実装優先順位

### 5.1 Phase 1: 基本機能（必須）

1. TC-SERVICE-01: ECS Service リソース作成確認 🔵
2. TC-SERVICE-02: Launch Type 確認 🔵
3. TC-SERVICE-03: Desired Count 確認（デフォルト値）🔵
4. TC-SERVICE-04: ECS Exec 有効化確認 🔵
5. TC-SERVICE-18: service プロパティ確認 🔵

### 5.2 Phase 2: ネットワーク設定

6. TC-SERVICE-07: Network Configuration 確認 🔵
7. TC-SERVICE-08: Security Group 確認 🔵
8. TC-SERVICE-09: Subnets 確認 🔵
9. TC-SERVICE-10: Public IP 無効確認 🔵

### 5.3 Phase 3: デプロイメント設定

10. TC-SERVICE-05: Minimum Healthy Percent 確認 🟡
11. TC-SERVICE-06: Maximum Percent 確認 🟡

### 5.4 Phase 4: ALB 連携

12. TC-SERVICE-11: Target Group 連携確認 🟡
13. TC-SERVICE-12: Container Name 確認 🟡
14. TC-SERVICE-13: Container Port 確認 🟡

### 5.5 Phase 5: オプションパラメータ

15. TC-SERVICE-14: カスタム Desired Count 確認 🟡
16. TC-SERVICE-15: ECS Exec 無効化確認 🟡
17. TC-SERVICE-16: カスタム Service 名確認 🟡
18. TC-SERVICE-17: カスタム Rolling Update 設定確認 🟡

### 5.6 Phase 6: スナップショット

19. TC-SERVICE-19: CloudFormation テンプレートスナップショット確認 🔵

---

## 6. 次のステップ

テストケース定義完了後、以下のコマンドで Red フェーズ（失敗するテスト作成）を開始します：

```
/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0015
```
