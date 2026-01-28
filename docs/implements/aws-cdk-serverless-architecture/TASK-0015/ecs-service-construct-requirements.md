# ECS Service Construct 要件定義書

**タスクID**: TASK-0015
**機能名**: ECS Service Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション
**作成日**: 2026-01-28

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能概要 🔵

**信頼性**: 🔵 *REQ-019〜021、architecture.md より*

ECS Fargate Service Construct を実装します。Frontend と Backend の両サービスに対応し、enableExecuteCommand による ECS Exec 機能と Desired Count 2 による可用性確保を実現します。

### 1.2 解決する問題 🔵

**信頼性**: 🔵 *要件定義書・設計文書より*

- **運用性**: ECS Exec で Fargate コンテナに接続してデバッグ・トラブルシューティングが可能
- **高可用性**: Desired Count 2 以上で Multi-AZ 配置を実現
- **柔軟性**: Frontend/Backend を独立した Service として構成し、個別スケーリング・デプロイが可能
- **サービス間通信**: Service Connect によるサービスディスカバリと内部通信の最適化

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

- **インフラエンジニア**: CDK を使用して ECS Service を構築・管理する
- **アプリケーション開発者**: ECS Service 上でアプリケーションをデプロイ・運用する
- **運用エンジニア**: ECS Exec を使用してコンテナにアクセスし運用操作を行う

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.md より*

```
VPC Stack → Security Stack → Application Stack
                              ↓
                          ECS Cluster → Task Definition → Service
                                                          ↑
                                                          本 Construct
```

ECS Service は Application Stack に属し、Task Definition の上に構築され、ALB からのトラフィックを受け付けます。

**参照したEARS要件**: REQ-019, REQ-020, REQ-021
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - コンピューティング層セクション

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（Props） 🔵

**信頼性**: 🔵 *interfaces.ts、note.md より*

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|-----|------|------------|------|
| `cluster` | `ecs.ICluster` | ✅ | - | ECS Cluster |
| `taskDefinition` | `ecs.FargateTaskDefinition` | ✅ | - | Task Definition |
| `securityGroup` | `ec2.ISecurityGroup` | ✅ | - | Security Group |
| `subnets` | `ec2.SubnetSelection` | ✅ | - | Service を配置するサブネット |
| `serviceName` | `string` | ❌ | 自動生成 | Service 名 |
| `desiredCount` | `number` | ❌ | `2` | タスク数 |
| `enableExecuteCommand` | `boolean` | ❌ | `true` | ECS Exec 有効化 |
| `minimumHealthyPercent` | `number` | ❌ | `50` | Rolling Update 最小ヘルシー率 |
| `maximumPercent` | `number` | ❌ | `200` | Rolling Update 最大率 |
| `targetGroup` | `elb.IApplicationTargetGroup` | ❌ | - | ALB Target Group |
| `serviceConnectConfiguration` | `ecs.ServiceConnectProps` | ❌ | - | Service Connect 設定 |
| `circuitBreaker` | `ecs.DeploymentCircuitBreaker` | ❌ | - | Circuit Breaker 設定 |
| `assignPublicIp` | `boolean` | ❌ | `false` | Public IP 割り当て |

### 2.2 出力プロパティ 🔵

**信頼性**: 🔵 *note.md、既存実装パターンより*

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `service` | `ecs.FargateService` | 作成された ECS Service |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *dataflow.md、architecture.md より*

```
入力:
  - ECS Cluster (cluster)
  - Task Definition (taskDefinition)
  - Security Group (securityGroup)
  - Subnet Selection (subnets)
  - 設定オプション (desiredCount, enableExecuteCommand, etc.)
    ↓
EcsServiceConstruct
    ↓
出力:
  - FargateService (service)
```

### 2.4 データフロー 🔵

**信頼性**: 🔵 *dataflow.md より*

```
[ALB] ──→ [Target Group] ──→ [ECS Service] ──→ [Task Definition]
                                    │
                                    ├─ Desired Count: 2
                                    ├─ enableExecuteCommand: true
                                    ├─ Rolling Update: 50-200%
                                    └─ Network: Private Subnet + SG
```

**参照したEARS要件**: REQ-019, REQ-020, REQ-021
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - EcsServiceConfig, DeploymentConfig

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 ECS Exec 前提条件 🔵

**信頼性**: 🔵 *REQ-019、AWS ドキュメントより*

ECS Exec を有効化するには以下が必要：

| 前提条件 | 内容 |
|----------|------|
| Task Role | `AmazonSSMManagedInstanceCore` ポリシー付与 |
| VPC Endpoint | ssm, ssmmessages, ec2messages |
| Service 設定 | `enableExecuteCommand: true` |

