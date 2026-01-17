# TASK-0005: Security Group Construct 実装 - TDD用要件整理

**タスクID**: TASK-0005
**機能名**: Security Group Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17
**フェーズ**: Phase 1 - 基盤構築

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 何をする機能か 🔵

**信頼性**: 🔵 *TASK-0005.md・requirements.md REQ-024,025,028より*

SecurityGroupConstruct は、AWS CDK サーバーレスアーキテクチャにおける Security Group を一元管理する Construct である。以下の3つの Security Group を作成し、最小権限の原則に基づいたセキュリティルールを設定する。

1. **ALB Security Group**: Internet-facing ALB 用。HTTP(80) と HTTPS(443) のインバウンドトラフィックを許可
2. **ECS Security Group**: ECS Fargate タスク用。ALB からのトラフィックのみを許可
3. **Aurora Security Group**: Aurora MySQL 用。ECS からの 3306 ポートアクセスのみを許可し、外部アクセスを遮断

### 1.2 どのような問題を解決するか 🔵

**信頼性**: 🔵 *requirements.md REQ-024,025、dataflow.md セキュリティ境界設計より*

- **セキュリティ境界の明確化**: 3層構成（ALB/ECS/Aurora）での通信を Security Group で制御
- **外部からのDB直接アクセス防止**: Aurora への直接インターネットアクセスを Security Group レベルで遮断
- **最小権限の原則適用**: 必要最小限のポートとソースのみを許可

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **インフラエンジニア**: CDK Stack を使用してインフラを構築
- **セキュリティ担当者**: Security Group ルールを監査

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.md CDK Stack構成より*

- **配置場所**: `infra/lib/construct/security/security-group-construct.ts`
- **所属Stack**: Security Stack
- **依存関係**:
  - 前提: VPC Stack (TASK-0004) - VPC を参照
  - 後続: Database Stack, Application Stack - Security Group を参照

**参照したEARS要件**: REQ-024, REQ-025, REQ-028, REQ-029
**参照した設計文書**: architecture.md (CDK Stack構成、セキュリティ・配信層セクション)

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ（Props） 🔵

**信頼性**: 🔵 *TASK-0005.md・note.md 型定義より*

```typescript
/**
 * SecurityGroupConstruct の Props インターフェース
 */
export interface SecurityGroupConstructProps {
  /**
   * VPC (必須)
   * @description Security Group を作成する VPC
   * @type ec2.IVpc
   */
  readonly vpc: ec2.IVpc;

  /**
   * ECS コンテナポート (オプション)
   * @default 80
   * @description ALB から ECS へのトラフィックで使用するポート
   * @type number
   * @minimum 1
   * @maximum 65535
   */
  readonly containerPort?: number;
}
```

| パラメータ | 型 | 必須 | デフォルト | 制約 |
|-----------|-----|------|-----------|------|
| vpc | ec2.IVpc | はい | - | VPC Stack で作成された VPC |
| containerPort | number | いいえ | 80 | 1-65535 |

### 2.2 出力値（公開プロパティ） 🔵

**信頼性**: 🔵 *TASK-0005.md・note.md 型定義より*

```typescript
/**
 * SecurityGroupConstruct の公開プロパティ
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

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| albSecurityGroup | ec2.ISecurityGroup | ALB 用 Security Group。後続の ALB Construct で参照 |
| ecsSecurityGroup | ec2.ISecurityGroup | ECS 用 Security Group。後続の ECS Service で参照 |
| auroraSecurityGroup | ec2.ISecurityGroup | Aurora 用 Security Group。後続の Aurora Construct で参照 |

### 2.3 入出力の関係性 🔵

**信頼性**: 🔵 *architecture.md Stack依存関係より*

```
入力: VPC (vpc-stack.ts) + containerPort (パラメータ)
         ↓
   SecurityGroupConstruct
         ↓
出力: 3つの Security Group
         ↓
