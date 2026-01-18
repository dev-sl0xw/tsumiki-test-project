# TASK-0005: Security Group Construct 実装 - Red Phase 記録

**タスクID**: TASK-0005
**機能名**: Security Group Construct 実装
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD Red Phase
**作成日**: 2026-01-17

---

## 1. Red Phase 概要

### 1.1 目的

SecurityGroupConstruct の失敗するテストケースを作成し、実装すべき機能を明確に定義する。

### 1.2 作成したテストケース一覧

| テストID | テスト名 | 信頼性 | 状態 |
|---------|---------|--------|------|
| TC-SG-01 | ALB Security Group 作成確認 | 🔵 | 作成完了 |
| TC-SG-02 | ALB Security Group HTTP(80) インバウンド許可確認 | 🔵 | 作成完了 |
| TC-SG-03 | ALB Security Group HTTPS(443) インバウンド許可確認 | 🔵 | 作成完了 |
| TC-SG-04 | ECS Security Group 作成確認 | 🔵 | 作成完了 |
| TC-SG-05 | ECS Security Group ALB からのインバウンド許可確認 | 🔵 | 作成完了 |
| TC-SG-06 | ECS Security Group カスタム containerPort 確認 | 🔵 | 作成完了 |
| TC-SG-07 | Aurora Security Group 作成確認 | 🔵 | 作成完了 |
| TC-SG-08 | Aurora Security Group ECS からの 3306 インバウンド許可確認 | 🔵 | 作成完了 |
| TC-SG-09 | Aurora Security Group 外部アクセス遮断確認 | 🔵 | 作成完了 |
| TC-SG-10 | Aurora Security Group アウトバウンド制限確認 | 🔵 | 作成完了 |
| TC-SG-11 | 公開プロパティ存在確認 | 🔵 | 作成完了 |
| TC-SG-16 | containerPort デフォルト値 (80) 確認 | 🔵 | 作成完了 |
| TC-SG-17 | ECS SG が ALB SG を参照していること (CIDR ベースでないこと) | 🔵 | 作成完了 |
| TC-SG-18 | Aurora SG が ECS SG を参照していること (CIDR ベースでないこと) | 🔵 | 作成完了 |
| TC-SG-19 | ALB SG に HTTP/HTTPS 以外のインバウンドルールがないこと | 🔵 | 作成完了 |
| TC-SG-20 | ECS SG に ALB からのルール以外のインバウンドルールがないこと | 🔵 | 作成完了 |
| TC-SG-21 | Aurora SG に ECS からのルール以外のインバウンドルールがないこと | 🔵 | 作成完了 |
| TC-SG-22 | 作成される Security Group が 3 つであること | 🔵 | 作成完了 |

**合計**: 18 テストケース

---

## 2. テストコード

### 2.1 テストファイルパス

`infra/test/construct/security/security-group-construct.test.ts`

### 2.2 テストコード概要

```typescript
/**
 * Security Group Construct テスト
 *
 * TASK-0005: Security Group Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityGroupConstruct } from '../../../lib/construct/security/security-group-construct';

describe('SecurityGroupConstruct', () => {
  // テストケース実装...
});
```

---

## 3. 期待される失敗

### 3.1 失敗メッセージ

```
FAIL test/construct/security/security-group-construct.test.ts
  ● Test suite failed to run

    test/construct/security/security-group-construct.test.ts:33:40 - error TS2307:
    Cannot find module '../../../lib/construct/security/security-group-construct'
    or its corresponding type declarations.
```

### 3.2 失敗理由

`SecurityGroupConstruct` クラスがまだ実装されていないため、import 文でモジュールが見つからないエラーが発生する。

---

## 4. Green フェーズで実装すべき内容

### 4.1 実装ファイル

`infra/lib/construct/security/security-group-construct.ts`

### 4.2 実装インターフェース

```typescript
/**
 * SecurityGroupConstruct の Props インターフェース
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

### 4.3 実装要件

1. **ALB Security Group**:
   - HTTP(80) と HTTPS(443) を 0.0.0.0/0 から許可
   - `allowAllOutbound: true`
   - 説明に "ALB" を含める

2. **ECS Security Group**:
   - ALB SG からの containerPort (デフォルト 80) のみ許可
   - Security Group 参照（CIDR ではなく）を使用
   - `allowAllOutbound: true`
   - 説明に "ECS" を含める

3. **Aurora Security Group**:
   - ECS SG からの 3306 のみ許可
   - Security Group 参照（CIDR ではなく）を使用
   - `allowAllOutbound: false` （アウトバウンド制限）
   - 0.0.0.0/0 からのアクセスを遮断
   - 説明に "Aurora" または "MySQL" を含める

4. **公開プロパティ**:
   - `albSecurityGroup`
   - `ecsSecurityGroup`
   - `auroraSecurityGroup`

---

## 5. 品質判定結果

### 5.1 評価

| 項目 | 結果 |
|------|------|
| テスト実行 | ✅ 実行可能（失敗確認済み） |
| 期待値 | ✅ 明確で具体的 |
| アサーション | ✅ 適切 |
| 実装方針 | ✅ 明確 |
| 信頼性レベル | ✅ 🔵（青信号）が 100% |

### 5.2 総合評価

**✅ 高品質** - 全てのテストケースが要件定義書・設計文書に基づいており、実装方針が明確

---

## 6. 信頼性レベルサマリー

| レベル | テストケース数 | 割合 |
|--------|--------------|------|
| 🔵 青信号 | 18 | 100% |
| 🟡 黄信号 | 0 | 0% |
| 🔴 赤信号 | 0 | 0% |

---

## 7. 参照文書

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0005.md` |
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/note.md` |
| 要件整理 | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/security-group-requirements.md` |
| テストケース定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0005/security-group-testcases.md` |

---

## 8. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0005` で Green フェーズ（最小実装）を開始します。
