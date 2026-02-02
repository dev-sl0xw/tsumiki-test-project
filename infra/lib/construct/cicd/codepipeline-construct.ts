/**
 * CodePipeline Construct 実装
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: Source → Build → Deploy のパイプラインを構成
 * 【実装方針】: CodeCommit → CodeBuild → ECS の自動デプロイフロー
 * 【テスト対応】: TC-CICD-016〜028, 034 の全16テストケースに対応
 *
 * 構成内容:
 * - Source ステージ (CodeCommit) (REQ-040)
 * - Build ステージ (CodeBuild) (REQ-041)
 * - Deploy ステージ (ECS) (REQ-041)
 * - パイプライン通知 (SNS) (REQ-039)
 *
 * 🟡 信頼性レベル: 要件定義書 REQ-039〜041 に基づく実装（詳細設計は推測）
 *
 * @module cicd/codepipeline-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: CodePipeline 構成のデフォルト値
// ============================================================================

/**
 * デフォルトブランチ名
 *
 * CodeCommit の監視対象となるデフォルトブランチ。
 */
const DEFAULT_BRANCH_NAME = 'main';

/**
 * ECS デプロイのタイムアウト時間（分）
 *
 * デプロイが完了するまでの最大待機時間。
 */
const DEPLOYMENT_TIMEOUT_MINUTES = 60;

/**
 * パイプライン通知イベント
 *
 * SNS 通知の対象となるパイプライン実行イベント。
 */
const PIPELINE_NOTIFICATION_EVENTS = [
  'codepipeline-pipeline-pipeline-execution-started',
  'codepipeline-pipeline-pipeline-execution-succeeded',
  'codepipeline-pipeline-pipeline-execution-failed',
] as const;

/**
 * パイプラインステージ名
 *
 * 各ステージの名前を定数として定義。
 */
const STAGE_NAMES = {
  SOURCE: 'Source',
  BUILD: 'Build',
  DEPLOY: 'Deploy',
} as const;

/**
 * アクション名
 *
 * 各アクションの名前を定数として定義。
 */
const ACTION_NAMES = {
  SOURCE: 'Source',
  BUILD: 'Build',
  DEPLOY: 'Deploy',
} as const;

/**
 * アーティファクト名
 *
 * パイプライン内で使用されるアーティファクトの名前。
 */
const ARTIFACT_NAMES = {
  SOURCE_OUTPUT: 'SourceOutput',
  BUILD_OUTPUT: 'BuildOutput',
} as const;

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * CodePipeline Construct の Props インターフェース
 *
 * パイプラインの完全な設定をサポートするインターフェース。
 *
 * @interface CodePipelineConstructProps
 */
export interface CodePipelineConstructProps {
  /**
   * パイプラインの名前
   *
   * AWS アカウント内で一意である必要があります。
   *
   * @example 'dev-app-pipeline'
   */
  readonly pipelineName: string;

  /**
   * CodeCommit リポジトリ
   *
   * Source ステージのソースコード取得元。
   */
  readonly repository: codecommit.IRepository;

  /**
   * ブランチ名（オプション）
   *
   * 監視対象の Git ブランチ名。
   *
   * @default 'main'
   */
  readonly branchName?: string;

  /**
   * CodeBuild プロジェクト
   *
   * Build ステージで実行するビルドプロジェクト。
   */
  readonly buildProject: codebuild.IProject;

  /**
   * ECS Service
   *
   * Deploy ステージのデプロイ先 ECS サービス。
   */
  readonly ecsService: ecs.IBaseService;

  /**
   * ECS Cluster
   *
   * Deploy ステージのデプロイ先 ECS クラスター。
   */
  readonly ecsCluster: ecs.ICluster;

  /**
   * SNS Topic（オプション）
   *
   * パイプライン実行イベントの通知先 SNS トピック。
   * 指定すると、パイプラインの開始・成功・失敗が通知されます。
   */
  readonly notificationTopic?: sns.ITopic;
}

/**
 * CodePipeline Construct
 *
 * Source → Build → Deploy のパイプラインを構成する Construct です。
 * CodeCommit → CodeBuild → ECS の自動デプロイフローを実現します。
 *
 * @remarks
 * アーキテクチャ位置づけ:
 * ```
 * Ops Stack
 *   ↓
 * CodeCommit → CodeBuild → CodePipeline → ECS Deploy
 *                               ↓
 *                          SNS → Chatbot → Slack
 * ```
 *
 * @example
 * ```typescript
 * const pipeline = new CodePipelineConstruct(this, 'Pipeline', {
 *   pipelineName: 'dev-app-pipeline',
 *   repository: codeCommit.repository,
 *   buildProject: codeBuild.project,
 *   ecsService: ecsService.service,
 *   ecsCluster: cluster,
 *   notificationTopic: snsTopic,
 * });
 * ```
 */
export class CodePipelineConstruct extends Construct {
  /**
   * 作成された CodePipeline インスタンス
   *
   * パイプライン管理で参照されます。
   */
  public readonly pipeline: codepipeline.IPipeline;

  /**
   * パイプラインの ARN
   *
   * IAM ポリシーやリソース参照で使用されます。
   */
  public readonly pipelineArn: string;

  /**
   * アーティファクト保存用の S3 バケット
   *
   * パイプラインステージ間でデータを受け渡すために使用されます。
   */
  public readonly artifactBucket: s3.IBucket;