参照: Database Stack (Aurora SG), Application Stack (ALB SG, ECS SG)
```

### 2.4 データフロー 🔵

**信頼性**: 🔵 *dataflow.md セキュリティ境界セクションより*

```
Internet → WAF → CloudFront → ALB (ALB SG: 80,443 from 0.0.0.0/0)
                               ↓
                          ECS (ECS SG: containerPort from ALB SG)
                               ↓
                          Aurora (Aurora SG: 3306 from ECS SG, outbound blocked)
```

**参照したEARS要件**: REQ-024, REQ-025, REQ-028, REQ-029
**参照した設計文書**: interfaces.ts (型定義)、dataflow.md (セキュリティ境界)

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 セキュリティ要件 🔵

**信頼性**: 🔵 *requirements.md REQ-024,025、NFR-101〜105より*

| 要件ID | 制約内容 |
|--------|----------|
| REQ-024 | Aurora Security Group で外部からの直接アクセスを遮断 |
| REQ-025 | Aurora Security Group で ECS SG からの 3306 のみ許可 |
| NFR-101 | VPC Endpoint を使用してトラフィックを AWS 内部に閉じる |

### 3.2 Security Group ルール制約 🔵

**信頼性**: 🔵 *TASK-0005.md 最小権限の原則より*

| Security Group | インバウンド | アウトバウンド |
|----------------|-------------|---------------|
| ALB SG | 0.0.0.0/0:80, 0.0.0.0/0:443 | All (allowAllOutbound: true) |
| ECS SG | ALB SG:containerPort | All (allowAllOutbound: true) |
| Aurora SG | ECS SG:3306 | なし (allowAllOutbound: false) |

### 3.3 アーキテクチャ制約 🔵

**信頼性**: 🔵 *architecture.md 技術的制約より*

| 項目 | 制約内容 |
|------|----------|
| リージョン | ap-northeast-1 (Tokyo) 固定 |
| IaC | AWS CDK v2 (TypeScript) |
| Aurora ポート | 3306 (MySQL) 固定 |
| ALB ポート | 80 (HTTP) / 443 (HTTPS) |

### 3.4 CDK ベストプラクティス制約 🔵

**信頼性**: 🔵 *note.md CDKベストプラクティスより*

| 項目 | 制約内容 |
|------|----------|
| Security Group 参照 | CIDR ではなく Security Group オブジェクト直接参照を使用 |
| allowAllOutbound | ALB/ECS は true（VPC Endpoint 通信に必要）、Aurora は false |
| description | 各 Security Group に明確な説明を設定 |

### 3.5 パフォーマンス制約 🟡

**信頼性**: 🟡 *AWS Security Group仕様からの妥当な推測*

| 項目 | 制約内容 |
|------|----------|
| Security Group ルール数 | 1 Security Group あたり最大 60 インバウンド + 60 アウトバウンド |
| Security Group 参照数 | 1 ENI あたり最大 5 Security Group |

**参照したEARS要件**: REQ-024, REQ-025, REQ-028, REQ-029, NFR-101〜105
**参照した設計文書**: architecture.md (技術的制約)、note.md (CDKベストプラクティス)

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *TASK-0005.md、note.md より*

#### 4.1.1 デフォルト設定での使用

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SecurityGroupConstruct } from '../lib/construct/security/security-group-construct';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'TestStack');
const vpc = new ec2.Vpc(stack, 'Vpc');

// デフォルト containerPort = 80
const securityGroups = new SecurityGroupConstruct(stack, 'SecurityGroups', {
  vpc,
});

// 出力プロパティの参照
console.log(securityGroups.albSecurityGroup.securityGroupId);
console.log(securityGroups.ecsSecurityGroup.securityGroupId);
console.log(securityGroups.auroraSecurityGroup.securityGroupId);
```

#### 4.1.2 カスタム containerPort での使用

```typescript
const securityGroups = new SecurityGroupConstruct(stack, 'SecurityGroups', {
  vpc,
  containerPort: 8080, // カスタムポート
});
```

### 4.2 データフロー（正常ケース） 🔵

**信頼性**: 🔵 *dataflow.md より*

1. **ALB → ECS 通信**
   - ALB が ECS Security Group の containerPort にアクセス
   - ALB SG を参照するため、Security Group 間参照で許可