### 3.2 Desired Count 制約 🔵

**信頼性**: 🔵 *REQ-020, NFR-004 より*

| 設定項目 | 制約 | 根拠 |
|----------|------|------|
| Desired Count | 2 以上 | 高可用性確保（REQ-020） |
| 最小値 | 1 | Fargate 制約 |
| デフォルト | 2 | Multi-AZ 配置（NFR-004） |

### 3.3 デプロイメント設定制約 🟡

**信頼性**: 🟡 *設計文書から妥当な推測*

| 設定項目 | デフォルト値 | 説明 |
|----------|-------------|------|
| minimumHealthyPercent | 50 | デプロイ中の最小タスク維持率 |
| maximumPercent | 200 | デプロイ中の最大タスク許可率 |
| デプロイ方式 | Rolling Update | ゼロダウンタイムデプロイ |

### 3.4 ネットワーク制約 🔵

**信頼性**: 🔵 *architecture.md より*

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| 配置サブネット | Private Subnet | セキュリティ要件 |
| Public IP | 無効 (false) | NAT Gateway 経由でインターネットアクセス |
| Network Mode | awsvpc | Fargate 必須 |

### 3.5 パフォーマンス要件 🔵

**信頼性**: 🔵 *NFR-001〜004 より*

- **高可用性**: Multi-AZ 構成で Desired Count 2 以上
- **自動復旧**: Fargate Service は異常タスクを自動的に置き換え
- **Rolling Update**: デプロイ中もサービス継続性を維持

### 3.6 セキュリティ要件 🔵

**信頼性**: 🔵 *NFR-101〜105、REQ-019 より*

- **最小権限**: Security Group は最小限のトラフィックのみ許可
- **ECS Exec セキュリティ**: IAM ポリシーで適切なアクセス制御
- **Private 配置**: インターネットから直接アクセス不可

**参照したEARS要件**: NFR-001〜004, NFR-101〜105, REQ-019, REQ-020, REQ-021
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - 技術的制約セクション

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *REQ-019〜021 より*

```typescript
// 基本的な使用例
const ecsService = new EcsServiceConstruct(this, 'Service', {
  cluster: ecsCluster.cluster,
  taskDefinition: taskDef.taskDefinition,
  securityGroup: sg.ecsSecurityGroup,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});
```

### 4.2 ALB 連携の使用例 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

```typescript
// ALB Target Group を指定する場合
const ecsService = new EcsServiceConstruct(this, 'Service', {
  cluster: ecsCluster.cluster,
  taskDefinition: taskDef.taskDefinition,
  securityGroup: sg.ecsSecurityGroup,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  targetGroup: alb.targetGroup,
});
```

### 4.3 カスタム設定の使用例 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

```typescript
// カスタム設定を指定する場合
const ecsService = new EcsServiceConstruct(this, 'Service', {
  cluster: ecsCluster.cluster,
  taskDefinition: taskDef.taskDefinition,
  securityGroup: sg.ecsSecurityGroup,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  serviceName: 'my-backend-service',
  desiredCount: 4,
  minimumHealthyPercent: 100,
  maximumPercent: 200,
  enableExecuteCommand: true,
});
```

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *CDK 動作特性から妥当な推測*

| エラー状況 | 期待される動作 |
|-----------|---------------|
| Cluster が存在しない | CDK Synth 時にエラー |
| Task Definition が無効 | デプロイ時にエラー |
| Security Group が無効 | デプロイ時にエラー |
| Subnet が不正 | デプロイ時にエラー |
| ECS Exec 前提条件不足 | ECS Exec 実行時にエラー |

**参照したEARS要件**: REQ-019, REQ-020, REQ-021
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **US-003**: 開発者として、ECS Fargate でコンテナアプリケーションを実行したい
- **US-004**: 運用者として、ECS Exec でコンテナにアクセスしたい
- **US-006**: 開発者として、ゼロダウンタイムデプロイを実現したい

### 5.2 参照した機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 要件内容 |
|--------|----------|
| REQ-019 | enableExecuteCommand: true を設定して ECS Exec を有効化 |
| REQ-020 | Service の Desired Count を 2 以上に設定 |
| REQ-021 | Frontend と Backend を別々の ECS Service として構成 |

### 5.3 参照した非機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 要件内容 |
|--------|----------|
| NFR-001 | Multi-AZ 構成により高可用性を維持 |
| NFR-004 | ECS Service の Desired Count 2 以上で可用性を確保 |
| NFR-101 | 最小権限の原則に基づく Security Group 設定 |
| NFR-302 | ECS Exec を有効化して運用操作を可能 |

