# TDD要件定義書: VPC Construct 実装

**タスクID**: TASK-0002
**機能名**: VPC Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-15
**フェーズ**: Phase 1 - 基盤構築

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能概要 🔵

**信頼性**: 🔵 *要件定義書 REQ-001〜007、architecture.md より*

VPC Construct は、AWS CDK v2 を使用してサーバーレスWebサービスアーキテクチャの基盤となるVPCネットワーク構成を実装するカスタムConstruct である。

### 1.2 解決する課題 🔵

**信頼性**: 🔵 *要件定義書・ユーザヒアリングより*

- **高可用性**: Multi-AZ 構成による障害耐性の確保
- **セキュリティ**: 3層サブネット構成による適切なネットワーク分離
- **コスト効率**: NAT Gateway を各 AZ に配置し、可用性とコストのバランスを確保
- **運用効率**: CDK による Infrastructure as Code での管理

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

- **インフラエンジニア**: VPC Construct を使用してネットワーク基盤を構築
- **アプリケーション開発者**: VPC 上にアプリケーションスタックを構築
- **運用担当者**: 構成変更・監視・トラブルシューティング

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.md より*

```
CDK Stack 構成:
├── VPC Stack          ◀ この Construct が所属
│   └── VpcConstruct   ◀ 実装対象
├── Security Stack     (VPC Stack に依存)
├── Database Stack     (VPC Stack に依存)
├── Application Stack  (VPC Stack に依存)
├── Distribution Stack
└── Ops Stack
```

VPC Construct は全ての上位スタックの基盤となり、以下のリソースを他のスタック・Constructに公開する:
- VPC オブジェクト
- Public Subnet (ALB, NAT Gateway 用)
- Private App Subnet (ECS Fargate 用)
- Private DB Subnet (Aurora 用)

### 参照した文書

- **参照したEARS要件**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - ネットワーク層セクション

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ 🔵

**信頼性**: 🔵 *interfaces.ts より*

#### VpcConstructProps インターフェース

```typescript
export interface VpcConstructProps {
  /**
   * VPC CIDR Block
   * @default '10.0.0.0/16'
   */
  readonly vpcCidr?: string;

  /**
   * 使用する可用性ゾーン数
   * @default 2
   */
  readonly maxAzs?: number;

  /**
   * NAT Gateway の数
   * @default 2 (各 AZ に 1 つ)
   */
  readonly natGateways?: number;

  /**
   * Public Subnet の CIDR マスク
   * @default 24 (/24 = 256 IPs)
   */
  readonly publicSubnetCidrMask?: number;

  /**
   * Private App Subnet の CIDR マスク
   * @default 23 (/23 = 512 IPs)
   */
  readonly privateAppSubnetCidrMask?: number;

  /**
   * Private DB Subnet の CIDR マスク
   * @default 24 (/24 = 256 IPs)
   */
  readonly privateDbSubnetCidrMask?: number;
}
```

#### パラメータ制約 🔵

| パラメータ | 型 | デフォルト値 | 制約 | 信頼性 |
|-----------|-----|-------------|------|--------|
| vpcCidr | string | '10.0.0.0/16' | CIDR 形式、/16〜/28 | 🔵 REQ-001 |
| maxAzs | number | 2 | 1〜3 (東京リージョン) | 🔵 REQ-002 |
| natGateways | number | 2 | 0〜maxAzs | 🔵 REQ-007 |
| publicSubnetCidrMask | number | 24 | 16〜28 | 🔵 REQ-003 |
| privateAppSubnetCidrMask | number | 23 | 16〜28 | 🔵 REQ-004 |
| privateDbSubnetCidrMask | number | 24 | 16〜28 | 🔵 REQ-005 |

### 2.2 出力値 🔵

**信頼性**: 🔵 *interfaces.ts・architecture.md より*

#### VpcConstruct が公開するプロパティ

```typescript
export class VpcConstruct extends Construct {
  /**
   * 作成された VPC オブジェクト
   * 他の Construct/Stack から参照可能
   */
  public readonly vpc: ec2.IVpc;

  /**
   * Public Subnet の一覧
   * ALB, NAT Gateway 配置用
   */
  public readonly publicSubnets: ec2.ISubnet[];

  /**
   * Private App Subnet の一覧
   * ECS Fargate 配置用
   */
  public readonly privateAppSubnets: ec2.ISubnet[];

  /**
   * Private DB Subnet の一覧
   * Aurora 配置用
   */
  public readonly privateDbSubnets: ec2.ISubnet[];
}
```