  /**
   * CodePipelineConstruct を作成します
   *
   * @param scope - 親となる Construct
   * @param id - この Construct の識別子
   * @param props - パイプライン設定
   */
  constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
    super(scope, id);

    // デフォルト値の適用
    const branchName = props.branchName ?? DEFAULT_BRANCH_NAME;

    // アーティファクトの定義
    const artifacts = this.createArtifacts();

    // パイプラインアクションの作成
    const actions = this.createActions(props, branchName, artifacts);

    // パイプラインの作成
    const pipeline = this.createPipeline(props, actions);

    // 通知ルールの作成
    this.createNotificationRule(props, pipeline);

    // プロパティの公開
    this.pipeline = pipeline;
    this.pipelineArn = pipeline.pipelineArn;
    this.artifactBucket = pipeline.artifactBucket;
  }

  /**
   * パイプラインアーティファクトを作成します
   *
   * @returns アーティファクトオブジェクト
   */
  private createArtifacts() {
    return {
      sourceOutput: new codepipeline.Artifact(ARTIFACT_NAMES.SOURCE_OUTPUT),
      buildOutput: new codepipeline.Artifact(ARTIFACT_NAMES.BUILD_OUTPUT),
    };
  }

  /**
   * パイプラインアクションを作成します
   *
   * @param props - パイプライン設定
   * @param branchName - ブランチ名
   * @param artifacts - アーティファクト
   * @returns パイプラインアクション
   */
  private createActions(
    props: CodePipelineConstructProps,
    branchName: string,
    artifacts: {
      sourceOutput: codepipeline.Artifact;
      buildOutput: codepipeline.Artifact;
    }
  ) {
    return {
      source: this.createSourceAction(
        props.repository,
        branchName,
        artifacts.sourceOutput
      ),
      build: this.createBuildAction(
        props.buildProject,
        artifacts.sourceOutput,
        artifacts.buildOutput
      ),
      deploy: this.createDeployAction(props.ecsService, artifacts.buildOutput),
    };
  }

  /**
   * Source アクションを作成します
   *
   * @param repository - CodeCommit リポジトリ
   * @param branchName - ブランチ名
   * @param output - 出力アーティファクト
   * @returns Source アクション
   */
  private createSourceAction(
    repository: codecommit.IRepository,
    branchName: string,
    output: codepipeline.Artifact
  ): codepipeline_actions.CodeCommitSourceAction {
    return new codepipeline_actions.CodeCommitSourceAction({
      actionName: ACTION_NAMES.SOURCE,
      repository,
      branch: branchName,
      output,
    });
  }

  /**
   * Build アクションを作成します
   *
   * @param buildProject - CodeBuild プロジェクト
   * @param input - 入力アーティファクト
   * @param output - 出力アーティファクト
   * @returns Build アクション
   */
  private createBuildAction(
    buildProject: codebuild.IProject,
    input: codepipeline.Artifact,
    output: codepipeline.Artifact
  ): codepipeline_actions.CodeBuildAction {
    return new codepipeline_actions.CodeBuildAction({
      actionName: ACTION_NAMES.BUILD,
      project: buildProject,
      input,
      outputs: [output],
    });
  }

  /**
   * Deploy アクションを作成します
   *
   * @param ecsService - ECS サービス
   * @param input - 入力アーティファクト
   * @returns Deploy アクション
   */
  private createDeployAction(
    ecsService: ecs.IBaseService,
    input: codepipeline.Artifact
  ): codepipeline_actions.EcsDeployAction {
    return new codepipeline_actions.EcsDeployAction({
      actionName: ACTION_NAMES.DEPLOY,
      service: ecsService,
      input,
      deploymentTimeout: cdk.Duration.minutes(DEPLOYMENT_TIMEOUT_MINUTES),
    });
  }

  /**
   * パイプラインを作成します
   *
   * @param props - パイプライン設定
   * @param actions - パイプラインアクション
   * @returns 作成されたパイプライン
   */
  private createPipeline(
    props: CodePipelineConstructProps,
    actions: {
      source: codepipeline_actions.CodeCommitSourceAction;
      build: codepipeline_actions.CodeBuildAction;
      deploy: codepipeline_actions.EcsDeployAction;
    }
  ): codepipeline.Pipeline {
    return new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: props.pipelineName,
      stages: [
        {
          stageName: STAGE_NAMES.SOURCE,
          actions: [actions.source],
        },
        {
          stageName: STAGE_NAMES.BUILD,
          actions: [actions.build],
        },
        {
          stageName: STAGE_NAMES.DEPLOY,
          actions: [actions.deploy],
        },
      ],
    });
  }

  /**
   * 通知ルールを作成します
   *
   * SNS Topic が指定されている場合のみ作成されます。
   *
   * @param props - パイプライン設定
   * @param pipeline - パイプライン
   */
  private createNotificationRule(
    props: CodePipelineConstructProps,
    pipeline: codepipeline.Pipeline
  ): void {
    if (!props.notificationTopic) {
      return;
    }

    new notifications.NotificationRule(this, 'NotificationRule', {
      source: pipeline,
      events: [...PIPELINE_NOTIFICATION_EVENTS],
      targets: [props.notificationTopic],
    });
  }
}
