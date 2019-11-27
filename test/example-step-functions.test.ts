import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import ExampleStepFunctions = require('../lib/example-step-functions-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ExampleStepFunctions.ExampleStepFunctionsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});