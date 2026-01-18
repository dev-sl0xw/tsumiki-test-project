# TASK-0005: Security Group Construct 実装 - TDD開発ノート

**タスクID**: TASK-0005
**タスクタイプ**: TDD
**推定工数**: 6時間
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
- **セキュリティ設計**: 最小権限の原則に基づく Security Group 構成
- **ネットワーク分離**: 3層構成 (ALB / ECS / Aurora) での通信制御

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
5. **セキュリティ**: 最小権限の原則を徹底

### コーディング規約

| 項目 | 規約 |
|------|------|
| ファイル命名 | kebab-case (例: `security-group-construct.ts`) |
| クラス命名 | PascalCase (例: `SecurityGroupConstruct`) |
| インターフェース | 型定義ファイルで一元管理 |
| エクスポート | Named Export を使用 |
| コメント | JSDoc形式で機能・信頼性レベルを記載 |

### ディレクトリ構造

```
infra/
├── bin/
│   └── infra.ts              # CDK App エントリーポイント
├── lib/
│   ├── stack/
│   │   └── vpc-stack.ts      # VPC Stack (既存)
│   └── construct/
│       ├── vpc/
│       │   ├── vpc-construct.ts      # VPC Construct (既存)
│       │   └── endpoints-construct.ts # Endpoints Construct (既存)
│       └── security/
│           └── security-group-construct.ts  # 実装対象
├── test/
│   └── security-group-construct.test.ts     # テストファイル
└── parameter.ts              # 環境別パラメータ
```

**参照元**:
- `CLAUDE.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/vpc/vpc-construct.ts`

---

## 3. 関連実装

### 既存コード

| ファイル | 内容 | 関連度 |
|---------|------|--------|
| `infra/lib/construct/vpc/vpc-construct.ts` | VPC Construct 実装 | 高 - 同様のパターンで実装 |
| `infra/lib/construct/vpc/endpoints-construct.ts` | Endpoints Construct 実装 | 高 - 同様のパターンで実装 |
| `infra/lib/stack/vpc-stack.ts` | VPC Stack 実装 | 中 - Security Stack で参照 |

### VPC Construct 実装パターン (参考)

```typescript
// 既存実装からのパターン
export interface VpcConstructProps {
  readonly vpcCidr?: string;
  readonly maxAzs?: number;
  // ...
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly publicSubnets: ec2.ISubnet[];
  // ...

  constructor(scope: Construct, id: string, props?: VpcConstructProps) {
    super(scope, id);
    // デフォルト値の適用
    // リソース作成
    // プロパティ設定
  }
}
```

### Security Group 作成パターン (CDK標準)

```typescript
// ALB Security Group
const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
  vpc,
  description: 'Security group for Application Load Balancer',
  allowAllOutbound: true,
});

albSg.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(80),
  'Allow HTTP from anywhere'
);

albSg.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'Allow HTTPS from anywhere'
);

// ECS Security Group
const ecsSg = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
  vpc,
  description: 'Security group for ECS Fargate tasks',
  allowAllOutbound: true,
});

ecsSg.addIngressRule(
  albSg,
  ec2.Port.tcp(containerPort),
  'Allow traffic from ALB'
);

// Aurora Security Group
const auroraSg = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
  vpc,
  description: 'Security group for Aurora MySQL',
  allowAllOutbound: false, // 外向きトラフィックも制限
});

auroraSg.addIngressRule(
  ecsSg,
  ec2.Port.tcp(3306),
  'Allow MySQL from ECS tasks only'
);
```

**参照元**:
- `infra/lib/construct/vpc/vpc-construct.ts`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md`

---

## 4. 設計文書

### アーキテクチャ仕様

#### Security Group 構成

| Security Group | インバウンド | アウトバウンド | 用途 |
|----------------|-------------|---------------|------|
| ALB SG | 0.0.0.0/0:80, 0.0.0.0/0:443 | All | Internet-facing ALB |
| ECS SG | ALB SG:containerPort | All | ECS Fargate タスク |
| Aurora SG | ECS SG:3306 | なし | Aurora MySQL |

#### セキュリティ境界設計

```
Internet → WAF → CloudFront → ALB (ALB SG) → ECS (ECS SG) → Aurora (Aurora SG)
                               ↓              ↓               ↓
                          HTTP/HTTPS      containerPort      3306
                          from anywhere   from ALB SG only  from ECS SG only
