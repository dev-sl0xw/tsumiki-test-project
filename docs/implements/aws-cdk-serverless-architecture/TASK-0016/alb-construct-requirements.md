# ALB Construct 要件定義書

**タスクID**: TASK-0016
**機能名**: ALB Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-31
**フェーズ**: Phase 3 - アプリケーション

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 何をする機能か 🔵

Application Load Balancer (ALB) Construct は、Internet-facing の ALB を作成し、外部からのトラフィックを ECS Service にルーティングする機能を提供します。

**主要機能**:
- Internet-facing ALB の作成（Public Subnet に配置）
- HTTP → HTTPS リダイレクト設定
- ACM 証明書による TLS 終端
- Target Group を介した ECS Service への負荷分散
- ヘルスチェックによる異常タスクの自動切り離し

### 1.2 どのような問題を解決するか 🔵

- **セキュリティ**: HTTPS 強制により通信の暗号化を保証
- **可用性**: Multi-AZ 配置による高可用性の実現
- **スケーラビリティ**: 複数 ECS タスクへの負荷分散
- **運用性**: ヘルスチェックによる異常検知と自動切り離し

### 1.3 想定されるユーザー 🔵

- AWS インフラエンジニア
- DevOps エンジニア
- CDK を使用してインフラ構築を行う開発者

### 1.4 システム内での位置づけ 🔵

```
VPC Stack → Security Stack → Application Stack
                              ↓
                          ECS Cluster → Task Definition → Service
                              ↓                            ↑
                             ALB ←────────────────────────┘
                              ↑
                          CloudFront (Distribution Stack)
                              本 Construct
```

ALB は Application Stack 内で ECS Service の前段に位置し、CloudFront からのトラフィックを受け取り ECS Service に転送します。

**参照したEARS要件**: REQ-028, REQ-029, REQ-030
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（Props）

#### 必須パラメータ 🔵

| パラメータ名 | 型 | 説明 | 根拠 |
|-------------|-----|------|------|
| `vpc` | `ec2.IVpc` | ALB を配置する VPC | REQ-028 |
| `securityGroup` | `ec2.ISecurityGroup` | ALB 用 Security Group | TASK-0005 |
| `certificateArn` | `string` | ACM 証明書の ARN | REQ-030 |

#### オプションパラメータ 🟡

| パラメータ名 | 型 | デフォルト値 | 説明 |
|-------------|-----|-------------|------|
| `loadBalancerName` | `string` | 自動生成 | ALB のリソース名 |
| `targetPort` | `number` | `80` | Target Group のポート |
| `healthCheckPath` | `string` | `'/health'` | ヘルスチェックパス |
| `healthCheck.healthyThresholdCount` | `number` | `2` | ヘルシー閾値 |
| `healthCheck.unhealthyThresholdCount` | `number` | `2` | アンヘルシー閾値 |
| `healthCheck.timeout` | `number` | `5` | タイムアウト（秒） |
| `healthCheck.interval` | `number` | `30` | インターバル（秒） |
| `enableHttpToHttpsRedirect` | `boolean` | `true` | HTTP→HTTPS リダイレクト |
| `internetFacing` | `boolean` | `true` | Internet-facing 設定 |

### 2.2 出力プロパティ 🔵

| プロパティ名 | 型 | 説明 |
|-------------|-----|------|
| `loadBalancer` | `elb.IApplicationLoadBalancer` | 作成された ALB |
| `targetGroup` | `elb.IApplicationTargetGroup` | Target Group（ECS Service 連携用） |
| `httpsListener` | `elb.IApplicationListener` | HTTPS Listener |
| `httpListener` | `elb.IApplicationListener` | HTTP Listener（リダイレクト用） |
| `dnsName` | `string` | ALB の DNS 名 |

### 2.3 入出力の関係性 🔵

```typescript
// 入力: Props
const albConstruct = new AlbConstruct(this, 'Alb', {
  vpc: vpcConstruct.vpc,
  securityGroup: securityGroupConstruct.albSecurityGroup,
  certificateArn: 'arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx',
  healthCheckPath: '/health',
});

// 出力: 公開プロパティ
const alb = albConstruct.loadBalancer;        // ALB
const targetGroup = albConstruct.targetGroup; // ECS Service に渡す
const dnsName = albConstruct.dnsName;         // CloudFront Origin に使用
```

### 2.4 データフロー 🔵

```
Internet
    ↓
ALB (Internet-facing, Public Subnet)
    ↓ HTTP(80)
    ├── リダイレクト → HTTPS(443)
    ↓ HTTPS(443)
    ├── TLS 終端 (ACM Certificate)
    ↓
Target Group
    ↓
ECS Service (Private App Subnet)
```

**参照したEARS要件**: REQ-028, REQ-029, REQ-030
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts` (`AlbConfig`, `HealthCheckConfig`)

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 技術的制約 🔵

| 制約 | 内容 | 根拠 |
|------|------|------|
| リージョン | ap-northeast-1 (Tokyo) | REQ-403 |
| ACM 証明書 | ALB と同じリージョンに存在すること | AWS 制約 |
| Subnet | Public Subnet への配置が必須 | REQ-028 |
| AZ | 最低 2 つの AZ にまたがる Subnet が必要 | REQ-002 |

### 3.2 セキュリティ要件 🔵

| 要件 | 内容 | 根拠 |
|------|------|------|
| HTTPS 強制 | HTTP リクエストは HTTPS にリダイレクト | REQ-029, NFR-105 |
| TLS ポリシー | TLS 1.2 以上を使用 | NFR-105 |
| Security Group | 事前作成された ALB Security Group を使用 | TASK-0005 |

### 3.3 パフォーマンス要件 🟡

| 要件 | 内容 | 根拠 |
|------|------|------|
| Multi-AZ | 高可用性のため Multi-AZ 配置 | NFR-001 |
| ヘルスチェック | 異常タスクの自動切り離し | 設計文書 |

### 3.4 アーキテクチャ制約 🔵

- **依存リソース**:
  - VPC Construct (TASK-0002) - Public Subnet 提供
  - Security Group Construct (TASK-0005) - ALB Security Group 提供
  - ECS Service Construct (TASK-0015) - Target Group 連携

- **後続リソース**:
  - Application Stack (TASK-0017) - Stack 統合
  - CloudFront Construct (TASK-0019) - Origin として使用

**参照したEARS要件**: REQ-002, REQ-028, REQ-029, REQ-030, REQ-403, NFR-001, NFR-105
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

```typescript
// Application Stack 内での使用
import { AlbConstruct } from '../construct/alb/alb-construct';

