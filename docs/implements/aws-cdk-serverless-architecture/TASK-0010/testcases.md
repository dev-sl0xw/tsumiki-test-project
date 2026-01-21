# TASK-0010: Database Stack 統合 - テストケース定義書

**タスクID**: TASK-0010
**タスクタイプ**: TDD
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-21
**テストファイル**: `infra/test/database-stack.test.ts`

**【信頼性レベル凡例】**:
- **青信号**: EARS要件定義書・設計文書・タスク定義書・ユーザヒアリングを参考にした確実な要件
- **黄信号**: EARS要件定義書・設計文書・タスク定義書・ユーザヒアリングから妥当な推測による要件
- **赤信号**: EARS要件定義書・設計文書・タスク定義書・ユーザヒアリングにない推測による要件

---

## 1. テストケース概要

### 1.1 テストカテゴリ

| カテゴリ | テストケース数 | 信頼性 |
|---------|---------------|--------|
| スナップショットテスト | 1 | 🔵 |
| リソース存在確認テスト | 3 | 🔵 |
| 依存関係テスト | 2 | 🔵 |
| プロパティ公開テスト | 4 | 🔵 |
| CfnOutput テスト | 4 | 🔵 |
| セキュリティ設定テスト | 3 | 🔵 |
| **合計** | **17** | **100% 🔵** |

### 1.2 テストケース一覧

| テストID | カテゴリ | 内容 | 信頼性 |
|----------|----------|------|--------|
| TC-DS-01 | スナップショット | Database Stack が正常に合成できること | 🔵 |
| TC-DS-02 | リソース存在確認 | Aurora クラスターリソースが存在すること | 🔵 |
| TC-DS-03 | リソース存在確認 | Secrets Manager シークレットが存在すること | 🔵 |
| TC-DS-04 | リソース存在確認 | KMS キーが存在すること | 🔵 |
| TC-DS-05 | 依存関係 | VPC Stack から VPC 参照を受け取れること | 🔵 |
| TC-DS-06 | 依存関係 | Security Stack から auroraSecurityGroup を受け取れること | 🔵 |
| TC-DS-07 | プロパティ公開 | auroraCluster プロパティが公開されていること | 🔵 |
| TC-DS-08 | プロパティ公開 | dbSecret プロパティが公開されていること | 🔵 |
| TC-DS-09 | プロパティ公開 | dbEndpoint プロパティが公開されていること | 🔵 |
| TC-DS-10 | プロパティ公開 | dbPort プロパティが公開されていること | 🔵 |
| TC-DS-11 | CfnOutput | DbEndpoint がエクスポートされていること | 🔵 |
| TC-DS-12 | CfnOutput | DbPort がエクスポートされていること | 🔵 |
| TC-DS-13 | CfnOutput | DbSecretArn がエクスポートされていること | 🔵 |
| TC-DS-14 | CfnOutput | AuroraClusterArn がエクスポートされていること | 🔵 |
| TC-DS-15 | セキュリティ設定 | Aurora クラスターが Private Isolated Subnet に配置されていること | 🔵 |
| TC-DS-16 | セキュリティ設定 | ストレージ暗号化が有効であること | 🔵 |
| TC-DS-17 | セキュリティ設定 | 自動バックアップが設定されていること | 🔵 |

---

## 2. テストケース詳細

### 2.1 スナップショットテスト

#### TC-DS-01: Database Stack が正常に合成できること

**信頼性**: 🔵 *CDK ベストプラクティス、vpc-stack.test.ts パターンより*

| 項目 | 内容 |
|------|------|
| テスト目的 | CloudFormation テンプレートの一貫性を保証する |
| テスト内容 | Database Stack の CloudFormation テンプレートをスナップショットと比較 |
| 前提条件 | devConfig を使用して Database Stack を生成 |
| 期待される動作 | テンプレートがスナップショットと一致する |
| 検証方法 | `expect(template.toJSON()).toMatchSnapshot()` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-01: スナップショットテスト', () => {
  test('CloudFormation テンプレートのスナップショットテスト', () => {
    // 【テストデータ準備】: 独立した CDK App と関連 Stack を作成
    const snapshotApp = new cdk.App();
    const snapshotEnv = {
      account: '123456789012',
      region: 'ap-northeast-1',
    };

    // 【前提 Stack 作成】: VPC Stack の模擬
    const snapshotVpcStack = new cdk.Stack(snapshotApp, 'SnapshotVpcStack', { env: snapshotEnv });
    const snapshotVpc = new ec2.Vpc(snapshotVpcStack, 'SnapshotVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'PrivateApp', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 23 },
        { name: 'PrivateDb', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });
    const snapshotAuroraSg = new ec2.SecurityGroup(snapshotVpcStack, 'SnapshotAuroraSg', {
      vpc: snapshotVpc,
      description: 'Test Aurora Security Group',
      allowAllOutbound: false,
    });

    // 【実際の処理実行】: Database Stack を作成
    const snapshotStack = new DatabaseStack(snapshotApp, 'SnapshotDatabaseStack', {
      vpc: snapshotVpc,
      auroraSecurityGroup: snapshotAuroraSg,
      config: devConfig,
      env: snapshotEnv,
    });
    const snapshotTemplate = Template.fromStack(snapshotStack);

    // 【結果検証】: スナップショットとの一致を確認
    expect(snapshotTemplate.toJSON()).toMatchSnapshot();
  });
});
```

---

### 2.2 リソース存在確認テスト

#### TC-DS-02: Aurora クラスターリソースが存在すること

**信頼性**: 🔵 *REQ-022、TASK-0010.md より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が Aurora クラスターを正しく作成することを確認 |
| テスト内容 | AWS::RDS::DBCluster リソースが 1 つ存在することを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | Aurora クラスターリソースが 1 つ存在する |
| 検証方法 | `template.resourceCountIs('AWS::RDS::DBCluster', 1)` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-02: Aurora クラスターリソース存在確認', () => {
  test('AWS::RDS::DBCluster が 1 つ作成されること', () => {
    // 【検証項目】: DBCluster リソースの数
    template.resourceCountIs('AWS::RDS::DBCluster', 1);
  });

  test('Aurora が Serverless v2 として作成されること', () => {
    // 【検証項目】: ServerlessV2ScalingConfiguration の存在
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      ServerlessV2ScalingConfiguration: Match.objectLike({
        MinCapacity: devConfig.auroraMinCapacity,
        MaxCapacity: devConfig.auroraMaxCapacity,
      }),
    });
  });
});
```

