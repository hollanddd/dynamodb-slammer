# DynamoDB Write Demand 

This projects demonstrates the use of SQS to and handle sudden write spikes to DynamoDB.

## AWS CDK Stack 

This project contains an AWS CDK stack that deploy an AWS SQS queue, two DynamoDB tables and three Lambda functions. 

The `dynamodb-batch` and `queue-producer` functions are triggered by a CloudWatch rule.

The resulting write capacity units for each table are displayed in a CloudWatch dashboard.

The producer functions (`dynamodb-batch` and `queue-producer`) generate data from the same source csv. The data is faked and was generated at https://www.mockaroo.com/.

The producer functions enrich each item with a timestamp and a unique identifier.

## Sread Write Demand

Modify the message's delay seconds in `./handlers/queue-producer/index.ts` to adjust the write demand.

## Cost

This project incurs cost. To remove it run `cdk destroy`