#### 出力形式 🔵

| 出力 | 型 | 説明 | 信頼性 |
|------|-----|------|--------|
| vpc | ec2.IVpc | CDK VPC オブジェクト | 🔵 |
| publicSubnets | ec2.ISubnet[] | Public Subnet 配列 (2個) | 🔵 |
| privateAppSubnets | ec2.ISubnet[] | Private App Subnet 配列 (2個) | 🔵 |
| privateDbSubnets | ec2.ISubnet[] | Private DB Subnet 配列 (2個) | 🔵 |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *architecture.md より*

```
入力: VpcConstructProps
  │
  ▼
処理: ec2.Vpc コンストラクト生成
  │
  ▼
出力: VPC リソース群
  ├── AWS::EC2::VPC
  ├── AWS::EC2::Subnet (Public x 2)
  ├── AWS::EC2::Subnet (PrivateApp x 2)
  ├── AWS::EC2::Subnet (PrivateDb x 2)
  ├── AWS::EC2::InternetGateway
  ├── AWS::EC2::NatGateway x 2
  ├── AWS::EC2::RouteTable (各サブネット用)
  └── AWS::EC2::Route (各ルートテーブル用)
```

### 2.4 データフロー 🔵

**信頼性**: 🔵 *dataflow.md より*

```
Internet
    │
    ▼
Internet Gateway ─────► Public Subnet (ALB, NAT GW)
    │                        │
    │                        ▼
    │               NAT Gateway
    │                        │
    │                        ▼
    └─────────────► Private App Subnet (ECS Fargate)
                             │
                             ▼ (Port 3306, Security Group 経由)
                    Private DB Subnet (Aurora)
```

### 参照した文書

- **参照したEARS要件**: REQ-001〜007
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - NetworkConfig, SubnetConfig インターフェース
  - `docs/design/aws-cdk-serverless-architecture/dataflow.md` - ネットワークフロー図

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件 🔵

**信頼性**: 🔵 *要件定義書 NFR-001〜003 より*

| 項目 | 要件 | 対応実装 | 信頼性 |
|------|------|----------|--------|
| 高可用性 | Multi-AZ 構成 | maxAzs: 2 | 🔵 NFR-001 |
| フェイルオーバー | AZ 障害時の継続運用 | NAT GW 各 AZ 配置 | 🔵 NFR-003 |
| ネットワーク冗長性 | 単一障害点の排除 | 2 AZ x 3層サブネット | 🔵 NFR-001 |

### 3.2 セキュリティ要件 🔵

**信頼性**: 🔵 *要件定義書 NFR-101, REQ-404〜405 より*

| 項目 | 要件 | 対応実装 | 信頼性 |
|------|------|----------|--------|
| ネットワーク分離 | 3層サブネット構成 | PUBLIC / PRIVATE_WITH_EGRESS / PRIVATE_ISOLATED | 🔵 NFR-101 |
| DB 保護 | Private DB Subnet | PRIVATE_ISOLATED タイプ | 🔵 REQ-404 |
| 最小権限アクセス | Security Group による制御 | 別 Construct (TASK-0005) で実装 | 🔵 |

### 3.3 互換性要件 🔵

**信頼性**: 🔵 *要件定義書 REQ-401, REQ-403 より*

| 項目 | 要件 | 信頼性 |
|------|------|--------|
| CDK バージョン | AWS CDK v2 | 🔵 REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | 🔵 REQ-403 |
| AZ | ap-northeast-1a, ap-northeast-1c | 🔵 REQ-002 |

### 3.4 アーキテクチャ制約 🔵

**信頼性**: 🔵 *architecture.md より*

```typescript
// CDK SubnetType の使用規則
PUBLIC:                  // Internet Gateway へのルートあり
PRIVATE_WITH_EGRESS:     // NAT Gateway へのルートあり
PRIVATE_ISOLATED:        // 外部へのルートなし
```

| サブネット | SubnetType | 用途 | 信頼性 |
|-----------|-----------|------|--------|
| Public | PUBLIC | ALB, NAT Gateway | 🔵 |
| Private App | PRIVATE_WITH_EGRESS | ECS Fargate | 🔵 |
| Private DB | PRIVATE_ISOLATED | Aurora | 🔵 |

### 3.5 IP アドレス設計 🔵

**信頼性**: 🔵 *architecture.md より*

#### サブネット CIDR 割り当て