---

#### TC-DS-03: Secrets Manager シークレットが存在すること

**信頼性**: 🔵 *SMR-001、TASK-0009.md より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が Secrets Manager シークレットを作成することを確認 |
| テスト内容 | AWS::SecretsManager::Secret リソースが存在することを検証 |
| 前提条件 | Database Stack が AuroraConstruct を正しく統合している |
| 期待される動作 | Secrets Manager シークレットリソースが存在する |
| 検証方法 | `template.resourceCountIs('AWS::SecretsManager::Secret', 1)` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-03: Secrets Manager シークレット存在確認', () => {
  test('AWS::SecretsManager::Secret が作成されること', () => {
    // 【検証項目】: Secret リソースの存在
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });

  test('シークレットの GenerateSecretString が設定されていること', () => {
    // 【検証項目】: パスワード自動生成設定
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: Match.objectLike({
        SecretStringTemplate: Match.anyValue(),
        GenerateStringKey: 'password',
      }),
    });
  });
});
```

---

#### TC-DS-04: KMS キーが存在すること

**信頼性**: 🔵 *REQ-026、NFR-102 より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Aurora ストレージ暗号化用の KMS キーが作成されることを確認 |
| テスト内容 | AWS::KMS::Key リソースが存在することを検証 |
| 前提条件 | Database Stack が AuroraConstruct を正しく統合している |
| 期待される動作 | KMS キーリソースが存在する |
| 検証方法 | `template.resourceCountIs('AWS::KMS::Key', 1)` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-04: KMS キー存在確認', () => {
  test('AWS::KMS::Key が作成されること', () => {
    // 【検証項目】: KMS キーリソースの存在
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('KMS キーにキーローテーションが有効であること', () => {
    // 【検証項目】: キーローテーション設定
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });
});
```

---

### 2.3 依存関係テスト

#### TC-DS-05: VPC Stack から VPC 参照を受け取れること

**信頼性**: 🔵 *architecture.md Stack 依存関係、TASK-0010.md より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が VPC Stack から VPC を正しく受け取ることを確認 |
| テスト内容 | Props で受け取った VPC が Aurora に設定されていることを検証 |
| 前提条件 | VPC が Props として渡されている |
| 期待される動作 | Aurora の DBSubnetGroup が VPC のサブネットを参照 |
| 検証方法 | DBSubnetGroup の SubnetIds 設定確認 |

**テストコードスケルトン**:

```typescript
describe('TC-DS-05: VPC 依存関係確認', () => {
  test('DBSubnetGroup が作成されること', () => {
    // 【検証項目】: DBSubnetGroup リソースの存在
    template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
  });

  test('DBSubnetGroup に SubnetIds が設定されていること', () => {
    // 【検証項目】: SubnetIds の設定確認
    const subnetGroups = template.findResources('AWS::RDS::DBSubnetGroup');
    const subnetGroupValues = Object.values(subnetGroups);
    expect(subnetGroupValues.length).toBeGreaterThan(0);

    const subnetIds = subnetGroupValues[0].Properties.SubnetIds;
    expect(subnetIds).toBeDefined();
    expect(Array.isArray(subnetIds)).toBe(true);
    expect(subnetIds.length).toBeGreaterThanOrEqual(2); // Multi-AZ
  });
});
```

---

#### TC-DS-06: Security Stack から auroraSecurityGroup を受け取れること

**信頼性**: 🔵 *architecture.md Stack 依存関係、TASK-0010.md より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が Security Stack から Aurora Security Group を正しく受け取ることを確認 |
| テスト内容 | Props で受け取った Security Group が Aurora に設定されていることを検証 |
| 前提条件 | auroraSecurityGroup が Props として渡されている |
| 期待される動作 | Aurora クラスターの VpcSecurityGroupIds に設定 |
| 検証方法 | DBCluster の VpcSecurityGroupIds 設定確認 |

**テストコードスケルトン**:

```typescript
describe('TC-DS-06: Security Stack 依存関係確認', () => {
  test('Aurora クラスターに VpcSecurityGroupIds が設定されていること', () => {
    // 【検証項目】: VpcSecurityGroupIds の存在
    const clusters = template.findResources('AWS::RDS::DBCluster');
    const clusterValues = Object.values(clusters);
    expect(clusterValues.length).toBe(1);

    const vpcSecurityGroupIds = clusterValues[0].Properties.VpcSecurityGroupIds;
    expect(vpcSecurityGroupIds).toBeDefined();
    expect(Array.isArray(vpcSecurityGroupIds)).toBe(true);
    expect(vpcSecurityGroupIds.length).toBeGreaterThan(0);
  });
});
```

---

### 2.4 プロパティ公開テスト

#### TC-DS-07: auroraCluster プロパティが公開されていること

**信頼性**: 🔵 *TASK-0010.md、note.md 公開プロパティより*

