# TASK-0016: ALB Construct 実装 - TDD開発タスクノート

**作成日時**: 2026-01-31
**タスクID**: TASK-0016
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション

---

## 1. 技術スタック

### 1.1 開発環境

| 項目 | 技術/ツール |
|------|------------|
| IaC フレームワーク | AWS CDK v2 |
| 言語 | TypeScript (strict mode) |
| テストフレームワーク | Jest |
| リージョン | ap-northeast-1 (Tokyo) |

### 1.2 対象 AWS リソース

| リソース | 用途 | 要件 |
|----------|------|------|
| Application Load Balancer (ALB) | Internet-facing ロードバランサー | REQ-028 |
| ALB Listener (HTTP) | HTTP リクエストの受信・HTTPS リダイレクト | REQ-029 |
| ALB Listener (HTTPS) | HTTPS リクエストの受信・ターゲット転送 | REQ-028, REQ-030 |
| Target Group | ECS Service へのトラフィック転送 | REQ-028 |
| ACM Certificate | SSL/TLS 証明書 | REQ-030 |

### 1.3 依存ライブラリ

```typescript
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { Construct } from 'constructs';
```

### 1.4 アーキテクチャパターン

- **パターン**: Internet-facing Application Load Balancer + HTTPS 強制
- **用途**: CloudFront/外部からのトラフィックを ECS Service へルーティング
- **利点**:
  - セキュリティ: HTTPS 強制により通信の暗号化
  - 可用性: Multi-AZ 配置による高可用性
  - スケーラビリティ: 複数ターゲットへの負荷分散
  - 運用性: ヘルスチェックによる異常検知と自動切り離し

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 2. 開発ルール

### 2.1 コーディング規約

#### ファイルヘッダー

```typescript
/**
 * [タイトル]
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: [現在のフェーズ]
 *
 * 【機能概要】: ...
 * 【実装方針】: ...
 * 【テスト対応】: TC-XXX-01 〜 TC-XXX-XX の全Xテストケースに対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module [モジュール名]
 */
```

#### 定数定義パターン

```typescript
// ============================================================================
// 【定数定義】: [説明]
// 🔵 信頼性: [根拠]
// ============================================================================

/**
 * 【定数名】: [説明]
 * 🔵 信頼性: [要件番号] より
 */
const DEFAULT_XXX = 'value';
```

#### インターフェース定義パターン

```typescript
/**
 * [Construct名] の Props インターフェース
 *
 * 【設計方針】: [説明]
 * 【再利用性】: [説明]
 * 🔵 信頼性: [根拠]
 *
 * @interface [Interface名]
 */
export interface XxxConstructProps {
  /**
   * [プロパティ説明]
   *
   * 【用途】: [説明]
   * 【デフォルト】: [値]
   * 🔵 信頼性: [根拠]
   *
   * @default [デフォルト値]
   * @type {[型]}
   */
  readonly propName?: PropType;
}
```

### 2.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | ケバブケース | `alb-construct.ts` |
| クラス名 | パスカルケース | `AlbConstruct` |
| インターフェース名 | パスカルケース | `AlbConstructProps` |
| 定数 | スネークケース(大文字) | `DEFAULT_HTTP_PORT`, `DEFAULT_HTTPS_PORT` |
| 変数・プロパティ | キャメルケース | `applicationLoadBalancer`, `targetGroup` |
| テストファイル | `*.test.ts` | `alb-construct.test.ts` |

### 2.3 テスト要件

#### テストファイル構成

```typescript
/**
 * [Construct名] テスト
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-ALB-01: [テスト概要]
 * - TC-ALB-02: [テスト概要]
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AlbConstruct } from '../../../lib/construct/alb/alb-construct';

describe('AlbConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  describe('TC-ALB-01: [テスト概要]', () => {
    // 【テスト目的】: [説明]
    // 【テスト内容】: [説明]
    // 【期待される動作】: [説明]
    // 🔵 信頼性: [要件番号] より

    beforeEach(() => {
      // テスト対象の Construct をインスタンス化
    });

    test('[テスト名]', () => {
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        ...
      });
    });
  });
});
```

#### テスト実行コマンド

