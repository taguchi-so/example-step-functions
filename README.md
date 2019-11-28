# example-step-functions

AWS Cloud Development Kit Example for StepFunctions

## Getting Started

- step functions のサンプルを deploy する

### Prerequisites

node

```shell
nodenv install 12.12.0
nodenv local 12.12.0
npm install -g npm
```

cdk

```shell
npm install -g aws-cdk
cdk --version
```

### Installing

set up repository

```shell
git clone https://github.com/taguchi-so/example-step-functions.git
cd example-step-functions
make setup
make help
```

## Build

```shell
make build
```

## Deployment(CDK)

deploy api-gateway and lambda and a record

- set environments

```shell
export CDK_DEFAULT_ACCOUNT="*****" \
export CDK_DEFAULT_REGION="ap-northeast-1" \
```

- edit cdk.json

```json
{
  "app": "npx ts-node bin/example-step-functions.ts",
  "context": {
    "dev": {
      "description": "Development Example-CDK",
      "vpcName": "vpc-ffffffffffffffff",
      "privateSubnets": [
        {
          "subnetId": "subnet-fffffffffffffffff",
          "availabilityZone": "ap-northeast-1a",
          "routeTableId": "rtb-fffffffffffffffff"
        },
        {
          "subnetId": "subnet-fffffffffffffffff",
          "availabilityZone": "ap-northeast-1c",
          "routeTableId": "rtb-fffffffffffffffff"
        }
      ],
      "securityGroupID": "sg-fffffffffffffffff"
    }
  }
}
```

deploy lambda and state machine and cloudwatchevent

```shell
make deploy
aws lambda list-functions | jq '.Functions[].FunctionName'
aws stepfunctions list-state-machines | jq '.stateMachines[].StateMachineName'
```

test run state machine
```shell
make run
```

destroy lambda and state machine and cloudwatchevent

```shell
make destroy
```