| サブネット | AZ-a | AZ-c | サイズ |
|-----------|------|------|--------|
| Public | 10.0.0.0/24 | 10.0.1.0/24 | 256 IPs x 2 |
| Private App | 10.0.2.0/23 | 10.0.4.0/23 | 512 IPs x 2 |
| Private DB | 10.0.6.0/24 | 10.0.7.0/24 | 256 IPs x 2 |

**総IP数**: 65,536 IPs (VPC) = 512 (Public) + 2,048 (App) + 512 (DB) + 予約

### 参照した文書

- **参照したEARS要件**: NFR-001, NFR-003, NFR-101, REQ-401, REQ-403, REQ-404, REQ-405
- **参照した設計文書**:
  - `docs/design/aws-cdk-serverless-architecture/architecture.md` - ネットワーク層、技術的制約セクション

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *要件定義書 REQ-001〜007 より*

#### パターン1: デフォルト設定での使用

```typescript
import { VpcConstruct } from '../lib/construct/vpc/vpc-construct';

const stack = new cdk.Stack(app, 'VpcStack');

// デフォルト設定で VPC を作成
const vpcConstruct = new VpcConstruct(stack, 'Vpc');

// 他の Construct で参照
const vpc = vpcConstruct.vpc;
const appSubnets = vpcConstruct.privateAppSubnets;
```

#### パターン2: カスタム設定での使用 🟡

**信頼性**: 🟡 *interfaces.ts から妥当な推測*

```typescript
const vpcConstruct = new VpcConstruct(stack, 'Vpc', {
  vpcCidr: '10.0.0.0/16',
  maxAzs: 2,
  natGateways: 2,
  publicSubnetCidrMask: 24,
  privateAppSubnetCidrMask: 23,
  privateDbSubnetCidrMask: 24,
});
```

### 4.2 データフロー例 🔵

**信頼性**: 🔵 *dataflow.md より*

#### トラフィックフロー: インターネット → アプリケーション

```
1. User Request
   └── Internet
       └── Internet Gateway
           └── Public Subnet
               └── ALB (Port 443)
                   └── Private App Subnet
                       └── ECS Fargate (Port 80)
```

#### トラフィックフロー: アプリケーション → データベース

```
1. ECS Fargate (Private App Subnet)
   └── Security Group (Outbound: 3306)
       └── Private DB Subnet
           └── Aurora (Port 3306)
               └── Security Group (Inbound: ECS SG からの 3306)
```

#### トラフィックフロー: アプリケーション → インターネット (Egress)

```
1. ECS Fargate (Private App Subnet)
   └── NAT Gateway (Public Subnet)
       └── Internet Gateway
           └── Internet (外部 API 等)
```

### 4.3 エッジケース 🟡

**信頼性**: 🟡 *Multi-AZ 構成から妥当な推測*

#### EDGE-001: NAT Gateway 障害時 🟡

**信頼性**: 🟡 *EDGE-001 より*

```
条件: ap-northeast-1a の NAT Gateway が障害
期待動作: ap-northeast-1c の NAT Gateway 経由でトラフィック継続
実装対応: 各 AZ に NAT Gateway を配置 (natGateways: 2)
```

**注意**: CDK の ec2.Vpc は NAT Gateway の AZ 間フェイルオーバーを自動設定しない。AZ 障害時は該当 AZ のサブネットからの Egress が停止する設計となる。

#### EDGE-101: VPC CIDR IP アドレス枯渇 🔴

**信頼性**: 🔴 *推測による要件 (EDGE-101)*

```
条件: /16 CIDR (65,536 IPs) が枯渇
対応:
  - 現時点では対応不要（想定タスク数に対して十分な IP）
  - 将来的に必要な場合は Secondary CIDR の追加を検討
```

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *AWS 仕様から妥当な推測*

#### EC-01: CIDR 重複エラー

```
条件: 同一アカウント・リージョンに同じ CIDR の VPC が存在
期待動作: CloudFormation デプロイエラー
エラーメッセージ例: "The CIDR 'x.x.x.x/x' conflicts with another subnet"
```

#### EC-02: AZ 利用不可エラー

```
条件: 指定 AZ が利用不可（メンテナンス等）
期待動作: CloudFormation デプロイエラー
対応: maxAzs を減らすか、別 AZ を使用
```

### 参照した文書