2. **ECS → Aurora 通信**
   - ECS タスクが Aurora の 3306 ポートにアクセス
   - ECS SG を参照するため、Security Group 間参照で許可

### 4.3 エッジケース 🔵

**信頼性**: 🔵 *TASK-0005.md テスト要件より*

| ケースID | ケース | 期待結果 |
|---------|--------|----------|
| EDGE-SG-01 | 外部 (0.0.0.0/0) から Aurora への直接接続試行 | Security Group でブロック |
| EDGE-SG-02 | ALB 以外のソースから ECS への接続試行 | Security Group でブロック |
| EDGE-SG-03 | ECS 以外のソースから Aurora への接続試行 | Security Group でブロック |
| EDGE-SG-04 | Aurora からの外向きトラフィック試行 | Security Group でブロック |

### 4.4 エラーケース 🟡

**信頼性**: 🟡 *CDK仕様からの妥当な推測*

| ケースID | ケース | 期待結果 |
|---------|--------|----------|
| ERR-SG-01 | vpc が undefined の場合 | CDK 合成時にエラー |
| ERR-SG-02 | containerPort が範囲外（0以下、65536以上）の場合 | CDK 合成時にエラー |

**参照したEARS要件**: REQ-024, REQ-025
**参照した設計文書**: dataflow.md (セキュリティ境界フロー)

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー 🔵

**信頼性**: 🔵 *user-stories.md より*

- **インフラエンジニアとして**: セキュアなネットワーク構成を CDK で構築したい
- **セキュリティ担当者として**: Security Group ルールが最小権限の原則に従っていることを確認したい

### 5.2 参照した機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 内容 | 本Constructでの対応 |
|--------|------|-------------------|
| REQ-024 | Aurora SG で外部からの直接アクセスを遮断 | Aurora SG でインバウンドを ECS SG:3306 のみに制限 |
| REQ-025 | Aurora SG で ECS SG からの 3306 のみ許可 | addIngressRule で ECS SG 参照、Port 3306 |
| REQ-028 | ALB を Public Subnet に配置、Internet-facing | ALB SG で 0.0.0.0/0 から 80,443 を許可 |
| REQ-029 | HTTP→HTTPS リダイレクト | ALB SG で 80,443 両方を許可（リダイレクト対応） |

### 5.3 参照した非機能要件 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 内容 | 本Constructでの対応 |
|--------|------|-------------------|
| NFR-101 | VPC Endpoint でトラフィックを AWS 内部に閉じる | ECS SG で allowAllOutbound: true（Endpoint通信用） |
| NFR-103 | WAF で Web アプリを保護 | ALB SG で HTTP/HTTPS のみ許可（WAF は別 Construct） |
| NFR-105 | HTTPS を強制 | ALB SG で 443 を許可 |

### 5.4 参照したEdgeケース 🔵

**信頼性**: 🔵 *requirements.md より*

| 要件ID | 内容 | 本Constructでの対応 |
|--------|------|-------------------|
| EDGE-001 | NAT Gateway 障害時のフェイルオーバー | Security Group 設計とは無関係（VPC レベル） |
| EDGE-002 | ECS タスク失敗時の自動起動 | Security Group 設計とは無関係（ECS Service レベル） |

### 5.5 参照した受け入れ基準 🔵

**信頼性**: 🔵 *acceptance-criteria.md・TASK-0005.md より*

- [ ] SecurityGroupConstruct クラスが `lib/construct/security/security-group-construct.ts` に実装されている
- [ ] ALB 用 Security Group が作成され、HTTP(80)/HTTPS(443) インバウンドが許可されている
- [ ] ECS 用 Security Group が作成され、ALB からのトラフィックのみ許可されている
- [ ] Aurora 用 Security Group が作成され、ECS SG からの 3306 のみ許可されている
- [ ] Aurora SG で外部からの直接アクセスが遮断されている
- [ ] Aurora SG でアウトバウンドトラフィックが制限されている
- [ ] 単体テストがすべて成功する

### 5.6 参照した設計文書

