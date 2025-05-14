import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as ssm from 'aws-cdk-lib/aws-ssm';

const app = new cdk.App();

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new pipelines.CodePipeline(this, 'InvestmentCalculator', {
            synth: new pipelines.ShellStep('Synth', {
                input: pipelines.CodePipelineSource.connection('CookBrad/investment-calculator-ts', 'main', {
                    connectionArn: `arn:aws:codestar-connections:us-east-2:850502434229:connection/${ssm.StringParameter.valueForStringParameter(this, '/connectionArn')}`,
                }),
                commands: ['npm ci', 'npm run build', 'npx cdk synth'],
            }),
        });
    }
}

new PipelineStack(app, 'PipelineStack');

app.synth();