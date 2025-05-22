import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

const app = new cdk.App();

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, {
            ...props,
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: 'us-east-2',
            },
        });

        // Create an IAM role for the pipeline
        const pipelineRole = new iam.Role(this, 'PipelineRole', {
            assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
        });
        const account = process.env.CDK_DEFAULT_ACCOUNT;
        const region = process.env.CDK_DEFAULT_REGION;
        const regionAndAccount = `${region}:${account}`
        // Add CodeStar Connections permission to the role
        pipelineRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['codestar-connections:UseConnection'],
            resources: [`arn:aws:codestar-connections:${regionAndAccount}:connection/*`],
        }));

        // Add other necessary permissions for CodePipeline (e.g., S3, CodeBuild)
        pipelineRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
                'codebuild:StartBuild',
                'codebuild:BatchGetBuilds',
                'iam:PassRole',
            ],
            resources: ['*'], // Adjust to specific resources for better security
        }));
        const repositoryName = 'InvestmentCalculator';
        const pipeline = new pipelines.CodePipeline(this, 'repositoryName', {
            role: pipelineRole, // Pass the role to the pipeline
            synth: new pipelines.ShellStep('Synth', {
                input: pipelines.CodePipelineSource.connection('CookBrad/investment-calculator-ts', 'main', {
                    triggerOnPush: true,
                    connectionArn: `arn:aws:codeconnections:${process.env.AWS_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:connection/${ssm.StringParameter.valueFromLookup(this, '/connectionArn')}`,
                }),
                commands: ['npm ci', 'npm run build', 'npx cdk synth'],
            }),
        });
        const pipelineStage = new CdkPipelinesStage(this, repositoryName, {
            ...props,
            name: ``,
            env: {
                account,
                region: region
            }
        });

        // Deploy Stage
        const deploymentStage = pipeline.addStage(pipelineStage);

    }
}

export class CdkPipelinesStage extends cdk.Stage {
    constructor(scope: any, id: string, props?: any) {
        super(scope, id, props);
    }
}

new PipelineStack(app, 'PipelineStack');

app.synth();