| 項目 | 内容 |
|------|------|
| テスト目的 | DatabaseStack.auroraCluster が定義されていることを確認 |
| テスト内容 | auroraCluster プロパティがアクセス可能で、IDatabaseCluster 型であることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | auroraCluster プロパティが定義され、clusterArn が取得可能 |
| 検証方法 | `expect(stack.auroraCluster).toBeDefined()` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-07: auroraCluster プロパティ公開確認', () => {
  test('auroraCluster プロパティが定義されていること', () => {
    // 【検証項目】: auroraCluster プロパティの存在
    expect(stack.auroraCluster).toBeDefined();
  });

  test('auroraCluster の clusterArn が取得可能であること', () => {
    // 【検証項目】: clusterArn の取得可能性
    expect(stack.auroraCluster.clusterArn).toBeDefined();
  });
});
```

---

#### TC-DS-08: dbSecret プロパティが公開されていること

**信頼性**: 🔵 *TASK-0010.md、note.md 公開プロパティより*

| 項目 | 内容 |
|------|------|
| テスト目的 | DatabaseStack.dbSecret が定義されていることを確認 |
| テスト内容 | dbSecret プロパティがアクセス可能で、ISecret 型であることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | dbSecret プロパティが定義され、secretArn が取得可能 |
| 検証方法 | `expect(stack.dbSecret).toBeDefined()` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-08: dbSecret プロパティ公開確認', () => {
  test('dbSecret プロパティが定義されていること', () => {
    // 【検証項目】: dbSecret プロパティの存在
    expect(stack.dbSecret).toBeDefined();
  });

  test('dbSecret の secretArn が取得可能であること', () => {
    // 【検証項目】: secretArn の取得可能性
    expect(stack.dbSecret.secretArn).toBeDefined();
  });
});
```

---

#### TC-DS-09: dbEndpoint プロパティが公開されていること

**信頼性**: 🔵 *TASK-0010.md、note.md 公開プロパティより*

| 項目 | 内容 |
|------|------|
| テスト目的 | DatabaseStack.dbEndpoint が定義されていることを確認 |
| テスト内容 | dbEndpoint プロパティがアクセス可能で、string 型であることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | dbEndpoint プロパティが string 型で定義されている |
| 検証方法 | `expect(stack.dbEndpoint).toBeDefined()` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-09: dbEndpoint プロパティ公開確認', () => {
  test('dbEndpoint プロパティが定義されていること', () => {
    // 【検証項目】: dbEndpoint プロパティの存在
    expect(stack.dbEndpoint).toBeDefined();
  });

  test('dbEndpoint が string 型であること', () => {
    // 【検証項目】: 型の確認
    expect(typeof stack.dbEndpoint).toBe('string');
  });
});
```

---

#### TC-DS-10: dbPort プロパティが公開されていること

**信頼性**: 🔵 *TASK-0010.md、note.md 公開プロパティより*

| 項目 | 内容 |
|------|------|
| テスト目的 | DatabaseStack.dbPort が定義されていることを確認 |
| テスト内容 | dbPort プロパティがアクセス可能で、number 型であることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | dbPort プロパティが number 型で定義されている |
| 検証方法 | `expect(stack.dbPort).toBeDefined()` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-10: dbPort プロパティ公開確認', () => {
  test('dbPort プロパティが定義されていること', () => {
    // 【検証項目】: dbPort プロパティの存在
    expect(stack.dbPort).toBeDefined();
  });

  test('dbPort が number 型であること', () => {
    // 【検証項目】: 型の確認
    expect(typeof stack.dbPort).toBe('number');
  });

  test('dbPort が 3306 であること', () => {
    // 【検証項目】: MySQL デフォルトポート
    expect(stack.dbPort).toBe(3306);
  });
});
```

---

### 2.5 CfnOutput テスト

#### TC-DS-11: DbEndpoint がエクスポートされていること

**信頼性**: 🔵 *TASK-0010.md、CDK ベストプラクティスより*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が DbEndpoint を CfnOutput でエクスポートすることを確認 |
| テスト内容 | DbEndpoint の CfnOutput が存在し、exportName が設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | DbEndpoint が `${envName}-DbEndpoint` でエクスポート |
| 検証方法 | `template.hasOutput('DbEndpoint', {...})` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-11: DbEndpoint CfnOutput 確認', () => {
  test('DbEndpoint がエクスポートされていること', () => {
    // 【検証項目】: CfnOutput の存在
    template.hasOutput('DbEndpoint', {
      Value: Match.anyValue(),
      Export: {
        Name: `${devConfig.envName}-DbEndpoint`,
      },
    });
  });
});
```

---

#### TC-DS-12: DbPort がエクスポートされていること

**信頼性**: 🔵 *TASK-0010.md、CDK ベストプラクティスより*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が DbPort を CfnOutput でエクスポートすることを確認 |
| テスト内容 | DbPort の CfnOutput が存在し、exportName が設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | DbPort が `${envName}-DbPort` でエクスポート |
| 検証方法 | `template.hasOutput('DbPort', {...})` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-12: DbPort CfnOutput 確認', () => {
  test('DbPort がエクスポートされていること', () => {
    // 【検証項目】: CfnOutput の存在
    template.hasOutput('DbPort', {
      Value: Match.anyValue(),
      Export: {
        Name: `${devConfig.envName}-DbPort`,
      },
    });
  });
});
```

---

#### TC-DS-13: DbSecretArn がエクスポートされていること

