import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from "@aws-cdk/aws-ec2";
import { LabeledStatement } from "@babel/types";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import { WaitTime } from "@aws-cdk/aws-stepfunctions";

interface subnetCongfig {
  subnetId: string;
  availabilityZone: string;
  routeTableId: string;
}

interface StageContext {
  bucketName: string;
  vpcName: string;
  privateSubnets: subnetCongfig[];
  securityGroupID: string;
}

export class ExampleStepFunctionsStack extends cdk.Stack {
  readonly env: string;
  readonly revision: string;
  readonly context: StageContext;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // set enviroment
    this.node.setContext;
    this.env = this.node.tryGetContext("env") || "dev";
    this.revision = this.node.tryGetContext("revision") || "";
    this.context = this.node.tryGetContext(this.env) || {};

    // describe vpc and private subnet and security group
    const { vpc, selectSubnets, securityGroup } = this.getNetworkResources();

    // create lambda to selected vpc and private subnet
    let lambdas: lambda.Function[] = [];
    let lambdaTasks: sfn.Task[] = [];
    ["Lambda1", "Lambda2", "Lambda3"].map(name => {
      const lambdaFunc: lambda.Function = new lambda.Function(this, name, {
        functionName: name,
        code: lambda.Code.asset("src"),
        handler: `${name.toLowerCase()}.handler`,
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.NODEJS_10_X,
        environment: {
          ENV: this.env,
          REVISION: this.revision
        },
        vpc: vpc,
        vpcSubnets: selectSubnets,
        securityGroup: securityGroup
      });
      lambdaTasks.push(
        new sfn.Task(this, `Task-${name}`, {
          task: new tasks.InvokeFunction(lambdaFunc)
        })
      );
    });

    const definition = lambdaTasks[0].next(lambdaTasks[1]).next(lambdaTasks[2]);
    new sfn.StateMachine(this, "ExampleStepFunctions-StateMachine", {
      stateMachineName: "ExampleStepFunctions-StateMachine",
      definition: definition,
      timeout: cdk.Duration.minutes(5)
    });
  }

  getNetworkResources(): {
    vpc: ec2.IVpc;
    selectSubnets: ec2.SelectedSubnets;
    securityGroup: ec2.ISecurityGroup;
  } {
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      vpcId: this.context.vpcName
    });

    const selectSubnets: ec2.SelectedSubnets = vpc.selectSubnets({
      subnets: this.context.privateSubnets.map(privateSubnet => {
        return ec2.Subnet.fromSubnetAttributes(this, privateSubnet.subnetId, {
          subnetId: privateSubnet.subnetId,
          availabilityZone: privateSubnet.availabilityZone,
          routeTableId: privateSubnet.routeTableId
        });
      })
    });

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "SecurityGroup",
      this.context.securityGroupID
    );
    return { vpc, selectSubnets, securityGroup };
  }
}
