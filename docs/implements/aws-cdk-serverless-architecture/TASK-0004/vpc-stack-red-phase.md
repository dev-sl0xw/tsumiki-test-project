# TDD Red Phase: VPC Stack 統合

**タスクID**: TASK-0004
**機能名**: VPC Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-17
**フェーズ**: Red Phase - 失敗するテストケースの作成

---

## 1. 作成したテストケース一覧

| テストID | 分類 | テスト内容 | 信頼性 |
|---------|------|-----------|--------|
| TC-VS-01 | 正常系 | スナップショットテスト | 🔵 |
| TC-VS-02 | 正常系 | VPC リソースの存在確認 | 🔵 |
| TC-VS-03 | 正常系 | Subnet の総数確認 | 🔵 |
| TC-VS-04 | 正常系 | Internet Gateway の存在確認 | 🔵 |
| TC-VS-05 | 正常系 | NAT Gateway の Multi-AZ 配置確認 | 🔵 |
| TC-VS-06 | 正常系 | VPC Endpoint の総数確認 | 🔵 |
| TC-VS-07 | 正常系 | vpc プロパティの公開確認 | 🔵 |
| TC-VS-08 | 正常系 | publicSubnets プロパティの公開確認 | 🔵 |
| TC-VS-09 | 正常系 | privateAppSubnets プロパティの公開確認 | 🔵 |
| TC-VS-10 | 正常系 | privateDbSubnets プロパティの公開確認 | 🔵 |
| TC-VS-11 | 正常系 | VpcConstruct 統合確認 | 🔵 |
| TC-VS-12 | 正常系 | EndpointsConstruct 統合確認 | 🔵 |
| TC-VS-14 | 異常系 | 無効な CIDR 指定時のエラー | 🟡 |
| TC-VS-15 | 境界値 | 空文字の vpcCidr でデフォルト値使用 | 🟡 |
| TC-VS-16 | 境界値 | 環境別設定での動作確認 | 🔵 |
| 追加 | 統合 | Route Table の作成確認 | 🟡 |
| 追加 | 統合 | タグ設定の確認 | 🟡 |

---

## 2. テストコード

### テストファイルパス

`infra/test/vpc-stack.test.ts`

### テストコード全文

```typescript
/**
 * VPC Stack テスト
 *
 * TASK-0004: VPC Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-VS-01: スナップショットテスト
 * - TC-VS-02: VPC リソースの存在確認
 * - TC-VS-03: Subnet の総数確認
 * - TC-VS-04: Internet Gateway の存在確認
 * - TC-VS-05: NAT Gateway の Multi-AZ 配置確認
 * - TC-VS-06: VPC Endpoint の総数確認
 * - TC-VS-07〜10: Stack 出力プロパティ確認
 * - TC-VS-11〜12: Construct 統合確認
 * - TC-VS-13〜14: 異常系テスト
 * - TC-VS-15〜16: 境界値テスト
 *
 * 🔵 信頼性: 要件定義書 REQ-001〜011、タスク定義書に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcStack } from '../lib/stack/vpc-stack';
import { devConfig, prodConfig, EnvironmentConfig } from '../parameter';

// ... (テストコードの全文は infra/test/vpc-stack.test.ts を参照)
```

---

## 3. 期待される失敗内容

### 失敗の種類

1. **モジュール不存在エラー（TypeScript コンパイルエラー）**
   - エラーメッセージ: `Cannot find module '../lib/stack/vpc-stack' or its corresponding type declarations`
   - 原因: `VpcStack` クラスがまだ実装されていない

### 失敗出力例

```
FAIL test/vpc-stack.test.ts
  ● Test suite failed to run

    test/vpc-stack.test.ts:24:26 - error TS2307: Cannot find module '../lib/stack/vpc-stack' or its corresponding type declarations.

    24 import { VpcStack } from '../lib/stack/vpc-stack';
                                ~~~~~~~~~~~~~~~~~~~~~~~~
```

---

## 4. Green フェーズで実装すべき内容

### 実装ファイル

`infra/lib/stack/vpc-stack.ts`

### 実装要件

1. **VpcStack クラスの作成**
   - `cdk.Stack` を継承
   - `VpcStackProps` インターフェースを定義（`config: EnvironmentConfig` を必須パラメータとして含む）

2. **VpcConstruct の統合**
   - `VpcConstruct` をインスタンス化
   - `props.config.vpcCidr` を CIDR として渡す

3. **EndpointsConstruct の統合**
   - `EndpointsConstruct` をインスタンス化
   - `VpcConstruct.vpc` を渡す

4. **公開プロパティの実装**
   - `vpc: ec2.IVpc` - VPC への参照
   - `publicSubnets: ec2.ISubnet[]` - Public Subnet 配列
   - `privateAppSubnets: ec2.ISubnet[]` - Private App Subnet 配列
   - `privateDbSubnets: ec2.ISubnet[]` - Private DB Subnet 配列

### 実装パターン

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcConstruct } from '../construct/vpc/vpc-construct';
import { EndpointsConstruct } from '../construct/vpc/endpoints-construct';
import { EnvironmentConfig } from '../../parameter';

export interface VpcStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateAppSubnets: ec2.ISubnet[];
  public readonly privateDbSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const vpcConstruct = new VpcConstruct(this, 'Vpc', {
      cidr: props.config.vpcCidr,
    });

    new EndpointsConstruct(this, 'Endpoints', {
      vpc: vpcConstruct.vpc,
    });

    this.vpc = vpcConstruct.vpc;
    this.publicSubnets = vpcConstruct.publicSubnets;
    this.privateAppSubnets = vpcConstruct.privateAppSubnets;
    this.privateDbSubnets = vpcConstruct.privateDbSubnets;
  }
}
```

---

## 5. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 13 | 76% |
| 🟡 黄信号 | 4 | 24% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - テストケースの76%が要件定義書・設計文書により確認済み

---

## 6. 品質判定結果

| 項目 | 状態 | コメント |
|------|------|----------|
| テスト実行 | ✅ 成功 | テストが実行され、期待通り失敗 |
| 期待値 | ✅ 明確 | 各テストケースに具体的な期待値を記載 |
| アサーション | ✅ 適切 | CDK assertions ライブラリを使用 |
| 実装方針 | ✅ 明確 | Green フェーズの実装内容を明示 |
| 信頼性レベル | ✅ 良好 | 🔵青信号が76%と高い |

---

## 7. 関連文書

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0004.md` |
| 要件定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0004/vpc-stack-requirements.md` |
| テストケース定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0004/vpc-stack-testcases.md` |
| テストファイル | `infra/test/vpc-stack.test.ts` |
| 実装ファイル（予定） | `infra/lib/stack/vpc-stack.ts` |