- **参照したEARS要件**: REQ-001〜007
- **参照したEdgeケース**: EDGE-001, EDGE-101
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md` - ネットワークフロー図

---

## 5. EARS要件・設計文書との対応関係

### 5.1 要件トレーサビリティ

#### 参照したユーザストーリー

- **US-001**: インフラエンジニアとして、高可用性なネットワーク基盤を構築したい（Multi-AZ 構成実現のため）

#### 参照した機能要件

| 要件ID | 内容 | Construct での対応 | 信頼性 |
|--------|------|-------------------|--------|
| REQ-001 | CIDR Block `10.0.0.0/16` の VPC 作成 | `ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')` | 🔵 |
| REQ-002 | 2つの AZ で Multi-AZ 構成 | `maxAzs: 2` | 🔵 |
| REQ-003 | Public Subnet `/24` 割り当て | `cidrMask: 24, subnetType: PUBLIC` | 🔵 |
| REQ-004 | Private App Subnet `/23` 割り当て | `cidrMask: 23, subnetType: PRIVATE_WITH_EGRESS` | 🔵 |
| REQ-005 | Private DB Subnet `/24` 割り当て | `cidrMask: 24, subnetType: PRIVATE_ISOLATED` | 🔵 |
| REQ-006 | Internet Gateway 1個作成 | CDK VPC で PUBLIC サブネット指定時に自動作成 | 🔵 |
| REQ-007 | NAT Gateway 各 AZ に 1個ずつ | `natGateways: 2` | 🔵 |

#### 参照した非機能要件

| 要件ID | 内容 | Construct での対応 | 信頼性 |
|--------|------|-------------------|--------|
| NFR-001 | Multi-AZ 構成による高可用性 | 2 AZ 構成 | 🔵 |
| NFR-003 | NAT Gateway 各 AZ 配置で可用性確保 | NAT GW x 2 | 🔵 |
| NFR-101 | VPC Endpoint 使用でトラフィックを AWS 内に閉じる | 別 Construct (TASK-0003) | 🔵 |

#### 参照したEdgeケース

| ケースID | 内容 | 対応状況 | 信頼性 |
|---------|------|----------|--------|
| EDGE-001 | NAT Gateway 障害時フェイルオーバー | 各 AZ に NAT GW 配置 | 🟡 |
| EDGE-101 | VPC CIDR IP アドレス枯渇 | /16 で十分なキャパシティ確保 | 🔴 |

### 5.2 参照した設計文書

| 文書 | 参照セクション | 用途 |
|------|---------------|------|
| `docs/design/aws-cdk-serverless-architecture/architecture.md` | ネットワーク層、CDK Stack 構成 | アーキテクチャ設計 |
| `docs/design/aws-cdk-serverless-architecture/dataflow.md` | ネットワークフロー図 | データフロー設計 |
| `docs/design/aws-cdk-serverless-architecture/interfaces.ts` | NetworkConfig, SubnetConfig | 型定義 |
| `docs/spec/aws-cdk-serverless-architecture/requirements.md` | REQ-001〜007, NFR-001〜003 | 要件定義 |
| `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` | TC-VPC-01〜05 | テストケース |

---

## 6. 受け入れ基準とテスト戦略

### 6.1 受け入れ基準 🔵

**信頼性**: 🔵 *acceptance-criteria.md より*

#### Given（前提条件）
- AWS アカウントが利用可能
- ap-northeast-1 リージョンが選択されている
- CDK Bootstrap が完了している
- TASK-0001 (CDK プロジェクト初期化) が完了している

#### When（実行条件）
- VpcConstruct をインスタンス化してスタックをデプロイする

#### Then（期待結果）
- CIDR `10.0.0.0/16` の VPC が作成される
- 2つの AZ にそれぞれ Public/Private App/Private DB Subnet が作成される
- Internet Gateway が VPC にアタッチされる
- NAT Gateway が各 AZ に 1 つずつ作成される

### 6.2 テストケース一覧 🔵

**信頼性**: 🔵 *acceptance-criteria.md TC-VPC-01〜05 より*

#### 正常系テスト

| テストID | テスト内容 | 期待結果 | 信頼性 |
|---------|-----------|----------|--------|
| TC-VPC-01 | VPC が作成される | CIDR Block が `10.0.0.0/16` | 🔵 |
| TC-VPC-02 | Public Subnet が作成される | /24 サブネット x 2 (各 AZ) | 🔵 |
| TC-VPC-03 | Private App Subnet が作成される | /23 サブネット x 2 (各 AZ) | 🔵 |
| TC-VPC-04 | Private DB Subnet が作成される | /24 サブネット x 2 (各 AZ) | 🔵 |
| TC-VPC-05 | NAT Gateway が作成される | NAT GW x 2 (各 AZ) | 🔵 |
| TC-VPC-06 | Internet Gateway が作成される | IGW x 1、VPC にアタッチ | 🔵 |

