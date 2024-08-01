const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

// AWS 지역 설정
const region = process.env.REGION;
const queueURL = process.env.QUEUE_URL;

// SQS 클라이언트 생성
const sqsClient = new SQSClient({ region });

// 메시지를 빼오는 함수
const receiveMessage = async () => {
  const params = {
    QueueUrl: queueURL,
    MaxNumberOfMessages: 1, // 한 번에 가져올 메시지 수
    VisibilityTimeout: 20, // 메시지 처리 시간(초)
    WaitTimeSeconds: 0 // 롱 폴링 대기 시간(초)
  };

  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params));
    if (data.Messages) {
      const message = data.Messages[0];
      console.log('Received message:', message);
      // 메시지를 처리하는 로직 추가
      await deleteMessage(message.ReceiptHandle);
    } else {
      console.log('No messages to process');
    }
  } catch (error) {
    console.error('Error receiving message:', error);
  }
};

// 메시지를 삭제하는 함수
const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: queueURL,
    ReceiptHandle: receiptHandle
  };

  try {
    const data = await sqsClient.send(new DeleteMessageCommand(params));
    console.log('Message deleted:', data);
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

// 메시지 수신 및 삭제 실행
exports.handler = async (event) => {
  await receiveMessage();
};