```bash
# テスト実行
npm test

# 特定テスト実行
npm test -- alb-construct.test.ts

# スナップショット更新
npm test -- -u
```

**参照元**:
- `infra/test/construct/ecs/ecs-service-construct.test.ts`
- `infra/test/construct/security/security-group-construct.test.ts`

---

## 3. 関連実装

### 3.1 Security Group Construct パターン

**ファイル**: `infra/lib/construct/security/security-group-construct.ts`

- ALB Security Group を作成済み（HTTP/80, HTTPS/443 インバウンド許可）
- Security Group 間参照を使用（ALB SG → ECS SG）
- 定数による Port 番号管理

```typescript
// ALB Security Group の既存設定
this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
  vpc,
  description: 'Security Group for ALB - allows HTTP and HTTPS from internet',
  allowAllOutbound: true,
});

// HTTP インバウンドルール
this.albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(PORT_HTTP),  // 80
  'Allow HTTP from anywhere'
);

// HTTPS インバウンドルール
this.albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(PORT_HTTPS),  // 443
  'Allow HTTPS from anywhere'
);
```

### 3.2 ECS Service Construct パターン

**ファイル**: `infra/lib/construct/ecs/ecs-service-construct.ts`

- Target Group との連携パターン
- `attachToApplicationTargetGroup()` メソッドの使用

```typescript
// ALB Target Group 連携
if (props.targetGroup) {
  this.service.attachToApplicationTargetGroup(props.targetGroup);
}
```

### 3.3 VPC Construct パターン

**ファイル**: `infra/lib/construct/vpc/vpc-construct.ts`

- Public Subnet の提供（ALB 配置用）
- Private App Subnet の提供（ECS Service 配置用）

```typescript
// Public Subnet: ALB 配置
this.publicSubnets = vpc.publicSubnets;

// Private App Subnet: ECS Service 配置
this.privateAppSubnets = vpc.privateSubnets;
```

**参照元**:
- `infra/lib/construct/security/security-group-construct.ts`
- `infra/lib/construct/ecs/ecs-service-construct.ts`
- `infra/lib/construct/vpc/vpc-construct.ts`

---

## 4. 設計文書

### 4.1 アーキテクチャ位置づけ

ALB は Application Stack に属し、以下の依存関係を持つ:

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

### 4.2 ALB 仕様

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| Scheme | Internet-facing | REQ-028 |
| Type | Application | REQ-028 |
| Subnet | Public Subnet (Multi-AZ) | REQ-028, architecture.md |
| HTTP Listener | Port 80 → HTTPS リダイレクト | REQ-029 |
| HTTPS Listener | Port 443 → Target Group | REQ-028, REQ-030 |
| SSL 証明書 | ACM Certificate | REQ-030 |
| Security Group | ALB Security Group | security-group-construct.ts |

### 4.3 型定義インターフェース

```typescript
// docs/design/aws-cdk-serverless-architecture/interfaces.ts より

/**
 * ALB 設定 🔵
 * @description Application Load Balancer の設定 (REQ-028〜029)
 */
export interface AlbConfig {
  /** Internet-facing */
  readonly internetFacing: boolean;

  /** HTTP → HTTPS リダイレクト */
  readonly httpToHttpsRedirect: boolean;

  /** ヘルスチェック設定 🟡 */
  readonly healthCheck: HealthCheckConfig;
}

/**
 * ヘルスチェック設定 🟡
 * @description ALB ヘルスチェックの設定
 */
export interface HealthCheckConfig {
  /** ヘルスチェックパス */
  readonly path: string;

  /** ヘルシー閾値 */
  readonly healthyThresholdCount: number;

  /** アンヘルシー閾値 */
  readonly unhealthyThresholdCount: number;

  /** タイムアウト（秒） */
  readonly timeout: number;

  /** インターバル（秒） */
  readonly interval: number;
}
```

### 4.4 Props インターフェース設計