#### 異常系テスト 🟡

**信頼性**: 🟡 *AWS 仕様から妥当な推測*

| テストID | テスト内容 | 期待結果 | 信頼性 |
|---------|-----------|----------|--------|
| TC-VPC-E01 | 不正な CIDR 形式 | バリデーションエラー | 🟡 |
| TC-VPC-E02 | maxAzs > 利用可能 AZ 数 | CloudFormation エラー | 🟡 |

### 6.3 テスト戦略

#### テストレベル

1. **単体テスト** (Jest + CDK assertions)
   - CloudFormation テンプレートの検証
   - リソースプロパティの検証
   - リソース数の検証

2. **統合テスト** (CDK synth)
   - 合成されたテンプレートの妥当性確認

3. **デプロイテスト** (CDK deploy)
   - 実際の AWS 環境へのデプロイ確認
   - リソース間の接続性確認

#### テスト実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../lib/construct/vpc/vpc-construct';

describe('VpcConstruct', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new VpcConstruct(stack, 'TestVpc');
    template = Template.fromStack(stack);
  });

  describe('VPC', () => {
    test('TC-VPC-01: creates VPC with correct CIDR', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
    });
  });

  describe('Subnets', () => {
    test('TC-VPC-02: creates 2 Public Subnets', () => {
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 + 2 + 2
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
      });
    });
  });

  describe('NAT Gateway', () => {
    test('TC-VPC-05: creates 2 NAT Gateways', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });
  });

  describe('Internet Gateway', () => {
    test('TC-VPC-06: creates 1 Internet Gateway', () => {
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });
  });
});
```

---

## 7. 実装ファイル構成

### 7.1 新規作成ファイル 🔵

**信頼性**: 🔵 *note.md より*

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/vpc-construct.ts` | VPC Construct 実装 |
| `infra/test/vpc-construct.test.ts` | VPC Construct テスト |

### 7.2 ディレクトリ構造

```
infra/
├── lib/
│   └── construct/
│       └── vpc/
│           └── vpc-construct.ts  ◀ 新規作成
└── test/
    └── vpc-construct.test.ts     ◀ 新規作成
```

---

## 8. 信頼性レベルサマリー

### 要件項目別

| カテゴリ | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 | 合計 |
|---------|----------|----------|----------|------|
| 機能概要 | 4 | 0 | 0 | 4 |
| 入出力仕様 | 10 | 0 | 0 | 10 |
| 制約条件 | 12 | 0 | 0 | 12 |
| 使用例 | 4 | 3 | 1 | 8 |
| テストケース | 6 | 2 | 0 | 8 |
| **合計** | **36** | **5** | **1** | **42** |

### パーセンテージ

- 🔵 **青信号**: 36項目 (86%)
- 🟡 **黄信号**: 5項目 (12%)
- 🔴 **赤信号**: 1項目 (2%)

### 品質評価

**✅ 高品質**

- 要件の曖昧さ: **なし** - 全ての機能要件が EARS 形式で明確に定義
- 入出力定義: **完全** - TypeScript 型定義により厳密に定義
- 制約条件: **明確** - NFR により数値化された基準が存在
- 実装可能性: **確実** - CDK の標準パターンで実装可能
- 信頼性レベル: **高** - 86% が青信号

### 黄信号・赤信号項目の詳細

#### 🟡 黄信号項目（要確認）

1. **カスタム設定での使用パターン**: デフォルト値変更時の動作を追加テストで確認
2. **NAT Gateway 障害時フェイルオーバー**: AZ 障害時の動作仕様を確認
3. **不正な CIDR 形式テスト**: CDK のバリデーション動作を確認
4. **maxAzs 超過テスト**: CloudFormation のエラーハンドリングを確認
5. **AZ 利用不可エラー**: 実環境での動作確認が必要

#### 🔴 赤信号項目（推測）

1. **IP アドレス枯渇対応 (EDGE-101)**: 現時点では対応不要、将来的な課題として記録

---

## 9. 次のステップ

### TDD 実装フロー

1. **Red Phase**: `/tsumiki:tdd-red` - 失敗するテストを作成
2. **Green Phase**: `/tsumiki:tdd-green` - テストを通す最小実装
3. **Refactor Phase**: `/tsumiki:tdd-refactor` - コード品質改善

### 推奨コマンド

```bash
# テストファイル作成後
cd infra
npm test -- vpc-construct.test.ts --watch
```

---

## 関連文書

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0002/note.md` |