| 文書 | 参照セクション |
|------|--------------|
| **アーキテクチャ** | architecture.md - CDK Stack構成、セキュリティ・配信層、技術的制約 |
| **データフロー** | dataflow.md - セキュリティ境界設計 |
| **型定義** | interfaces.ts - SecurityGroupConstructProps |
| **タスクノート** | note.md - 技術スタック、開発ルール、関連実装、テスト要件 |

---

## 6. テストケース概要 🔵

**信頼性**: 🔵 *TASK-0005.md、note.md より*

### 6.1 ALB Security Group テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SG-01 | ALB Security Group が作成されること | Security Group リソースが存在 |
| TC-SG-02 | HTTP(80) インバウンドが 0.0.0.0/0 から許可されていること | Ingress ルールが存在 |
| TC-SG-03 | HTTPS(443) インバウンドが 0.0.0.0/0 から許可されていること | Ingress ルールが存在 |

### 6.2 ECS Security Group テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SG-04 | ECS Security Group が作成されること | Security Group リソースが存在 |
| TC-SG-05 | ALB SG からの containerPort インバウンドのみ許可されていること | Ingress ルールが ALB SG 参照 |
| TC-SG-06 | 外部からの直接アクセスが許可されていないこと | 0.0.0.0/0 ルールが存在しない |

### 6.3 Aurora Security Group テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SG-07 | Aurora Security Group が作成されること | Security Group リソースが存在 |
| TC-SG-08 | ECS SG からの 3306 インバウンドのみ許可されていること | Ingress ルールが ECS SG 参照 |
| TC-SG-09 | 0.0.0.0/0 からの直接アクセスが許可されていないこと | 0.0.0.0/0 ルールが存在しない |
| TC-SG-10 | アウトバウンドトラフィックが制限されていること | allowAllOutbound: false |

### 6.4 最小権限テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SG-11 | 各 SG に不要なルールが含まれていないこと | 定義ルール以外が存在しない |
| TC-SG-12 | Security Group 間の参照関係が正しいこと | SG 参照が正しく設定 |

---

## 7. 実装ファイル構成 🔵

**信頼性**: 🔵 *note.md ディレクトリ構造より*

### 7.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `infra/lib/construct/security/security-group-construct.ts` | Security Group Construct 実装 |
| `infra/test/security-group-construct.test.ts` | Security Group Construct テスト |

### 7.2 ディレクトリ構成

```
infra/
├── lib/
│   └── construct/
│       └── security/
│           └── security-group-construct.ts  # 実装対象
└── test/
    └── security-group-construct.test.ts     # テストファイル
```

---

## 8. 依存関係 🔵

**信頼性**: 🔵 *TASK-0005.md、note.md より*

### 8.1 前提タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0004 | VPC Stack 統合 | VPC を参照 |

### 8.2 後続タスク

| タスクID | 内容 | 依存理由 |
|---------|------|----------|
| TASK-0006 | Security Stack 作成 | SecurityGroupConstruct を使用 |
| TASK-0009 | ECS Cluster Construct 実装 | ECS SG を参照 |
| TASK-0013 | Aurora Construct 実装 | Aurora SG を参照 |

---

## 9. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 22 | 92% |
| 🟡 黄信号 | 2 | 8% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ **高品質** - 要件の大部分が要件定義書・設計文書により確認済み

### 信頼性レベル詳細

| セクション | 🔵 | 🟡 | 🔴 |
|-----------|-----|-----|-----|
| 1. 機能の概要 | 4 | 0 | 0 |
| 2. 入出力仕様 | 4 | 0 | 0 |
| 3. 制約条件 | 4 | 1 | 0 |
| 4. 使用例 | 3 | 1 | 0 |
| 5. 要件対応関係 | 6 | 0 | 0 |
| 6. テストケース | 1 | 0 | 0 |

---

## 10. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/note.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| VPC Construct (参考) | `infra/lib/construct/vpc/vpc-construct.ts` |
| タスク概要 | `docs/tasks/aws-cdk-serverless-architecture/overview.md` |