```typescript
export interface AlbConstructProps {
  /**
   * VPC (必須)
   * 【用途】: ALB を配置する VPC
   */
  readonly vpc: ec2.IVpc;

  /**
   * ALB Security Group (必須)
   * 【用途】: ALB のネットワーク設定
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * ACM Certificate ARN (必須)
   * 【用途】: HTTPS Listener の SSL 証明書
   * 【補足】: カスタムドメイン未使用時は CloudFront デフォルトドメインの証明書
   */
  readonly certificateArn: string;

  /**
   * ALB 名 (オプション)
   * @default 自動生成
   */
  readonly loadBalancerName?: string;

  /**
   * Target Group ポート (オプション)
   * @default 80
   */
  readonly targetPort?: number;

  /**
   * ヘルスチェックパス (オプション)
   * @default '/health'
   */
  readonly healthCheckPath?: string;

  /**
   * ヘルスチェック設定 (オプション)
   * @default 標準設定
   */
  readonly healthCheck?: {
    readonly healthyThresholdCount?: number;
    readonly unhealthyThresholdCount?: number;
    readonly timeout?: number;
    readonly interval?: number;
  };

  /**
   * HTTP → HTTPS リダイレクト有効化 (オプション)
   * @default true 🔵 REQ-029
   */
  readonly enableHttpToHttpsRedirect?: boolean;

  /**
   * Internet-facing 設定 (オプション)
   * @default true 🔵 REQ-028
   */
  readonly internetFacing?: boolean;
}
```

### 4.5 出力プロパティ設計

```typescript
export class AlbConstruct extends Construct {
  /**
   * Application Load Balancer
   */
  public readonly loadBalancer: elb.IApplicationLoadBalancer;

  /**
   * Target Group (ECS Service 連携用)
   */
  public readonly targetGroup: elb.IApplicationTargetGroup;

  /**
   * HTTPS Listener
   */
  public readonly httpsListener: elb.IApplicationListener;

  /**
   * HTTP Listener (リダイレクト用)
   */
  public readonly httpListener: elb.IApplicationListener;

  /**
   * ALB DNS 名
   */
  public readonly dnsName: string;
}
```

**参照元**:
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. 注意事項

### 5.1 技術的制約

#### ACM 証明書の制約

- ACM 証明書は ALB と同じリージョン（ap-northeast-1）に作成する必要がある
- CloudFront 用の証明書は us-east-1 に別途必要（Distribution Stack で対応）
- カスタムドメイン未使用の場合、ALB デフォルトドメインを使用（REQ-043）

```typescript
// ACM Certificate の参照
const certificate = acm.Certificate.fromCertificateArn(
  this, 'Certificate', props.certificateArn
);
```

#### ALB 配置の制約

- Public Subnet への配置が必須（Internet-facing）
- 最低 2 つの AZ にまたがる Public Subnet が必要
- Security Group は事前に作成された ALB Security Group を使用

```typescript
// Public Subnet への配置
const alb = new elb.ApplicationLoadBalancer(this, 'ALB', {
  vpc: props.vpc,
  internetFacing: true,  // REQ-028
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
  securityGroup: props.securityGroup,
});
```

#### HTTP → HTTPS リダイレクト

- HTTP(80) Listener はリダイレクトアクションのみ
- 実際のトラフィック処理は HTTPS(443) Listener で実施

```typescript
// HTTP → HTTPS リダイレクト (REQ-029)
const httpListener = alb.addListener('HttpListener', {
  port: 80,
  defaultAction: elb.ListenerAction.redirect({
    port: '443',
    protocol: elb.ApplicationProtocol.HTTPS,
    permanent: true,
  }),
});
```

### 5.2 セキュリティ要件

#### Security Group 設定

- ALB Security Group は SecurityGroupConstruct で作成済み
- インバウンド: HTTP(80), HTTPS(443) を 0.0.0.0/0 から許可
- アウトバウンド: 全許可（ECS Service への通信に必要）

#### HTTPS 強制

- HTTP リクエストは自動的に HTTPS にリダイレクト（301 Permanent Redirect）
- TLS 1.2 以上を推奨（ALB Security Policy）

```typescript
// HTTPS Listener (REQ-028, REQ-030)
const httpsListener = alb.addListener('HttpsListener', {
  port: 443,
  certificates: [certificate],
  sslPolicy: elb.SslPolicy.RECOMMENDED_TLS,  // TLS 1.2+
  defaultTargetGroups: [targetGroup],
});
```