### 5.4 参照したEdgeケース 🟡

**信頼性**: 🟡 *requirements.md から妥当な推測*

| 要件ID | 要件内容 |
|--------|----------|
| EDGE-002 | ECS タスクが失敗した場合、自動的に新しいタスクを起動 |
| EDGE-003 | Rolling Update 中のサービス継続性を確保 |

### 5.5 参照した設計文書 🔵

**信頼性**: 🔵 *設計文書より*

| 文書 | 該当セクション |
|------|---------------|
| **アーキテクチャ** | `docs/design/aws-cdk-serverless-architecture/architecture.md` - コンピューティング層 |
| **データフロー** | `docs/design/aws-cdk-serverless-architecture/dataflow.md` - ECS データフロー |
| **型定義** | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - EcsServiceConfig, DeploymentConfig |

### 5.6 参照した既存実装 🔵

**信頼性**: 🔵 *既存 Construct より*

| ファイル | 参照内容 |
|----------|----------|
| `infra/lib/construct/ecs/ecs-cluster-construct.ts` | デフォルト値外出し、JSDoc パターン |
| `infra/lib/construct/ecs/task-definition-construct.ts` | Task Definition 実装、IAM Role 設定 |
| `infra/lib/construct/security/security-group-construct.ts` | Security Group 実装パターン |

---

## 6. テスト要件概要

### 6.1 基本テストケース 🔵

**信頼性**: 🔵 *REQ-019〜021 より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-01 | ECS Service リソース作成確認 | AWS::ECS::Service が 1 つ作成される |
| TC-SERVICE-02 | Launch Type 確認 | LaunchType が FARGATE に設定される |
| TC-SERVICE-03 | Desired Count 確認（デフォルト値） | DesiredCount が 2 に設定される |
| TC-SERVICE-04 | ECS Exec 有効化確認 | EnableExecuteCommand が true に設定される |

### 6.2 デプロイメント設定テストケース 🟡

**信頼性**: 🟡 *設計文書から妥当な推測*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-05 | Minimum Healthy Percent 確認 | MinimumHealthyPercent が 50 に設定される |
| TC-SERVICE-06 | Maximum Percent 確認 | MaximumPercent が 200 に設定される |

### 6.3 ネットワーク設定テストケース 🔵

**信頼性**: 🔵 *architecture.md より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-07 | Network Configuration 確認 | NetworkConfiguration が設定される |
| TC-SERVICE-08 | Security Group 確認 | SecurityGroups が設定される |
| TC-SERVICE-09 | Subnets 確認 | Subnets が設定される |
| TC-SERVICE-10 | Public IP 無効確認 | AssignPublicIp が DISABLED |

### 6.4 ALB 連携テストケース 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-11 | Target Group 連携確認 | LoadBalancers が設定される |
| TC-SERVICE-12 | Container Name 確認 | 正しい Container Name が設定される |
| TC-SERVICE-13 | Container Port 確認 | 正しい Container Port が設定される |

### 6.5 オプションパラメータテストケース 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-14 | カスタム Desired Count 確認 | 指定した値が設定される |
| TC-SERVICE-15 | ECS Exec 無効化確認 | false 指定時に無効になる |
| TC-SERVICE-16 | カスタム Service 名確認 | 指定した名前が設定される |
| TC-SERVICE-17 | カスタム Rolling Update 設定確認 | 指定した値が設定される |

### 6.6 公開プロパティテストケース 🔵

**信頼性**: 🔵 *note.md より*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-18 | service プロパティ確認 | service プロパティが定義されている |

### 6.7 スナップショットテスト 🔵

**信頼性**: 🔵 *品質保証のため*

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-SERVICE-19 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

---

## 7. 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/ecs/ecs-service-construct.ts` | Construct 実装 |
| `infra/test/construct/ecs/ecs-service-construct.test.ts` | テストファイル |

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 32 | 80% | EARS要件定義書・設計文書を参考にした確実な要件 |
| 🟡 黄信号 | 8 | 20% | EARS要件定義書・設計文書から妥当な推測による要件 |
| 🔴 赤信号 | 0 | 0% | 推測による要件（なし） |

**品質評価**: ✅ 高品質 - 要件の大部分が要件定義書・設計文書により確認済み

---

## 9. 次のステップ

要件定義フェーズ完了後、以下のコマンドでテストケースの洗い出しを行います：

```
/tsumiki:tdd-testcases aws-cdk-serverless-architecture TASK-0015
```
