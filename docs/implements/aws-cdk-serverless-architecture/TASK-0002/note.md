# TASK-0002: VPC Construct 実装 - TDD開発ノート

**タスクID**: TASK-0002
**タスクタイプ**: TDD
**推定工数**: 8時間
**フェーズ**: Phase 1 - 基盤構築

---

## 1. 技術スタック

### 使用技術・フレームワーク

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| IaC | AWS CDK | v2.213.0 |
| 言語 | TypeScript | ~5.6.3 |
| テスト | Jest | ^29.7.0 |
| ランタイム | Node.js | ES2018 Target |

### アーキテクチャパターン

- **パターン**: Multi-Tier Serverless Architecture
- **ネットワーク構成**: 3層サブネット構成 (Public / Private App / Private DB)
- **可用性**: Multi-AZ (ap-northeast-1a, ap-northeast-1c)

### 主要CDKモジュール

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
```

**参照元**:
- `infra/package.json`
- `infra/tsconfig.json`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### プロジェクト固有ルール

1. **CDKコマンド実行**: `npx` を使用してワークスペースローカルのCDKバージョンを使用
2. **パラメータ管理**: `parameter.ts` で環境別設定を管理
3. **スタック分割**: 機能別に6つのスタックに分割
4. **テスト方式**: Jest スナップショットテスト

### コーディング規約

| 項目 | 規約 |
|------|------|
| ファイル命名 | kebab-case (例: `vpc-construct.ts`) |
| クラス命名 | PascalCase (例: `VpcConstruct`) |
| インターフェース | 型定義ファイルで一元管理 |
| エクスポート | Named Export を使用 |

### ディレクトリ構造

```
infra/
├── bin/
│   └── infra.ts              # CDK App エントリーポイント
├── lib/
│   ├── stack/                # Stack 定義
│   │   └── vpc-stack.ts
│   └── construct/            # Construct 定義
│       └── vpc/
│           └── vpc-construct.ts  # 実装対象
├── test/
│   └── vpc-construct.test.ts     # テストファイル
└── parameter.ts              # 環境別パラメータ
```

**参照元**:
- `CLAUDE.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 3. 関連実装

### 既存コード

| ファイル | 内容 |
|---------|------|
| `infra/lib/infra-stack.ts` | 初期スタックテンプレート (空) |
| `infra/bin/infra.ts` | CDK Appエントリーポイント |

### 類似機能の実装パターン

**VPC作成パターン** (CDK標準):
```typescript
const vpc = new ec2.Vpc(this, 'Vpc', {
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  maxAzs: 2,
  natGateways: 2,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 23,
      name: 'PrivateApp',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
    {
      cidrMask: 24,
      name: 'PrivateDb',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    },
  ],
});
```

**参照元**:
- `infra/lib/infra-stack.ts`
- `infra/bin/infra.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md`

---

## 4. 設計文書

### アーキテクチャ仕様

#### ネットワーク構成

| コンポーネント | 設定値 | 備考 |
|---------------|--------|------|
| VPC CIDR | 10.0.0.0/16 | 65,536 IPs |
| 可用性ゾーン | 2 (ap-northeast-1a, 1c) | Multi-AZ |
| Public Subnet | /24 x 2 | ALB, NAT Gateway |
| Private App Subnet | /23 x 2 | ECS Fargate |
| Private DB Subnet | /24 x 2 | Aurora |
| Internet Gateway | 1 | |
| NAT Gateway | 2 (1 per AZ) | 高可用性 |

#### サブネット CIDR 割り当て例

| サブネット | AZ-a | AZ-c |
|-----------|------|------|
| Public | 10.0.0.0/24 | 10.0.1.0/24 |
| Private App | 10.0.2.0/23 | 10.0.4.0/23 |
| Private DB | 10.0.6.0/24 | 10.0.7.0/24 |

### 関連要件 (REQ)

| 要件ID | 内容 | 信頼性 |
|--------|------|--------|
| REQ-001 | CIDR Block `10.0.0.0/16` の VPC 作成 | 🔵 |
| REQ-002 | 2つの AZ で Multi-AZ 構成 | 🔵 |
| REQ-003 | Public Subnet を `/24` で割り当て | 🔵 |
| REQ-004 | Private App Subnet を `/23` で割り当て | 🔵 |
| REQ-005 | Private DB Subnet を `/24` で割り当て | 🔵 |
| REQ-006 | Internet Gateway を 1個作成 | 🔵 |
| REQ-007 | NAT Gateway を各 AZ に 1個ずつ作成 | 🔵 |

### 型定義インターフェース