```

### 関連要件 (REQ)

| 要件ID | 内容 | 信頼性 |
|--------|------|--------|
| REQ-024 | Aurora Security Group で外部からの直接アクセスを遮断 | 🔵 |
| REQ-025 | Aurora Security Group で ECS からの 3306 ポートアクセスのみ許可 | 🔵 |
| REQ-028 | ALB を Public Subnet に配置し、Internet-facing で設定 | 🔵 |
| REQ-029 | ALB で HTTP(80) リクエストを HTTPS(443) にリダイレクト | 🔵 |

### 型定義インターフェース (推奨)

```typescript
/**
 * SecurityGroupConstruct の Props インターフェース
 * 🔵 信頼性: タスク定義書・要件定義書より
 */
export interface SecurityGroupConstructProps {
  /**
   * VPC (必須)
   * @description Security Group を作成する VPC
   */
  readonly vpc: ec2.IVpc;

  /**
   * ECS コンテナポート
   * @default 80
   * @description ALB から ECS へのトラフィックで使用するポート
   */
  readonly containerPort?: number;
}

/**
 * Security Group Construct
 * 🔵 信頼性: 要件定義書 REQ-024, REQ-025, REQ-028 より
 */
export class SecurityGroupConstruct extends Construct {
  /** ALB 用 Security Group */
  public readonly albSecurityGroup: ec2.ISecurityGroup;

  /** ECS 用 Security Group */
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;

  /** Aurora 用 Security Group */
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;
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
| TC-SG-01 | ALB Security Group が作成されること | 🔵 |
| TC-SG-02 | ALB SG に HTTP(80) インバウンドが許可されていること | 🔵 |
| TC-SG-03 | ALB SG に HTTPS(443) インバウンドが許可されていること | 🔵 |
| TC-SG-04 | ECS Security Group が作成されること | 🔵 |
| TC-SG-05 | ECS SG に ALB SG からのインバウンドのみ許可されていること | 🔵 |
| TC-SG-06 | Aurora Security Group が作成されること | 🔵 |
| TC-SG-07 | Aurora SG に ECS SG からの 3306 のみ許可されていること | 🔵 |
| TC-SG-08 | Aurora SG で 0.0.0.0/0 からの直接アクセスが許可されていないこと | 🔵 |
| TC-SG-09 | Aurora SG でアウトバウンドトラフィックが制限されていること | 🔵 |
| TC-SG-10 | 各 Security Group に不要なルールが含まれていないこと | 🔵 |
| TC-SG-11 | Security Group 間の参照関係が正しいこと | 🔵 |

### テスト実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroupConstruct } from '../lib/construct/security/security-group-construct';

describe('SecurityGroupConstruct', () => {
  let template: Template;
  let stack: cdk.Stack;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    const vpc = new ec2.Vpc(stack, 'TestVpc');
    new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
      vpc,
      containerPort: 80,
    });
    template = Template.fromStack(stack);
  });

  test('creates ALB Security Group', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('ALB|Load Balancer'),
    });
  });

  test('ALB Security Group allows HTTP from anywhere', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 80,
      ToPort: 80,
      CidrIp: '0.0.0.0/0',
    });
  });

  test('Aurora Security Group has no outbound traffic', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('Aurora|MySQL'),
      SecurityGroupEgress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: '-1',
          CidrIp: Match.absent(),
        }),
      ]),
    });
  });
});
```

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md`
- `infra/test/vpc-construct.test.ts` (参考パターン)

---

## 6. 実装対象ファイル

### 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/security/security-group-construct.ts` | Security Group Construct 実装 |
| `infra/test/security-group-construct.test.ts` | Security Group Construct テスト |

### 実装インターフェース

