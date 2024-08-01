const { LambdaClient, UpdateEventSourceMappingCommand } = require("@aws-sdk/client-lambda");
const { EventBridgeClient, DescribeRuleCommand, PutRuleCommand } = require("@aws-sdk/client-eventbridge");
const lambdaClient = new LambdaClient();
const eventBridgeClient = new EventBridgeClient();
exports.handler = async (event) => {
    const { action, eventSourceMappingId, ruleName } = event;
    console.log(event);
    const describeRuleParams = {
        Name: ruleName
    };

    if (action === 'ENABLE_TRIGGER' && eventSourceMappingId) {
        try {
            // Lambda 트리거 활성화
            const describeRuleCommand = new DescribeRuleCommand(describeRuleParams);
            const ruleDescription = await eventBridgeClient.send(describeRuleCommand);
            const updateParams = {
                UUID: eventSourceMappingId,
                Enabled: true
            };
            const updateCommand = new UpdateEventSourceMappingCommand(updateParams);
            await lambdaClient.send(updateCommand);


            // EventBridge 규칙 비활성화
            const updateRuleParams = {
                Name: ruleName,
                State: 'DISABLED',
                EventPattern: ruleDescription.EventPattern, // 기존 이벤트 패턴 사용
                ScheduleExpression: ruleDescription.ScheduleExpression // 기존 스케줄 표현식 사용
            };
            const updateRuleCommand = new PutRuleCommand(updateRuleParams);
            await eventBridgeClient.send(updateRuleCommand);
            

            return {
                statusCode: 200,
                body: JSON.stringify('Lambda trigger enabled and EventBridge rule deleted successfully'),
            };
        } catch (error) {
            console.error('Error enabling the Lambda trigger or deleting the rule:', error);
            return {
                statusCode: 500,
                body: JSON.stringify('Error enabling the Lambda trigger or deleting the rule'),
            };
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify('Invalid action or eventSourceMappingId'),
    };
};