```typescript
// NetworkConfig (interfaces.ts より)
export interface NetworkConfig {
  readonly vpcCidr: string;           // '10.0.0.0/16'
  readonly maxAzs: number;            // 2
  readonly natGateways: number;       // 2
  readonly subnets: SubnetConfig;
  readonly vpcEndpoints: VpcEndpointsConfig;
}

export interface SubnetConfig {
  readonly publicSubnetCidrMask: number;      // 24
  readonly privateAppSubnetCidrMask: number;  // 23
  readonly privateDbSubnetCidrMask: number;   // 24
}
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 5. テスト要件

### テストケース概要

| テストID | 内容 | 信頼性 |
|---------|------|--------|
| TC-VPC-01 | VPC が CIDR 10.0.0.0/16 で作成される | 🔵 |
| TC-VPC-02 | Public Subnet が /24 で各 AZ に作成される | 🔵 |
| TC-VPC-03 | Private App Subnet が /23 で各 AZ に作成される | 🔵 |
| TC-VPC-04 | Private DB Subnet が /24 で各 AZ に作成される | 🔵 |
| TC-VPC-05 | NAT Gateway が各 AZ に 1 つずつ作成される | 🔵 |

### テスト実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcConstruct } from '../lib/construct/vpc/vpc-construct';

describe('VpcConstruct', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new VpcConstruct(stack, 'TestVpc', {
      // props
    });
    template = Template.fromStack(stack);
  });

  test('creates VPC with correct CIDR', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  test('creates 2 NAT Gateways', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });
});
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md`

---

## 6. 実装対象ファイル

### 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/vpc/vpc-construct.ts` | VPC Construct 実装 |
| `infra/test/vpc-construct.test.ts` | VPC Construct テスト |

### 実装インターフェース

```typescript
// VpcConstructProps
export interface VpcConstructProps {
  readonly vpcCidr?: string;           // default: '10.0.0.0/16'
  readonly maxAzs?: number;            // default: 2
  readonly natGateways?: number;       // default: 2
  readonly publicSubnetCidrMask?: number;      // default: 24
  readonly privateAppSubnetCidrMask?: number;  // default: 23
  readonly privateDbSubnetCidrMask?: number;   // default: 24
}

// VpcConstruct
export class VpcConstruct extends Construct {
  public readonly vpc: ec2.IVpc;
  // ...
}
```

---

## 7. 注意事項

### 技術的制約

| 項目 | 制約内容 |
|------|----------|
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| VPC CIDR | 10.0.0.0/16 固定 |
| AZ数 | 2 固定 (ap-northeast-1a, ap-northeast-1c) |

### CDK ベストプラクティス

1. **SubnetType の使用**:
   - `PUBLIC`: Internet Gateway へのルートあり
   - `PRIVATE_WITH_EGRESS`: NAT Gateway へのルートあり
   - `PRIVATE_ISOLATED`: 外部へのルートなし

2. **NAT Gateway 配置**:
   - 各 AZ に 1 つずつ配置して高可用性を確保
   - `natGatewaySubnets` で Public Subnet を指定

3. **サブネット選択**:
   - `vpc.selectSubnets()` でタイプ別にサブネットを取得
   - 他の Construct への受け渡しに使用

### セキュリティ考慮事項

- VPC Flow Logs の有効化を検討 (別タスク TASK-0021)
- NACL はデフォルト設定を使用
- Security Group は別 Construct で管理 (TASK-0005)

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `CLAUDE.md`

---

## 8. 依存関係

### 前提タスク

| タスクID | 内容 | 状態 |
|---------|------|------|
| TASK-0001 | CDK プロジェクト初期化 | 完了 |

### 後続タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0003 | VPC Endpoints Construct 実装 | VPC が必要 |
| TASK-0004 | VPC Stack 統合 | VPC Construct を使用 |

---

## 9. TDD 実装手順

### Red Phase
1. `infra/test/vpc-construct.test.ts` を作成
2. VPC CIDR、サブネット数、NAT Gateway 数のテストを実装
3. テスト実行 → 全て失敗することを確認

### Green Phase
1. `infra/lib/construct/vpc/vpc-construct.ts` を作成
2. 最小限の実装でテストを通す
3. テスト実行 → 全て成功することを確認

### Refactor Phase
1. コードの整理・最適化
2. Props のデフォルト値設定
3. JSDoc コメント追加
4. テスト実行 → 全て成功することを確認

---

## 10. コマンドリファレンス

### 開発コマンド

```bash
# プロジェクトディレクトリ
cd infra

# 依存関係インストール
npm install

# ビルド
npm run build

# テスト実行
npm test

# 特定テストファイル実行
npm test -- vpc-construct.test.ts

# CDK Synth (CloudFormation テンプレート生成)
npx cdk synth

# CDK Diff (差分確認)
npx cdk diff --profile <aws-profile>
```

### テストコマンド

```bash
# 全テスト実行
npm test

# Watch モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage

# スナップショット更新
npm test -- -u
```

---

## 11. 信頼性レベルサマリー

- **総項目数**: 7項目 (REQ-001〜007)
- 🔵 **青信号**: 7項目 (100%)
- 🟡 **黄信号**: 0項目 (0%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 - 全ての要件が要件定義書により確認済み

---

## 12. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0002.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| ユーザストーリー | `docs/spec/aws-cdk-serverless-architecture/user-stories.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
| プロジェクト設定 | `infra/package.json` |
| TypeScript設定 | `infra/tsconfig.json` |
| CDK設定 | `infra/cdk.json` |