### 5.3 パフォーマンス要件

#### ヘルスチェック設定

- パス: `/health`（アプリケーション実装に依存）
- インターバル: 30秒（デフォルト）
- タイムアウト: 5秒
- ヘルシー閾値: 2
- アンヘルシー閾値: 2

```typescript
// Target Group ヘルスチェック設定
const targetGroup = new elb.ApplicationTargetGroup(this, 'TargetGroup', {
  vpc: props.vpc,
  port: props.targetPort ?? 80,
  protocol: elb.ApplicationProtocol.HTTP,
  targetType: elb.TargetType.IP,
  healthCheck: {
    path: props.healthCheckPath ?? '/health',
    healthyThresholdCount: props.healthCheck?.healthyThresholdCount ?? 2,
    unhealthyThresholdCount: props.healthCheck?.unhealthyThresholdCount ?? 2,
    timeout: cdk.Duration.seconds(props.healthCheck?.timeout ?? 5),
    interval: cdk.Duration.seconds(props.healthCheck?.interval ?? 30),
  },
});
```

### 5.4 依存タスク

| タスクID | タスク名 | 関係 |
|----------|----------|------|
| TASK-0002 | VPC Construct 実装 | 前提（Public Subnet が必要）完了 |
| TASK-0005 | Security Group Construct 実装 | 前提（ALB Security Group が必要）完了 |
| TASK-0015 | ECS Service Construct 実装 | 後続（Target Group を ECS Service に連携）完了 |

### 5.5 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- Stack 間の依存関係は CDK が自動解決
- ALB リソースは `elb.ApplicationLoadBalancer` を使用

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-028〜030)
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/security/security-group-construct.ts`

---

## 6. テストケース概要

### 6.1 基本テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-01 | ALB リソース作成確認 | AWS::ElasticLoadBalancingV2::LoadBalancer が 1 つ作成される |
| TC-ALB-02 | Internet-facing 確認 | Scheme が 'internet-facing' に設定される |
| TC-ALB-03 | ALB Type 確認 | Type が 'application' に設定される |
| TC-ALB-04 | Public Subnet 配置確認 | Public Subnet に配置される |

### 6.2 Listener テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-05 | HTTP Listener 作成確認 | Port 80 の Listener が作成される |
| TC-ALB-06 | HTTP → HTTPS リダイレクト確認 | RedirectConfig が設定される |
| TC-ALB-07 | HTTPS Listener 作成確認 | Port 443 の Listener が作成される |
| TC-ALB-08 | ACM Certificate 設定確認 | Certificates に ACM ARN が設定される |

### 6.3 Target Group テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-09 | Target Group 作成確認 | AWS::ElasticLoadBalancingV2::TargetGroup が作成される |
| TC-ALB-10 | Target Type 確認 | TargetType が 'ip' に設定される |
| TC-ALB-11 | Health Check Path 確認 | HealthCheckPath が設定される |
| TC-ALB-12 | Health Check 設定確認 | ヘルスチェック詳細設定が正しく設定される |

### 6.4 Security 設定テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-13 | Security Group 関連付け確認 | SecurityGroups に ALB SG が設定される |
| TC-ALB-14 | SSL Policy 確認 | SslPolicy が RECOMMENDED_TLS に設定される |

### 6.5 デフォルト値テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-15 | Internet-facing デフォルト値確認 | 未指定時に true が設定される |
| TC-ALB-16 | HTTP リダイレクト デフォルト値確認 | 未指定時に true が設定される |
| TC-ALB-17 | Target Port デフォルト値確認 | 未指定時に 80 が設定される |
| TC-ALB-18 | Health Check Path デフォルト値確認 | 未指定時に '/health' が設定される |

### 6.6 公開プロパティテストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-19 | loadBalancer プロパティ確認 | loadBalancer プロパティが定義されている |
| TC-ALB-20 | targetGroup プロパティ確認 | targetGroup プロパティが定義されている |
| TC-ALB-21 | httpsListener プロパティ確認 | httpsListener プロパティが定義されている |
| TC-ALB-22 | httpListener プロパティ確認 | httpListener プロパティが定義されている |
| TC-ALB-23 | dnsName プロパティ確認 | dnsName プロパティが定義されている |

### 6.7 スナップショットテスト

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ALB-24 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

---

## 7. 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `infra/lib/construct/alb/alb-construct.ts` | Construct 実装 |
| `infra/test/construct/alb/alb-construct.test.ts` | テストファイル |

---

## 8. TDD 実行手順

### 8.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0016` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース洗い出し
3. `/tsumiki:tdd-red` - 失敗するテスト実装