const albConstruct = new AlbConstruct(this, 'Alb', {
  vpc: props.vpc,
  securityGroup: props.albSecurityGroup,
  certificateArn: props.certificateArn,
});

// ECS Service との連携
const ecsServiceConstruct = new EcsServiceConstruct(this, 'EcsService', {
  cluster: ecsCluster,
  taskDefinition: taskDefinition,
  targetGroup: albConstruct.targetGroup,  // ALB Target Group を渡す
});

// CloudFront Origin として使用
const cloudFrontOrigin = new origins.HttpOrigin(albConstruct.dnsName);
```

### 4.2 カスタム設定の使用パターン 🟡

```typescript
const albConstruct = new AlbConstruct(this, 'Alb', {
  vpc: props.vpc,
  securityGroup: props.albSecurityGroup,
  certificateArn: props.certificateArn,
  loadBalancerName: 'my-custom-alb',
  targetPort: 3000,  // カスタムポート
  healthCheckPath: '/api/health',
  healthCheck: {
    healthyThresholdCount: 3,
    unhealthyThresholdCount: 5,
    timeout: 10,
    interval: 60,
  },
});
```

### 4.3 エッジケース 🟡

| ケース | 動作 | 根拠 |
|--------|------|------|
| ACM 証明書が無効 | CloudFormation エラー | AWS 制約 |
| Security Group が未設定 | 必須パラメータエラー | 設計方針 |
| Target Group にターゲットなし | ヘルスチェック失敗 | AWS 動作 |

### 4.4 エラーケース 🟡

| エラー | 原因 | 対処 |
|--------|------|------|
| Certificate not found | 証明書 ARN が不正 | 正しい ARN を指定 |
| Subnet not found | Public Subnet が存在しない | VPC Stack を先にデプロイ |
| Security Group not found | SG が存在しない | Security Stack を先にデプロイ |

**参照したEARS要件**: EDGE-002
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

- US-003: 高可用性アーキテクチャ（Multi-AZ 構成）
- US-004: セキュリティ強化（HTTPS 強制、WAF）

### 5.2 参照した機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| REQ-028 | ALB を Public Subnet に配置、Internet-facing | ALB 作成設定 |
| REQ-029 | HTTP→HTTPS リダイレクト | HTTP Listener 設定 |
| REQ-030 | ACM で SSL 証明書管理 | HTTPS Listener 設定 |

### 5.3 参照した非機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| NFR-001 | Multi-AZ 構成による高可用性 | Public Subnet 配置 |
| NFR-105 | HTTPS 強制 | HTTP→HTTPS リダイレクト |

### 5.4 参照したEdgeケース 🟡

| ケースID | 内容 | 対応 |
|----------|------|------|
| EDGE-002 | ECS タスク失敗時の自動起動 | ヘルスチェック設定 |

### 5.5 参照した設計文書 🔵

| 文書 | 該当セクション |
|------|----------------|
| **アーキテクチャ** | `architecture.md` - Application Stack セクション |
| **データフロー** | `dataflow.md` - ALB → ECS フロー |
| **型定義** | `interfaces.ts` - `AlbConfig`, `HealthCheckConfig` |

---

## 6. 実装ファイル 🔵

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/alb/alb-construct.ts` | Construct 実装 |
| `infra/test/construct/alb/alb-construct.test.ts` | テストファイル |

---

## 7. 定数設計 🔵🟡

### 7.1 ポート番号定数 🔵

```typescript
const PORT_HTTP = 80;      // REQ-029
const PORT_HTTPS = 443;    // REQ-028
```

### 7.2 デフォルト値定数 🟡

```typescript
const DEFAULT_TARGET_PORT = 80;
const DEFAULT_HEALTH_CHECK_PATH = '/health';
const DEFAULT_HEALTHY_THRESHOLD = 2;
const DEFAULT_UNHEALTHY_THRESHOLD = 2;
const DEFAULT_HEALTH_CHECK_TIMEOUT = 5;
const DEFAULT_HEALTH_CHECK_INTERVAL = 30;
const DEFAULT_INTERNET_FACING = true;
const DEFAULT_HTTP_TO_HTTPS_REDIRECT = true;
```

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 内容 |
|--------|------|------|------|
| 🔵 青信号 | 25 | 83% | 要件定義書・設計文書より確認済み |
| 🟡 黄信号 | 5 | 17% | 妥当な推測による設計 |
| 🔴 赤信号 | 0 | 0% | 推測による設計なし |

**品質評価**: ✅ **高品質**
- 要件の曖昧さ: なし
- 入出力定義: 完全
- 制約条件: 明確
- 実装可能性: 確実
- 主要機能（ALB 作成、HTTPS リダイレクト、ACM 証明書）は全て要件定義書で明確に定義

---

## 9. 次のステップ

要件定義が完了しました。次のステップ:

```
/tsumiki:tdd-testcases
```

テストケースの洗い出しを行い、TDD Red フェーズに進みます。