**信頼性**: 🔵 *TASK-0010.md、CDK ベストプラクティスより*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が DbSecretArn を CfnOutput でエクスポートすることを確認 |
| テスト内容 | DbSecretArn の CfnOutput が存在し、exportName が設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | DbSecretArn が `${envName}-DbSecretArn` でエクスポート |
| 検証方法 | `template.hasOutput('DbSecretArn', {...})` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-13: DbSecretArn CfnOutput 確認', () => {
  test('DbSecretArn がエクスポートされていること', () => {
    // 【検証項目】: CfnOutput の存在
    template.hasOutput('DbSecretArn', {
      Value: Match.anyValue(),
      Export: {
        Name: `${devConfig.envName}-DbSecretArn`,
      },
    });
  });
});
```

---

#### TC-DS-14: AuroraClusterArn がエクスポートされていること

**信頼性**: 🔵 *TASK-0010.md、CDK ベストプラクティスより*

| 項目 | 内容 |
|------|------|
| テスト目的 | Database Stack が AuroraClusterArn を CfnOutput でエクスポートすることを確認 |
| テスト内容 | AuroraClusterArn の CfnOutput が存在し、exportName が設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | AuroraClusterArn が `${envName}-AuroraClusterArn` でエクスポート |
| 検証方法 | `template.hasOutput('AuroraClusterArn', {...})` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-14: AuroraClusterArn CfnOutput 確認', () => {
  test('AuroraClusterArn がエクスポートされていること', () => {
    // 【検証項目】: CfnOutput の存在
    template.hasOutput('AuroraClusterArn', {
      Value: Match.anyValue(),
      Export: {
        Name: `${devConfig.envName}-AuroraClusterArn`,
      },
    });
  });
});
```

---

### 2.6 セキュリティ設定テスト

#### TC-DS-15: Aurora クラスターが Private Isolated Subnet に配置されていること

**信頼性**: 🔵 *REQ-023、architecture.md より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Aurora クラスターが Private Isolated Subnet に配置されることを確認 |
| テスト内容 | DBSubnetGroup が適切なサブネットを参照していることを検証 |
| 前提条件 | VPC が Private Isolated Subnet を持っている |
| 期待される動作 | Aurora が Private Isolated Subnet に配置 |
| 検証方法 | DBSubnetGroup の設定確認 |

**テストコードスケルトン**:

```typescript
describe('TC-DS-15: Private Isolated Subnet 配置確認', () => {
  test('AWS::RDS::DBSubnetGroup が作成されること', () => {
    // 【検証項目】: DBSubnetGroup リソースの存在
    template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
  });

  test('DBInstance が PubliclyAccessible: false であること', () => {
    // 【検証項目】: パブリックアクセス無効
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      PubliclyAccessible: false,
    });
  });
});
```

---

#### TC-DS-16: ストレージ暗号化が有効であること

**信頼性**: 🔵 *REQ-026、NFR-102 より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Aurora クラスターのストレージ暗号化が有効であることを確認 |
| テスト内容 | StorageEncrypted が true に設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | StorageEncrypted: true が設定 |
| 検証方法 | `template.hasResourceProperties('AWS::RDS::DBCluster', { StorageEncrypted: true })` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-16: ストレージ暗号化確認', () => {
  test('StorageEncrypted が true であること', () => {
    // 【検証項目】: ストレージ暗号化の有効化
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true,
    });
  });

  test('KmsKeyId が設定されていること', () => {
    // 【検証項目】: 暗号化キーの関連付け
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      KmsKeyId: Match.anyValue(),
    });
  });
});
```

---

#### TC-DS-17: 自動バックアップが設定されていること

**信頼性**: 🔵 *REQ-027 より*

| 項目 | 内容 |
|------|------|
| テスト目的 | Aurora クラスターの自動バックアップが有効であることを確認 |
| テスト内容 | BackupRetentionPeriod が設定されていることを検証 |
| 前提条件 | Database Stack が正常に作成されている |
| 期待される動作 | BackupRetentionPeriod >= 1 が設定 |
| 検証方法 | `template.hasResourceProperties('AWS::RDS::DBCluster', { BackupRetentionPeriod: 7 })` |

**テストコードスケルトン**:

```typescript
describe('TC-DS-17: 自動バックアップ確認', () => {
  test('BackupRetentionPeriod が設定されていること', () => {
    // 【検証項目】: バックアップ保持期間の設定
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: Match.anyValue(),
    });
  });

  test('BackupRetentionPeriod が 7 日間であること', () => {
    // 【検証項目】: デフォルトバックアップ保持期間
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 7,
    });
  });
});
```

---

## 3. テストコード完全スケルトン

以下は `infra/test/database-stack.test.ts` の完全なテストコードスケルトンです。

```typescript
/**
 * Database Stack テスト
 *
 * TASK-0010: Database Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-DS-01: スナップショットテスト
 * - TC-DS-02: Aurora クラスターリソース存在確認
 * - TC-DS-03: Secrets Manager シークレット存在確認
 * - TC-DS-04: KMS キー存在確認
 * - TC-DS-05: VPC 依存関係確認
 * - TC-DS-06: Security Stack 依存関係確認
 * - TC-DS-07: auroraCluster プロパティ公開確認
 * - TC-DS-08: dbSecret プロパティ公開確認
 * - TC-DS-09: dbEndpoint プロパティ公開確認
 * - TC-DS-10: dbPort プロパティ公開確認
 * - TC-DS-11: DbEndpoint CfnOutput 確認
 * - TC-DS-12: DbPort CfnOutput 確認
 * - TC-DS-13: DbSecretArn CfnOutput 確認
 * - TC-DS-14: AuroraClusterArn CfnOutput 確認
 * - TC-DS-15: Private Isolated Subnet 配置確認
 * - TC-DS-16: ストレージ暗号化確認
 * - TC-DS-17: 自動バックアップ確認
 *
 * 🔵 信頼性: 要件定義書 REQ-022〜027、タスク定義書 TASK-0010 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/stack/database-stack';
import { devConfig, prodConfig } from '../parameter';

// ============================================================================
// 【テスト用定数】
// ============================================================================

/**
 * 【テスト用 AWS アカウント ID】
 * 🔵 信頼性: テスト用の仮想アカウント
 */
const TEST_ACCOUNT_ID = '123456789012';

/**
 * 【テスト用リージョン】
 * 🔵 信頼性: REQ-403 より（ap-northeast-1）
 */