### 8.2 Green フェーズ

4. `/tsumiki:tdd-green` - テストを通す最小実装

### 8.3 Refactor フェーズ

5. `/tsumiki:tdd-refactor` - コード品質改善

### 8.4 完了確認

6. `/tsumiki:tdd-verify-complete` - 品質確認・テスト網羅性確認

---

## 9. 参考リソース

### 9.1 プロジェクト内ドキュメント

- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計
- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー設計
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義

### 9.2 既存実装参照

- `infra/lib/construct/security/security-group-construct.ts` - ALB Security Group 実装
- `infra/lib/construct/ecs/ecs-service-construct.ts` - Target Group 連携パターン
- `infra/lib/construct/vpc/vpc-construct.ts` - Public Subnet 参照
- `infra/test/construct/ecs/ecs-service-construct.test.ts` - テストパターン

### 9.3 AWS ドキュメント

- [AWS CDK ELBv2 Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2-readme.html)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
- [ALB Listener Rules](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html)
- [ACM Certificate](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html)

---

## 10. デフォルト定数設計

```typescript
// ============================================================================
// 【定数定義】: ALB 構成のデフォルト値
// 🔵 信頼性: REQ-028, REQ-029, REQ-030 より
// ============================================================================

/**
 * 【HTTP ポート】: HTTP トラフィック用ポート番号
 * 🔵 信頼性: REQ-029 より
 */
const PORT_HTTP = 80;

/**
 * 【HTTPS ポート】: HTTPS トラフィック用ポート番号
 * 🔵 信頼性: REQ-028 より
 */
const PORT_HTTPS = 443;

/**
 * 【デフォルトターゲットポート】: Target Group のデフォルトポート
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_TARGET_PORT = 80;

/**
 * 【デフォルトヘルスチェックパス】: ヘルスチェックのデフォルトパス
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_HEALTH_CHECK_PATH = '/health';

/**
 * 【デフォルトヘルシー閾値】: ヘルスチェックのヘルシー閾値
 * 🟡 信頼性: AWS デフォルト値
 */
const DEFAULT_HEALTHY_THRESHOLD = 2;

/**
 * 【デフォルトアンヘルシー閾値】: ヘルスチェックのアンヘルシー閾値
 * 🟡 信頼性: AWS デフォルト値
 */
const DEFAULT_UNHEALTHY_THRESHOLD = 2;

/**
 * 【デフォルトヘルスチェックタイムアウト】: ヘルスチェックのタイムアウト（秒）
 * 🟡 信頼性: AWS デフォルト値
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT = 5;

/**
 * 【デフォルトヘルスチェックインターバル】: ヘルスチェックのインターバル（秒）
 * 🟡 信頼性: AWS デフォルト値
 */
const DEFAULT_HEALTH_CHECK_INTERVAL = 30;

/**
 * 【デフォルト Internet-facing】: ALB の公開設定
 * 🔵 信頼性: REQ-028 より
 */
const DEFAULT_INTERNET_FACING = true;

/**
 * 【デフォルト HTTP リダイレクト】: HTTP → HTTPS リダイレクト設定
 * 🔵 信頼性: REQ-029 より
 */
const DEFAULT_HTTP_TO_HTTPS_REDIRECT = true;
```

---

**信頼性レベルサマリー**:
- 🔵 青信号: 要件定義書・設計文書より確認済み
- 🟡 黄信号: 妥当な推測による設計
- 🔴 赤信号: 推測による設計（なし）

**品質評価**: 高品質 - 対象要件が明確で、既存実装パターン（Security Group, ECS Service）が確立されている
