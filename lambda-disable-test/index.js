const { LambdaClient, UpdateEventSourceMappingCommand } = require("@aws-sdk/client-lambda");
const { EventBridgeClient,DescribeRuleCommand, PutRuleCommand} = require("@aws-sdk/client-eventbridge");
const lambdaClient = new LambdaClient();
const eventBridgeClient = new EventBridgeClient();
exports.handler = async (event) => {
    console.log(event);
    const eventSourceMappingId = process.env.EVENT_SOURCE_ID; // SQS와 Lambda를 연결하는 Event Source Mapping ID
    const ruleName = process.env.RULE_NAME; // EventBridge Rule 이름

    const describeRuleParams = {
        Name: ruleName
    };
    try {
        // Lambda 트리거 비활성화

        const describeRuleCommand = new DescribeRuleCommand(describeRuleParams);
        const ruleDescription = await eventBridgeClient.send(describeRuleCommand);
        const updateParams = {
            UUID: eventSourceMappingId,
            Enabled: false
        };
        const updateCommand = new UpdateEventSourceMappingCommand(updateParams);
        await lambdaClient.send(updateCommand);        

        const updateRuleParams = {
            Name: ruleName,
            State: 'ENABLED',
            EventPattern: ruleDescription.EventPattern, // 기존 이벤트 패턴 사용
            ScheduleExpression: ruleDescription.ScheduleExpression // 기존 스케줄 표현식 사용
        };
        const updateRuleCommand = new PutRuleCommand(updateRuleParams);
        await eventBridgeClient.send(updateRuleCommand);

        return {
            statusCode: 200,
            body: JSON.stringify('Lambda trigger (event source mapping) disabled successfully'),
        };
    } catch (error) {
        console.error('Error disabling the Lambda trigger:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error disabling the Lambda trigger'),
        };
    }
};