const TEST_REGION = 'ap-northeast-1';

// ============================================================================
// 【テストヘルパー関数】
// ============================================================================

/**
 * 【VPC 作成ヘルパー】: テスト用の VPC を作成
 *
 * 【設計方針】: Database Stack が必要とするサブネット構成を提供
 * 【サブネット構成】: Public、Private App、Private DB（Isolated）の 3 層構造
 *
 * 🔵 信頼性: architecture.md VPC 設計より
 *
 * @param stack テスト用スタック
 * @returns 作成された VPC
 */
function createTestVpc(stack: cdk.Stack): ec2.IVpc {
  return new ec2.Vpc(stack, 'TestVpc', {
    maxAzs: 2,
    subnetConfiguration: [
      {
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        name: 'PrivateApp',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 23,
      },
      {
        name: 'PrivateDb',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        cidrMask: 24,
      },
    ],
  });
}

/**
 * 【Security Group 作成ヘルパー】: テスト用の Aurora Security Group を作成
 *
 * 【設計方針】: Aurora 用の Security Group をシミュレート
 * 【設定内容】: アウトバウンド無効化（データ漏洩防止）
 *
 * 🔵 信頼性: REQ-024、REQ-025 より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された Security Group
 */
function createTestSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc): ec2.ISecurityGroup {
  return new ec2.SecurityGroup(stack, 'TestAuroraSg', {
    vpc,
    description: 'Test Aurora Security Group',
    allowAllOutbound: false,
  });
}