```typescript
// SecurityGroupConstructProps
export interface SecurityGroupConstructProps {
  /**
   * VPC (必須)
   * @description Security Group を作成する VPC
   */
  readonly vpc: ec2.IVpc;

  /**
   * ECS コンテナポート
   * @default 80
   */
  readonly containerPort?: number;
}

// SecurityGroupConstruct
export class SecurityGroupConstruct extends Construct {
  /** ALB 用 Security Group */
  public readonly albSecurityGroup: ec2.ISecurityGroup;

  /** ECS 用 Security Group */
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;

  /** Aurora 用 Security Group */
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;
}
```

---

## 7. 注意事項

### 技術的制約

| 項目 | 制約内容 |
|------|----------|
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| Aurora ポート | 3306 (MySQL) 固定 |
| ALB ポート | 80 (HTTP) / 443 (HTTPS) |

### セキュリティ考慮事項

1. **最小権限の原則**:
   - Aurora SG は ECS SG からの 3306 のみ許可
   - Aurora SG のアウトバウンドは完全に制限
   - ECS SG は ALB SG からのトラフィックのみ許可

2. **Security Group 参照**:
   - CIDR ベースではなく Security Group 参照を使用
   - これにより動的な IP 変更に対応

3. **外部アクセス遮断**:
   - Aurora への直接インターネットアクセスを遮断 (REQ-024)
   - Private DB Subnet + Security Group の二重保護

### CDK ベストプラクティス

1. **allowAllOutbound の使用**:
   - ALB/ECS: `allowAllOutbound: true` (VPC Endpoint 経由の通信に必要)
   - Aurora: `allowAllOutbound: false` (セキュリティ強化)

2. **Security Group 説明**:
   - 各 Security Group に明確な `description` を設定
   - 監査・トラブルシューティング時に役立つ

3. **インバウンドルールの追加**:
   - `addIngressRule()` を使用して明示的にルールを追加
   - Security Group 参照を使用する場合は `ec2.Peer.securityGroupId()` ではなく `securityGroup` オブジェクト直接参照

**参照元**:
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 8. 依存関係

### 前提タスク

| タスクID | 内容 | 状態 |
|---------|------|------|
| TASK-0004 | VPC Stack 統合 | 完了 |

### 後続タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0006 | Security Stack 作成 | Security Group Construct を使用 |
| TASK-0009 | ECS Cluster Construct 実装 | ECS Security Group を参照 |
| TASK-0013 | Aurora Construct 実装 | Aurora Security Group を参照 |

---

## 9. TDD 実装手順

### Requirements Phase
1. タスク定義書を確認し、要件を整理
2. Security Group の構成と通信ルールを明確化

### Testcases Phase
1. テストケース一覧を作成
2. 各テストケースの入力・期待値を定義

### Red Phase
1. `infra/test/security-group-construct.test.ts` を作成
2. 全テストケースを実装
3. テスト実行 → 全て失敗することを確認

### Green Phase
1. `infra/lib/construct/security/security-group-construct.ts` を作成
2. 最小限の実装でテストを通す
3. テスト実行 → 全て成功することを確認

### Refactor Phase
1. コードの整理・最適化
2. Props のデフォルト値設定
3. JSDoc コメント追加
4. 定数の抽出
5. テスト実行 → 全て成功することを確認

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
npm test -- security-group-construct.test.ts

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

- **総項目数**: 8項目 (主要実装項目)
- 🔵 **青信号**: 8項目 (100%)
- 🟡 **黄信号**: 0項目 (0%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質 - 全ての要件が要件定義書・設計文書により確認済み

---

## 12. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| ユーザストーリー | `docs/spec/aws-cdk-serverless-architecture/user-stories.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
| VPC Construct (参考) | `infra/lib/construct/vpc/vpc-construct.ts` |
| VPC Stack (参考) | `infra/lib/stack/vpc-stack.ts` |
| プロジェクト設定 | `infra/package.json` |
| TypeScript設定 | `infra/tsconfig.json` |
| CDK設定 | `infra/cdk.json` |