describe('DatabaseStack', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と DatabaseStack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let vpcStack: cdk.Stack;
  let vpc: ec2.IVpc;
  let auroraSecurityGroup: ec2.ISecurityGroup;
  let stack: DatabaseStack;
  let template: Template;

  /**
   * 【テスト環境設定】: 各テストで使用する共通環境
   */
  const testEnv = {
    account: TEST_ACCOUNT_ID,
    region: TEST_REGION,
  };

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と テスト用 VPC Stack を作成
    // 【初期条件設定】: devConfig を使用して DatabaseStack を生成
    // 【前提条件確認】: VPC Stack と Security Stack の模擬リソースが正常に作成されていること
    app = new cdk.App();

    // 【前提 Stack 作成】: VPC Stack の模擬
    vpcStack = new cdk.Stack(app, 'TestVpcStack', { env: testEnv });
    vpc = createTestVpc(vpcStack);
    auroraSecurityGroup = createTestSecurityGroup(vpcStack, vpc);

    // 【実際の処理実行】: DatabaseStack を作成
    // 【処理内容】: DatabaseStack が作成するリソースを CloudFormation テンプレート形式で取得
    stack = new DatabaseStack(app, 'TestDatabaseStack', {
      vpc,
      auroraSecurityGroup,
      config: devConfig,
      env: testEnv,
    });
    template = Template.fromStack(stack);
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // TC-DS-01: スナップショットテスト
  // 🔵 信頼性: CDK ベストプラクティス、vpc-stack.test.ts パターンより
  // ============================================================================
  describe('TC-DS-01: スナップショットテスト', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: DatabaseStack の CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティス、vpc-stack.test.ts パターンより

    test('CloudFormation テンプレートのスナップショットテスト', () => {
      // 【テストデータ準備】: devConfig を使用して DatabaseStack を作成
      // 【初期条件設定】: 開発環境の標準設定でスタックを生成
      const snapshotApp = new cdk.App();
      const snapshotEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      // 【前提 Stack 作成】: VPC Stack の模擬
      const snapshotVpcStack = new cdk.Stack(snapshotApp, 'SnapshotVpcStack', { env: snapshotEnv });
      const snapshotVpc = createTestVpc(snapshotVpcStack);
      const snapshotAuroraSg = createTestSecurityGroup(snapshotVpcStack, snapshotVpc);

      // 【実際の処理実行】: DatabaseStack を作成
      const snapshotStack = new DatabaseStack(snapshotApp, 'SnapshotDatabaseStack', {
        vpc: snapshotVpc,
        auroraSecurityGroup: snapshotAuroraSg,
        config: devConfig,
        env: snapshotEnv,
      });
      const snapshotTemplate = Template.fromStack(snapshotStack);

      // 【結果検証】: スナップショットとの一致を確認
      // 【検証項目】: CloudFormation テンプレート全体
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(snapshotTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-DS-02: Aurora クラスターリソース存在確認
  // 🔵 信頼性: REQ-022、TASK-0010.md より
  // ============================================================================
  describe('TC-DS-02: Aurora クラスターリソース存在確認', () => {
    // 【テスト目的】: DatabaseStack が Aurora クラスターを正しく作成することを確認
    // 【テスト内容】: AWS::RDS::DBCluster リソースが 1 つ存在することを検証
    // 【期待される動作】: Aurora クラスターリソースが 1 つ存在する
    // 🔵 信頼性: REQ-022、TASK-0010.md より

    test('AWS::RDS::DBCluster が 1 つ作成されること', () => {
      // 【検証項目】: DBCluster リソースの数
      // 🔵 信頼性: REQ-022 より
      template.resourceCountIs('AWS::RDS::DBCluster', 1);
    });

    test('Aurora が Serverless v2 として作成されること', () => {
      // 【検証項目】: ServerlessV2ScalingConfiguration の存在
      // 🔵 信頼性: REQ-022、architecture.md より
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        ServerlessV2ScalingConfiguration: Match.objectLike({
          MinCapacity: devConfig.auroraMinCapacity,
          MaxCapacity: devConfig.auroraMaxCapacity,
        }),
      });
    });
  });

  // ============================================================================
  // TC-DS-03: Secrets Manager シークレット存在確認
  // 🔵 信頼性: SMR-001、TASK-0009.md より
  // ============================================================================
  describe('TC-DS-03: Secrets Manager シークレット存在確認', () => {
    // 【テスト目的】: DatabaseStack が Secrets Manager シークレットを作成することを確認
    // 【テスト内容】: AWS::SecretsManager::Secret リソースが存在することを検証
    // 【期待される動作】: Secrets Manager シークレットリソースが存在する
    // 🔵 信頼性: SMR-001、TASK-0009.md より

    test('AWS::SecretsManager::Secret が作成されること', () => {
      // 【検証項目】: Secret リソースの存在
      // 🔵 信頼性: SMR-001 より
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });

    test('シークレットの GenerateSecretString が設定されていること', () => {
      // 【検証項目】: パスワード自動生成設定
      // 🔵 信頼性: SMR-003 より
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        GenerateSecretString: Match.objectLike({
          SecretStringTemplate: Match.anyValue(),
          GenerateStringKey: 'password',
        }),
      });
    });
  });

  // ============================================================================
  // TC-DS-04: KMS キー存在確認
  // 🔵 信頼性: REQ-026、NFR-102 より
  // ============================================================================
  describe('TC-DS-04: KMS キー存在確認', () => {
    // 【テスト目的】: Aurora ストレージ暗号化用の KMS キーが作成されることを確認
    // 【テスト内容】: AWS::KMS::Key リソースが存在することを検証
    // 【期待される動作】: KMS キーリソースが存在する
    // 🔵 信頼性: REQ-026、NFR-102 より

    test('AWS::KMS::Key が作成されること', () => {
      // 【検証項目】: KMS キーリソースの存在
      // 🔵 信頼性: REQ-026 より
      template.resourceCountIs('AWS::KMS::Key', 1);
    });

    test('KMS キーにキーローテーションが有効であること', () => {
      // 【検証項目】: キーローテーション設定
      // 🔵 信頼性: NFR-102 より
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });
  });

  // ============================================================================
  // TC-DS-05: VPC 依存関係確認
  // 🔵 信頼性: architecture.md Stack 依存関係、TASK-0010.md より
  // ============================================================================
  describe('TC-DS-05: VPC 依存関係確認', () => {
    // 【テスト目的】: DatabaseStack が VPC Stack から VPC を正しく受け取ることを確認
    // 【テスト内容】: Props で受け取った VPC が Aurora に設定されていることを検証
    // 【期待される動作】: Aurora の DBSubnetGroup が VPC のサブネットを参照
    // 🔵 信頼性: architecture.md Stack 依存関係、TASK-0010.md より

    test('DBSubnetGroup が作成されること', () => {
      // 【検証項目】: DBSubnetGroup リソースの存在
      // 🔵 信頼性: REQ-023 より
      template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
    });

    test('DBSubnetGroup に SubnetIds が設定されていること', () => {
      // 【検証項目】: SubnetIds の設定確認
      // 🔵 信頼性: REQ-023 より
      const subnetGroups = template.findResources('AWS::RDS::DBSubnetGroup');
      const subnetGroupValues = Object.values(subnetGroups);
      expect(subnetGroupValues.length).toBeGreaterThan(0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subnetIds = (subnetGroupValues[0] as any).Properties.SubnetIds;
      expect(subnetIds).toBeDefined();
      expect(Array.isArray(subnetIds)).toBe(true);
      expect(subnetIds.length).toBeGreaterThanOrEqual(2); // Multi-AZ
    });
  });

  // ============================================================================
  // TC-DS-06: Security Stack 依存関係確認
  // 🔵 信頼性: architecture.md Stack 依存関係、TASK-0010.md より
  // ============================================================================
  describe('TC-DS-06: Security Stack 依存関係確認', () => {
    // 【テスト目的】: DatabaseStack が Security Stack から Aurora Security Group を正しく受け取ることを確認
    // 【テスト内容】: Props で受け取った Security Group が Aurora に設定されていることを検証
    // 【期待される動作】: Aurora クラスターの VpcSecurityGroupIds に設定
    // 🔵 信頼性: architecture.md Stack 依存関係、TASK-0010.md より

    test('Aurora クラスターに VpcSecurityGroupIds が設定されていること', () => {
      // 【検証項目】: VpcSecurityGroupIds の存在
      // 🔵 信頼性: REQ-024、REQ-025 より
      const clusters = template.findResources('AWS::RDS::DBCluster');
      const clusterValues = Object.values(clusters);
      expect(clusterValues.length).toBe(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vpcSecurityGroupIds = (clusterValues[0] as any).Properties.VpcSecurityGroupIds;
      expect(vpcSecurityGroupIds).toBeDefined();
      expect(Array.isArray(vpcSecurityGroupIds)).toBe(true);
      expect(vpcSecurityGroupIds.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TC-DS-07: auroraCluster プロパティ公開確認
  // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより
  // ============================================================================
  describe('TC-DS-07: auroraCluster プロパティ公開確認', () => {
    // 【テスト目的】: DatabaseStack.auroraCluster が定義されていることを確認
    // 【テスト内容】: auroraCluster プロパティがアクセス可能で、IDatabaseCluster 型であることを検証
    // 【期待される動作】: auroraCluster プロパティが定義され、clusterArn が取得可能
    // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより

    test('auroraCluster プロパティが定義されていること', () => {
      // 【検証項目】: auroraCluster プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.auroraCluster).toBeDefined();
    });

    test('auroraCluster の clusterArn が取得可能であること', () => {
      // 【検証項目】: clusterArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.auroraCluster.clusterArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-08: dbSecret プロパティ公開確認
  // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより
  // ============================================================================
  describe('TC-DS-08: dbSecret プロパティ公開確認', () => {
    // 【テスト目的】: DatabaseStack.dbSecret が定義されていることを確認
    // 【テスト内容】: dbSecret プロパティがアクセス可能で、ISecret 型であることを検証
    // 【期待される動作】: dbSecret プロパティが定義され、secretArn が取得可能
    // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより

    test('dbSecret プロパティが定義されていること', () => {
      // 【検証項目】: dbSecret プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.dbSecret).toBeDefined();
    });

    test('dbSecret の secretArn が取得可能であること', () => {
      // 【検証項目】: secretArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.dbSecret.secretArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-DS-09: dbEndpoint プロパティ公開確認
  // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより
  // ============================================================================
  describe('TC-DS-09: dbEndpoint プロパティ公開確認', () => {
    // 【テスト目的】: DatabaseStack.dbEndpoint が定義されていることを確認
    // 【テスト内容】: dbEndpoint プロパティがアクセス可能で、string 型であることを検証
    // 【期待される動作】: dbEndpoint プロパティが string 型で定義されている
    // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより

    test('dbEndpoint プロパティが定義されていること', () => {
      // 【検証項目】: dbEndpoint プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.dbEndpoint).toBeDefined();
    });

    test('dbEndpoint が string 型であること', () => {
      // 【検証項目】: 型の確認
      // 🔵 信頼性: TypeScript 型定義より
      expect(typeof stack.dbEndpoint).toBe('string');
    });
  });

  // ============================================================================
  // TC-DS-10: dbPort プロパティ公開確認
  // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより
  // ============================================================================
  describe('TC-DS-10: dbPort プロパティ公開確認', () => {
    // 【テスト目的】: DatabaseStack.dbPort が定義されていることを確認
    // 【テスト内容】: dbPort プロパティがアクセス可能で、number 型であることを検証
    // 【期待される動作】: dbPort プロパティが number 型で定義されている
    // 🔵 信頼性: TASK-0010.md、note.md 公開プロパティより

    test('dbPort プロパティが定義されていること', () => {
      // 【検証項目】: dbPort プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.dbPort).toBeDefined();
    });

    test('dbPort が number 型であること', () => {
      // 【検証項目】: 型の確認
      // 🔵 信頼性: TypeScript 型定義より
      expect(typeof stack.dbPort).toBe('number');
    });

    test('dbPort が 3306 であること', () => {
      // 【検証項目】: MySQL デフォルトポート
      // 🔵 信頼性: Aurora MySQL 仕様より
      expect(stack.dbPort).toBe(3306);
    });
  });

  // ============================================================================
  // TC-DS-11: DbEndpoint CfnOutput 確認
  // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより
  // ============================================================================
  describe('TC-DS-11: DbEndpoint CfnOutput 確認', () => {
    // 【テスト目的】: Database Stack が DbEndpoint を CfnOutput でエクスポートすることを確認
    // 【テスト内容】: DbEndpoint の CfnOutput が存在し、exportName が設定されていることを検証
    // 【期待される動作】: DbEndpoint が `${envName}-DbEndpoint` でエクスポート
    // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより

    test('DbEndpoint がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: CDK ベストプラクティスより
      template.hasOutput('DbEndpoint', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-DbEndpoint`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-12: DbPort CfnOutput 確認
  // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより
  // ============================================================================
  describe('TC-DS-12: DbPort CfnOutput 確認', () => {
    // 【テスト目的】: Database Stack が DbPort を CfnOutput でエクスポートすることを確認
    // 【テスト内容】: DbPort の CfnOutput が存在し、exportName が設定されていることを検証
    // 【期待される動作】: DbPort が `${envName}-DbPort` でエクスポート
    // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより

    test('DbPort がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: CDK ベストプラクティスより
      template.hasOutput('DbPort', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-DbPort`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-13: DbSecretArn CfnOutput 確認
  // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより
  // ============================================================================
  describe('TC-DS-13: DbSecretArn CfnOutput 確認', () => {
    // 【テスト目的】: Database Stack が DbSecretArn を CfnOutput でエクスポートすることを確認
    // 【テスト内容】: DbSecretArn の CfnOutput が存在し、exportName が設定されていることを検証
    // 【期待される動作】: DbSecretArn が `${envName}-DbSecretArn` でエクスポート
    // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより

    test('DbSecretArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: CDK ベストプラクティスより
      template.hasOutput('DbSecretArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-DbSecretArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-14: AuroraClusterArn CfnOutput 確認
  // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより
  // ============================================================================
  describe('TC-DS-14: AuroraClusterArn CfnOutput 確認', () => {
    // 【テスト目的】: Database Stack が AuroraClusterArn を CfnOutput でエクスポートすることを確認
    // 【テスト内容】: AuroraClusterArn の CfnOutput が存在し、exportName が設定されていることを検証
    // 【期待される動作】: AuroraClusterArn が `${envName}-AuroraClusterArn` でエクスポート
    // 🔵 信頼性: TASK-0010.md、CDK ベストプラクティスより

    test('AuroraClusterArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: CDK ベストプラクティスより
      template.hasOutput('AuroraClusterArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-AuroraClusterArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-DS-15: Private Isolated Subnet 配置確認
  // 🔵 信頼性: REQ-023、architecture.md より
  // ============================================================================
  describe('TC-DS-15: Private Isolated Subnet 配置確認', () => {
    // 【テスト目的】: Aurora クラスターが Private Isolated Subnet に配置されることを確認
    // 【テスト内容】: DBSubnetGroup が適切なサブネットを参照していることを検証
    // 【期待される動作】: Aurora が Private Isolated Subnet に配置
    // 🔵 信頼性: REQ-023、architecture.md より

    test('AWS::RDS::DBSubnetGroup が作成されること', () => {
      // 【検証項目】: DBSubnetGroup リソースの存在
      // 🔵 信頼性: REQ-023 より
      template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
    });

    test('DBInstance が PubliclyAccessible: false であること', () => {
      // 【検証項目】: パブリックアクセス無効
      // 🔵 信頼性: REQ-024 より
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        PubliclyAccessible: false,
      });
    });
  });

  // ============================================================================
  // TC-DS-16: ストレージ暗号化確認
  // 🔵 信頼性: REQ-026、NFR-102 より
  // ============================================================================
  describe('TC-DS-16: ストレージ暗号化確認', () => {
    // 【テスト目的】: Aurora クラスターのストレージ暗号化が有効であることを確認
    // 【テスト内容】: StorageEncrypted が true に設定されていることを検証
    // 【期待される動作】: StorageEncrypted: true が設定
    // 🔵 信頼性: REQ-026、NFR-102 より

    test('StorageEncrypted が true であること', () => {
      // 【検証項目】: ストレージ暗号化の有効化
      // 🔵 信頼性: REQ-026 より
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        StorageEncrypted: true,
      });
    });

    test('KmsKeyId が設定されていること', () => {
      // 【検証項目】: 暗号化キーの関連付け
      // 🔵 信頼性: NFR-102 より
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        KmsKeyId: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-DS-17: 自動バックアップ確認
  // 🔵 信頼性: REQ-027 より
  // ============================================================================
  describe('TC-DS-17: 自動バックアップ確認', () => {
    // 【テスト目的】: Aurora クラスターの自動バックアップが有効であることを確認
    // 【テスト内容】: BackupRetentionPeriod が設定されていることを検証
    // 【期待される動作】: BackupRetentionPeriod >= 1 が設定
    // 🔵 信頼性: REQ-027 より

    test('BackupRetentionPeriod が設定されていること', () => {
      // 【検証項目】: バックアップ保持期間の設定
      // 🔵 信頼性: REQ-027 より
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        BackupRetentionPeriod: Match.anyValue(),
      });
    });

    test('BackupRetentionPeriod が 7 日間であること', () => {
      // 【検証項目】: デフォルトバックアップ保持期間
      // 🟡 信頼性: architecture.md（7日）より妥当な推測
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        BackupRetentionPeriod: 7,
      });
    });
  });

  // ============================================================================
  // 追加テスト: 環境別設定での動作確認
  // 🔵 信頼性: parameter.ts、vpc-stack.test.ts パターンより
  // ============================================================================
  describe('追加テスト: 環境別設定での動作確認', () => {
    // 【テスト目的】: devConfig と prodConfig の両方で DatabaseStack が正常に作成されることを確認
    // 【テスト内容】: 両環境で同じリソース構成が作成されることを検証
    // 【期待される動作】: 両環境でリソースが正常に作成
    // 🔵 信頼性: parameter.ts、vpc-stack.test.ts パターンより

    test('devConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: devConfig を使用
      const devApp = new cdk.App();
      const devEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      const devVpcStack = new cdk.Stack(devApp, 'DevVpcStack', { env: devEnv });
      const devVpc = createTestVpc(devVpcStack);
      const devAuroraSg = createTestSecurityGroup(devVpcStack, devVpc);

      const devStack = new DatabaseStack(devApp, 'DevDatabaseStack', {
        vpc: devVpc,
        auroraSecurityGroup: devAuroraSg,
        config: devConfig,
        env: devEnv,
      });
      const devTemplate = Template.fromStack(devStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      devTemplate.resourceCountIs('AWS::RDS::DBCluster', 1);
      devTemplate.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });

    test('prodConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: prodConfig を使用
      const prodApp = new cdk.App();
      const prodEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      const prodVpcStack = new cdk.Stack(prodApp, 'ProdVpcStack', { env: prodEnv });
      const prodVpc = createTestVpc(prodVpcStack);
      const prodAuroraSg = createTestSecurityGroup(prodVpcStack, prodVpc);

      const prodStack = new DatabaseStack(prodApp, 'ProdDatabaseStack', {
        vpc: prodVpc,
        auroraSecurityGroup: prodAuroraSg,
        config: prodConfig,
        env: prodEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      prodTemplate.resourceCountIs('AWS::RDS::DBCluster', 1);
      prodTemplate.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });
  });
});
```

---

## 4. 信頼性レベルサマリー

### 4.1 項目別集計

| カテゴリ | 項目数 | 🔵 青信号 | 🟡 黄信号 | 🔴 赤信号 |
|---------|--------|-----------|-----------|-----------|
| スナップショットテスト | 1 | 1 | 0 | 0 |
| リソース存在確認テスト | 3 | 3 | 0 | 0 |
| 依存関係テスト | 2 | 2 | 0 | 0 |
| プロパティ公開テスト | 4 | 4 | 0 | 0 |
| CfnOutput テスト | 4 | 4 | 0 | 0 |
| セキュリティ設定テスト | 3 | 3 | 0 | 0 |
| **合計** | **17** | **17 (100%)** | **0 (0%)** | **0 (0%)** |

### 4.2 品質評価

**品質評価**: 高品質 - 全てのテストケースが要件定義書・設計文書・完了済みタスクにより確認済み

Database Stack テストは TASK-0008 (Aurora Construct)、TASK-0009 (Secrets Manager 統合) で実装・テスト済みの Construct を統合するタスクであり、既存の検証済みコンポーネントを使用するため、全てのテストケースが青信号となっています。

---

## 5. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0010.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0010/note.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0010/requirements.md` |
| 要件定義書（仕様） | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| 受け入れ基準 | `docs/spec/aws-cdk-serverless-architecture/acceptance-criteria.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| データフロー設計 | `docs/design/aws-cdk-serverless-architecture/dataflow.md` |
| 参考テスト（VPC Stack） | `infra/test/vpc-stack.test.ts` |
| 参考テスト（Security Stack） | `infra/test/security-stack.test.ts` |
| 参考テスト（Aurora Construct） | `infra/test/construct/database/aurora-construct.test.ts` |
| パラメータ設定 | `infra/parameter.ts` |
